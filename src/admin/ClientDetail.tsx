import { useState } from 'react'
import { Activity, AlertTriangle, ArrowLeft, Ban, Building2, CheckCircle2, ExternalLink, History, KeyRound, Mail, PlayCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import {
  DAY_MS, WEEK_MS, genTempPassword, genToken, planName, removeOperatorTenant, updateOperatorTenant,
  usernameFromEmail, type Access, type Entitlements, type PlanId, type Tenant, type TenantStatus,
} from '@/lib/tenant'
import { onboardingProgress, stuckReason } from '@/lib/onboarding'
import { auditSentence, auditTime, logAudit, useAudit, type AuditAction } from '@/lib/audit'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import { CopyField, StepLine } from './bits'
import { ViewAsDialog } from './ViewAs'
import { PlanPanel } from './PlanPanel'
import { OffboardDialog, type OffboardKind } from './Offboard'
import { operatorActor, useOperator } from './operator'
import { displayStatus, effectiveStatus, fmtDate, isOffboarded, workspaceUrl, useClients, type Go } from './lib'

const RESTORE_WINDOW_DAYS = 30

type Secret =
  | { kind: 'invite'; link: string; expires: string }
  | { kind: 'credentials'; username: string; password: string }

const fmtDay = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function ClientDetail({ id, go }: { id: string; go: Go }) {
  const { clients, refresh } = useClients()
  const { role, can } = useOperator()
  const toast = useToast()
  const [secret, setSecret] = useState<Secret | null>(null)
  const [viewAs, setViewAs] = useState(false)
  const [offboard, setOffboard] = useState<OffboardKind | null>(null)
  const t = clients.find((c) => c.id === id)

  if (!t) {
    return (
      <div className="mx-auto max-w-[560px] px-6 py-16 text-center">
        <p className="text-[14px] text-fg-muted">That client no longer exists.</p>
        <Button variant="default" size="md" className="mx-auto mt-4" onClick={() => go({ name: 'clients' })}><ArrowLeft className="h-4 w-4" /> Back to clients</Button>
      </div>
    )
  }

  const now = Date.now()
  const st = displayStatus(t)
  const isOperator = t.source === 'operator'
  const isManaged = t.source === 'operator' || t.source === 'self-serve'
  const activated = t.access?.state === 'activated'
  const expired = t.access?.state === 'pending' && !!t.access.expiresAt && now > t.access.expiresAt
  const prog = onboardingProgress(t)
  const stuck = stuckReason(t, now)

  const patch = (p: Partial<Tenant>) => { updateOperatorTenant(t.id, p); refresh() }
  const audit = (action: AuditAction, extra?: { changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> }; reason?: string; note?: string }) =>
    logAudit({ action, actor: operatorActor(role), target: { type: 'client', id: t.id, name: t.name }, source: 'console', ...extra })

  const resendInvite = () => {
    if (!can('handoff')) return
    const ts = Date.now()
    patch({ access: { method: 'invite', state: 'pending', invitedAt: ts, expiresAt: ts + WEEK_MS }, status: 'invited' })
    audit('client.invite.resent', { changes: { before: { state: t.access?.state, expiresAt: t.access?.expiresAt }, after: { state: 'pending', expiresAt: ts + WEEK_MS } }, note: 'Previous link invalidated.' })
    setSecret({ kind: 'invite', link: `${workspaceUrl(t.id)}&invite=${genToken()}`, expires: fmtDay(ts + WEEK_MS) })
    toast('New invite link generated — the old one no longer works.')
  }
  const regenCreds = () => {
    if (!can('handoff')) return
    const ts = Date.now()
    const username = t.access?.username || usernameFromEmail(t.admin?.email || '')
    patch({ access: { method: 'credentials', username, state: 'pending', invitedAt: ts, expiresAt: ts + WEEK_MS }, status: 'provisioning' })
    audit('client.credentials.regenerated', { changes: { before: { state: t.access?.state }, after: { state: 'pending', expiresAt: ts + WEEK_MS } }, note: 'Previous password invalidated.' })
    setSecret({ kind: 'credentials', username, password: genTempPassword() })
    toast('New temporary password generated — the old one no longer works.')
  }
  // Prototype stand-in for the client's real first sign-in. Stamps activatedAt (the clock
  // for "signed in N days ago") but does NOT flip fresh — the self-serve completion owns go-live.
  const simulateSignIn = () => {
    if (!can('handoff')) return
    patch({ access: { ...(t.access as Access), state: 'activated', activatedAt: Date.now() }, status: 'active' })
    audit('client.signin.recorded', { changes: { before: { state: t.access?.state }, after: { state: 'activated' } }, note: 'Simulated stand-in for the client’s real first sign-in.' })
    setSecret(null)
    toast(`${t.name} has signed in.`)
  }
  // The honest status to return a tenant to when it's taken off a hold: live → active,
  // signed-in → active, else the handoff state that matches its access method.
  const priorStatus: TenantStatus = t.fresh !== true || activated ? 'active' : t.access?.method === 'credentials' ? 'provisioning' : 'invited'

  const reactivate = () => {
    if (!can('suspend')) return
    patch({ status: priorStatus, suspendedAt: undefined })
    audit('client.reactivated', { changes: { before: { status: effectiveStatus(t) }, after: { status: priorStatus } } })
    toast(`${t.name} reactivated.`)
  }
  const restore = () => {
    if (!can('offboard')) return
    patch({ status: priorStatus, archivedAt: undefined, deletedAt: undefined, offboardReason: undefined })
    audit('client.restored', { changes: { before: { status: effectiveStatus(t) }, after: { status: priorStatus } } })
    toast(`${t.name} restored.`)
  }
  const changePlan = (plan: PlanId, overrides: Partial<Entitlements>) => {
    if (!can('plan')) return
    const cleanOverrides = Object.keys(overrides).length ? overrides : undefined
    patch({ plan, overrides: cleanOverrides })
    audit('client.plan.changed', { changes: { before: { plan: t.plan, overrides: t.overrides }, after: { plan, overrides: cleanOverrides } } })
    toast(`${t.name} moved to the ${planName(plan)} plan.`)
  }
  // Lifecycle actions confirmed through the offboard dialog (reason + consequence).
  const applyOffboard = (reason: string) => {
    const kind = offboard
    setOffboard(null)
    if (!kind) return
    const ts = Date.now()
    if (kind === 'suspend') {
      if (!can('suspend')) return
      patch({ status: 'suspended', suspendedAt: ts, offboardReason: reason })
      audit('client.suspended', { changes: { before: { status: effectiveStatus(t) }, after: { status: 'suspended' } }, reason })
      toast(`${t.name} suspended.`)
    } else if (kind === 'archive') {
      if (!can('offboard')) return
      patch({ status: 'archived', archivedAt: ts, offboardReason: reason })
      audit('client.archived', { changes: { before: { status: effectiveStatus(t) }, after: { status: 'archived' } }, reason })
      toast(`${t.name} archived.`)
    } else if (kind === 'delete') {
      if (!can('offboard')) return
      patch({ status: 'deleted', deletedAt: ts, offboardReason: reason })
      audit('client.deleted', { changes: { before: { status: effectiveStatus(t) }, after: { status: 'deleted' } }, reason })
      toast(`${t.name} deleted — restorable.`)
    } else if (kind === 'purge') {
      if (!can('offboard')) return
      audit('client.purged', { reason, note: 'Record permanently removed.' })
      removeOperatorTenant(t.id)
      refresh()
      toast(`${t.name} permanently removed.`)
      go({ name: 'clients' })
    }
  }

  // View-as (impersonation): capture a reason, log both ends, open the product with a
  // read-only operator banner. Never a credentialed "log in as client" session.
  const startViewAs = (reason: string) => {
    audit('client.workspace.opened', { reason })
    setViewAs(false)
    const url = `${workspaceUrl(t.id)}&view=operator`
    try {
      const w = window.open(url, '_blank', 'noopener')
      if (!w) window.location.href = url // popup blocked → open in this tab
    } catch { window.location.href = url }
  }

  return (
    <div className="mx-auto max-w-[840px] px-6 py-7">
      <button onClick={() => go({ name: 'clients' })} className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg-subtle transition-colors hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" /> Clients</button>

      {/* header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-navy text-[14px] font-bold text-white">{t.initials}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[20px] font-semibold tracking-tight text-fg">{t.name}</h1>
            <Badge tone={st.tone}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</Badge>
          </div>
          <div className="flex items-center gap-2 truncate text-[12.5px] text-fg-subtle">
            {t.domain ? `${t.domain} · ${t.industry}` : t.industry}
            {t.tag && <Badge tone="neutral">{t.tag}</Badge>}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isManaged && !isOffboarded(t) && (
            effectiveStatus(t) === 'suspended'
              ? <Button variant="default" size="md" disabled={!can('suspend')} title={can('suspend') ? undefined : 'Your role can’t reactivate clients'} onClick={reactivate}>Reactivate</Button>
              : <Button variant="danger" size="md" disabled={!can('suspend')} title={can('suspend') ? undefined : 'Your role can’t suspend clients'} onClick={() => setOffboard('suspend')}><Ban className="h-3.5 w-3.5" /> Suspend</Button>
          )}
          <Button variant="navy" size="md" disabled={!can('open')} onClick={() => setViewAs(true)}>Open workspace <ExternalLink className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {viewAs && <ViewAsDialog clientName={t.name} onCancel={() => setViewAs(false)} onConfirm={startViewAs} />}
      {offboard && <OffboardDialog kind={offboard} clientName={t.name} restorableUntil={fmtDay(now + RESTORE_WINDOW_DAYS * DAY_MS)} onCancel={() => setOffboard(null)} onConfirm={applyOffboard} />}

      <div className="grid gap-4 md:grid-cols-2">
        {/* organisation */}
        <Card className="p-5">
          <CardTitle icon={<Building2 className="h-4 w-4" />} title="Organisation" />
          <KV label="Industry" value={t.industry} />
          <KV label="Region" value={t.region} />
          <KV label="Plan" value={planName(t.plan)} />
          {t.tag && <KV label="Tag" value={t.tag} />}
          <KV label="Provisioned" value={fmtDate(t.createdAt)} />
          <KV label="Created by" value={t.createdBy ?? '—'} />
          <KV label="Source" value={t.source === 'operator' ? 'Console' : t.source === 'self-serve' ? 'Self-serve' : 'Demo seed'} last />
        </Card>

        {/* admin & access */}
        <Card className="p-5">
          <CardTitle icon={<ShieldCheck className="h-4 w-4" />} title="Admin & access" />
          {isOperator && t.admin ? (
            <>
              <KV label="Admin" value={t.admin.name} />
              <KV label="Email" value={t.admin.email} />
              <KV label="Method" value={t.access?.method === 'credentials' ? 'One-time credentials' : 'Invite link'} />
              <KV
                label="State"
                value={
                  expired ? <Badge tone="neg">Sign-in expired</Badge>
                  : activated ? <Badge tone="pos">Activated</Badge>
                  : <Badge tone="warn">Awaiting first sign-in</Badge>
                }
                last
              />

              {secret && (
                <div className="mt-3 rounded-[10px] border border-navy/15 bg-navy-tint/40 p-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy">Share this now — shown once</div>
                  {secret.kind === 'invite'
                    ? <><CopyField value={secret.link} mono /><p className="mt-1.5 text-[11px] text-fg-subtle">Expires {secret.expires}.</p></>
                    : <div className="space-y-2"><CopyField value={secret.username} mono /><CopyField value={secret.password} mono /></div>}
                </div>
              )}

              {!activated && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.access?.method === 'credentials'
                    ? <Button variant="default" size="sm" disabled={!can('handoff')} title={can('handoff') ? undefined : 'Your role can’t regenerate access'} onClick={regenCreds}><RefreshCw className="h-3.5 w-3.5" /> {expired ? 'New password' : 'Regenerate password'}</Button>
                    : <Button variant="default" size="sm" disabled={!can('handoff')} title={can('handoff') ? undefined : 'Your role can’t resend invites'} onClick={resendInvite}><Mail className="h-3.5 w-3.5" /> {expired ? 'New invite' : 'Resend invite'}</Button>}
                  <Button variant="subtle" size="sm" disabled={!can('handoff')} onClick={simulateSignIn}><PlayCircle className="h-3.5 w-3.5" /> Simulate first sign-in</Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2 py-2 text-[12.5px] text-fg-muted">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" />
              {t.source === 'self-serve' ? 'Signed up self-serve — the client set up their own admin.' : 'Demo workspace — no Console-managed admin account.'}
            </div>
          )}
        </Card>

        {/* plan & access — entitlements + honest billing surface */}
        {isManaged && <PlanPanel t={t} canEdit={can('plan')} onChange={changePlan} />}

        {/* lifecycle — suspend / archive / delete / restore / purge */}
        {isManaged && (
          <Card className="p-5">
            <CardTitle icon={<History className="h-4 w-4" />} title="Lifecycle" />
            <KV label="Status" value={<Badge tone={st.tone}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</Badge>} />
            {t.offboardReason && <KV label="Reason" value={t.offboardReason} />}
            {t.suspendedAt != null && <KV label="Suspended" value={fmtDate(t.suspendedAt)} />}
            {t.archivedAt != null && <KV label="Archived" value={fmtDate(t.archivedAt)} />}
            {t.deletedAt != null && <KV label="Deleted" value={`${fmtDate(t.deletedAt)} · restorable until ${fmtDay(t.deletedAt + RESTORE_WINDOW_DAYS * DAY_MS)}`} />}
            <div className="mt-3 flex flex-wrap gap-2">
              {!isOffboarded(t) && <Button variant="default" size="sm" disabled={!can('offboard')} title={can('offboard') ? undefined : 'Your role can’t offboard clients'} onClick={() => setOffboard('archive')}>Archive</Button>}
              {effectiveStatus(t) !== 'deleted' && <Button variant="danger" size="sm" disabled={!can('offboard')} title={can('offboard') ? undefined : 'Your role can’t offboard clients'} onClick={() => setOffboard('delete')}>Delete</Button>}
              {isOffboarded(t) && <Button variant="default" size="sm" disabled={!can('offboard')} onClick={restore}>Restore</Button>}
              {isOffboarded(t) && <Button variant="danger" size="sm" disabled={!can('offboard')} title={can('offboard') ? undefined : 'Only an admin can purge'} onClick={() => setOffboard('purge')}>Purge</Button>}
            </div>
            {effectiveStatus(t) === 'deleted' && <p className="mt-2 text-[11px] text-fg-subtle">Soft-deleted — the record is kept and restorable. This prototype has no auto-purge timer.</p>}
          </Card>
        )}

        {/* onboarding — shared deterministic ladder */}
        <Card className="p-5 md:col-span-2">
          <CardTitle icon={<CheckCircle2 className="h-4 w-4" />} title="Onboarding" hint={prog.live ? 'Live' : `${prog.done} of ${prog.total} done`} />
          {stuck && (
            <div className="mb-3 flex items-center gap-1.5 rounded-[9px] bg-warn-tint px-3 py-2 text-[12px] font-medium text-warn">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{stuck.label}
            </div>
          )}
          {prog.steps.map((s) => <StepLine key={s.key} done={s.done} label={s.label} />)}
          {prog.live && <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-pos"><CheckCircle2 className="h-3.5 w-3.5" /> This workspace is live.</div>}
        </Card>

        {/* activity — this client's audit trail */}
        <Card className="p-5 md:col-span-2">
          <CardTitle icon={<Activity className="h-4 w-4" />} title="Activity" hint="everything done to this client" />
          <ClientActivity id={t.id} />
        </Card>
      </div>
    </div>
  )
}

function ClientActivity({ id }: { id: string }) {
  const { events } = useAudit()
  const mine = events.filter((e) => e.target?.id === id)
  if (!mine.length) return <p className="py-1 text-[12.5px] text-fg-subtle">No activity recorded yet.</p>
  return (
    <div className="space-y-0.5">
      {mine.slice(0, 12).map((e) => (
        <div key={e.id} className="flex items-start gap-2.5 border-b border-line py-2 text-[12.5px] last:border-0">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy/50" />
          <span className="min-w-0 flex-1">
            <span className="text-fg">{auditSentence(e)}</span>
            {e.reason && <span className="text-fg-subtle"> · {e.reason}</span>}
            {e.note && <span className="block text-[11px] text-fg-subtle">{e.note}</span>}
          </span>
          <span className="shrink-0 text-[11px] text-fg-subtle">{auditTime(e.ts)}</span>
        </div>
      ))}
    </div>
  )
}

function CardTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <span className="relative top-[2px] text-fg-muted">{icon}</span>
      <h2 className="text-[14px] font-semibold tracking-tight text-fg">{title}</h2>
      {hint && <span className="text-[11.5px] text-fg-subtle">{hint}</span>}
    </div>
  )
}
function KV({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 py-2 text-[13px]', !last && 'border-b border-line')}>
      <span className="w-28 shrink-0 text-fg-subtle">{label}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-fg">{value}</span>
    </div>
  )
}
