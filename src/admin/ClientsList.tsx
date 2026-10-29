import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Ban, Boxes, Mail, Plus, Search, Tag as TagIcon, X } from 'lucide-react'
import { Badge, Button, Card, Segmented } from '@/components/ui'
import { WEEK_MS, planName, updateOperatorTenant, usernameFromEmail, type Access, type Tenant } from '@/lib/tenant'
import { onboardingProgress } from '@/lib/onboarding'
import { logAudit } from '@/lib/audit'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import { awaitingSetup, displayStatus, effectiveStatus, isClosed, isOffboarded, useClients, type Go } from './lib'
import { operatorActor, useOperator } from './operator'

type Filter = 'all' | 'active' | 'awaiting' | 'suspended' | 'closed'

const resendEligible = (t: Tenant): boolean => t.source === 'operator' && !!t.fresh && t.access?.state === 'pending'
const suspendEligible = (t: Tenant): boolean => (t.source === 'operator' || t.source === 'self-serve') && !isClosed(t)

export function ClientsList({ go }: { go: Go }) {
  const { clients, refresh } = useClients()
  const { role, can } = useOperator()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [tagVal, setTagVal] = useState('')
  const [confirmSuspend, setConfirmSuspend] = useState(false)

  const stats = useMemo(() => ({
    total: clients.filter((t) => !isOffboarded(t)).length,
    active: clients.filter((t) => effectiveStatus(t) === 'active' && !t.fresh).length,
    awaiting: clients.filter(awaitingSetup).length,
    suspended: clients.filter((t) => effectiveStatus(t) === 'suspended').length,
  }), [clients])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return clients.filter((t) => {
      // Default views hide offboarded (archived/deleted); only "Closed" reveals them.
      if (filter === 'closed') { if (!isOffboarded(t)) return false }
      else if (isOffboarded(t)) return false
      if (filter === 'active' && !(effectiveStatus(t) === 'active' && !t.fresh)) return false
      if (filter === 'awaiting' && !awaitingSetup(t)) return false
      if (filter === 'suspended' && effectiveStatus(t) !== 'suspended') return false
      if (!needle) return true
      return [t.name, t.domain, t.industry, t.tag, t.admin?.email].filter(Boolean).some((s) => s!.toLowerCase().includes(needle))
    })
  }, [clients, q, filter])

  // Selection is keyed by id, so it survives the storage-event refresh. Keep only ids
  // still visible under the current filter.
  const selVisible = useMemo(() => rows.filter((t) => sel.has(t.id)), [rows, sel])
  const allChecked = rows.length > 0 && selVisible.length === rows.length
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSel(allChecked ? new Set() : new Set(rows.map((t) => t.id)))
  const clearSel = () => setSel(new Set())

  const audit = (t: Tenant, action: Parameters<typeof logAudit>[0]['action'], extra?: { reason?: string; note?: string }) =>
    logAudit({ action, actor: operatorActor(role), target: { type: 'client', id: t.id, name: t.name }, source: 'console', ...extra })

  const bulkTag = () => {
    if (!can('bulk')) return
    const targets = selVisible
    targets.forEach((t) => { updateOperatorTenant(t.id, { tag: tagVal.trim() || undefined }); audit(t, 'client.updated', { note: tagVal.trim() ? `Tag set to “${tagVal.trim()}”` : 'Tag cleared' }) })
    refresh()
    toast(`${tagVal.trim() ? 'Tagged' : 'Cleared tag on'} ${targets.length} client${targets.length !== 1 ? 's' : ''}.`)
    setTagVal(''); clearSel()
  }
  const bulkResend = () => {
    if (!can('bulk')) return
    const ok = selVisible.filter(resendEligible)
    const now = Date.now()
    ok.forEach((t) => {
      const prev = t.access as Access
      const access: Access = { ...prev, state: 'pending', invitedAt: now, expiresAt: now + WEEK_MS, username: prev?.username ?? usernameFromEmail(t.admin?.email || '') }
      updateOperatorTenant(t.id, { access, status: prev?.method === 'credentials' ? 'provisioning' : 'invited' })
      audit(t, prev?.method === 'credentials' ? 'client.credentials.regenerated' : 'client.invite.resent', { note: 'Regenerated via bulk action. Previous link invalidated; not emailed.' })
    })
    refresh()
    const skipped = selVisible.length - ok.length
    toast(`${ok.length} access link${ok.length !== 1 ? 's' : ''} regenerated (not emailed)${skipped ? ` · skipped ${skipped} (already signed in / not applicable)` : ''}.`)
    clearSel()
  }
  const doBulkSuspend = () => {
    setConfirmSuspend(false)
    if (!can('bulk')) return
    const ok = selVisible.filter(suspendEligible)
    const now = Date.now()
    ok.forEach((t) => { updateOperatorTenant(t.id, { status: 'suspended', suspendedAt: now }); audit(t, 'client.suspended', { reason: 'Bulk action' }) })
    refresh()
    const skipped = selVisible.length - ok.length
    toast(`${ok.length} client${ok.length !== 1 ? 's' : ''} suspended${skipped ? ` · skipped ${skipped} (already suspended)` : ''}.`)
    clearSel()
  }

  const suspendCount = selVisible.filter(suspendEligible).length

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-7">
      {/* header */}
      <div className="mb-5 flex items-end gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">Clients</h1>
          <p className="mt-0.5 text-[13px] text-fg-subtle">Every workspace Samurai has provisioned. Create a client here, then hand off the sign-in so they finish setup themselves.</p>
        </div>
        <Button variant="navy" size="md" className="ml-auto shrink-0" disabled={!can('create')} title={can('create') ? undefined : 'Your role can’t create clients'} onClick={() => go({ name: 'new' })}>
          <Plus className="h-4 w-4" /> New client
        </Button>
      </div>

      {/* stat strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total clients" value={stats.total} />
        <StatTile label="Active" value={stats.active} tone="pos" />
        <StatTile label="Awaiting setup" value={stats.awaiting} tone="warn" />
        <StatTile label="Suspended" value={stats.suspended} tone="muted" />
      </div>

      {/* controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-[9px] border border-line bg-panel px-3 text-[13px] text-fg-subtle focus-within:border-brand">
          <Search className="h-4 w-4 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, domain, admin…" className="w-full bg-transparent text-fg outline-none placeholder:text-fg-subtle" />
        </div>
        <Segmented<Filter>
          value={filter}
          onChange={(f) => { setFilter(f); clearSel() }}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'awaiting', label: 'Awaiting' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'closed', label: 'Closed' },
          ]}
        />
      </div>

      {/* bulk bar — appears only when something is selected */}
      {sel.size > 0 && can('bulk') && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-navy/20 bg-navy-tint/40 px-3 py-2">
          <span className="text-[12.5px] font-semibold text-navy">{selVisible.length} selected</span>
          <span className="mx-1 h-4 w-px bg-navy/15" />
          <div className="flex items-center gap-1.5">
            <input value={tagVal} onChange={(e) => setTagVal(e.target.value)} placeholder="Set tag…" className="h-8 w-[130px] rounded-[8px] border border-line bg-panel px-2 text-[12.5px] text-fg outline-none focus:border-navy" />
            <Button variant="default" size="sm" onClick={bulkTag}><TagIcon className="h-3.5 w-3.5" /> Apply</Button>
          </div>
          <Button variant="default" size="sm" onClick={bulkResend}><Mail className="h-3.5 w-3.5" /> Resend</Button>
          <Button variant="danger" size="sm" disabled={suspendCount === 0} onClick={() => setConfirmSuspend(true)}><Ban className="h-3.5 w-3.5" /> Suspend</Button>
          <button onClick={clearSel} className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-fg-muted hover:text-fg"><X className="h-3.5 w-3.5" /> Clear</button>
        </div>
      )}

      {/* table */}
      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[28px_1.6fr_1fr_0.8fr_1.3fr_0.9fr] items-center gap-3 border-b border-line bg-sunken/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle sm:grid">
          <span>{can('bulk') && <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" className="h-3.5 w-3.5 cursor-pointer accent-[#16305a]" />}</span>
          <span>Client</span><span>Industry</span><span>Plan</span><span>Admin</span><span>Status</span>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Boxes className="mx-auto mb-2 h-6 w-6 text-fg-subtle" />
            <p className="text-[13px] text-fg-muted">No clients match.</p>
          </div>
        ) : (
          rows.map((t, i) => (
            <Row key={t.id} t={t} first={i === 0} selectable={can('bulk')} selected={sel.has(t.id)} onToggle={() => toggle(t.id)} onOpen={() => go({ name: 'client', id: t.id })} />
          ))
        )}
      </Card>

      {confirmSuspend && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="alertdialog" aria-modal="true" onClick={() => setConfirmSuspend(false)}>
          <div className="w-full max-w-[400px] rounded-[14px] border border-line bg-panel p-5 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-[15px] font-semibold tracking-tight text-fg">Suspend {suspendCount} client{suspendCount !== 1 ? 's' : ''}?</h2>
            <p className="mb-4 text-[12.5px] leading-relaxed text-fg-subtle">They lose access to their workspace until reactivated. Fully reversible.{selVisible.length - suspendCount > 0 && ` ${selVisible.length - suspendCount} already-suspended selection${selVisible.length - suspendCount !== 1 ? 's' : ''} will be skipped.`}</p>
            <div className="flex gap-2">
              <Button variant="default" size="md" className="flex-1" onClick={() => setConfirmSuspend(false)}>Cancel</Button>
              <Button variant="danger" size="md" className="flex-1" onClick={doBulkSuspend}>Suspend</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ t, first, selectable, selected, onToggle, onOpen }: { t: Tenant; first: boolean; selectable: boolean; selected: boolean; onToggle: () => void; onOpen: () => void }) {
  const st = displayStatus(t)
  const prog = onboardingProgress(t)
  const managed = t.source === 'operator' || t.source === 'self-serve'
  return (
    <motion.div
      initial={first ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onOpen}
      className={cn('group grid w-full cursor-pointer grid-cols-1 items-center gap-1 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-sunken/50 sm:grid-cols-[28px_1.6fr_1fr_0.8fr_1.3fr_0.9fr] sm:gap-3', selected && 'bg-navy-tint/30')}
    >
      <span className="hidden items-center sm:flex" onClick={(e) => e.stopPropagation()}>
        {selectable && <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${t.name}`} className="h-3.5 w-3.5 cursor-pointer accent-[#16305a]" />}
      </span>
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-navy text-[11px] font-bold text-white">{t.initials}</span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold text-fg">{t.name}</span>
          <span className="block truncate text-[11.5px] text-fg-subtle">{t.domain || t.tag || t.region}</span>
        </span>
      </span>
      <span className="truncate text-[12.5px] text-fg-muted">{t.industry}</span>
      <span className="truncate text-[12.5px] text-fg-muted">{planName(t.plan)}</span>
      <span className="truncate text-[12.5px] text-fg-muted">{t.admin?.email ?? <span className="text-fg-subtle">—</span>}</span>
      <span className="flex items-center gap-2">
        <Badge tone={st.tone}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</Badge>
        {managed && !prog.live && !isClosed(t) && <span className="tnum text-[11px] text-fg-subtle" title="Onboarding steps complete">{prog.done}/{prog.total}</span>}
        <ArrowRight className="ml-auto hidden h-4 w-4 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
      </span>
    </motion.div>
  )
}

function StatTile({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'pos' | 'warn' | 'muted' }) {
  const color = tone === 'pos' ? 'text-pos' : tone === 'warn' ? 'text-warn' : tone === 'muted' ? 'text-fg-subtle' : 'text-fg'
  return (
    <Card className="px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className={cn('mt-1 text-[24px] font-semibold tabular-nums tracking-tight', color)}>{value}</div>
    </Card>
  )
}
