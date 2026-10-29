import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ExternalLink, KeyRound, Mail, Rocket, UserPlus, X } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import {
  INDUSTRIES, PLANS, WEEK_MS, genTempPassword, genToken, initialsOf, lexiconFor, planName,
  slugify, usernameFromEmail, addOperatorTenant, type Access, type PlanId, type Tenant,
} from '@/lib/tenant'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import { logAudit } from '@/lib/audit'
import { OPERATOR, workspaceUrl, type Go } from './lib'
import { operatorActor, useOperator } from './operator'
import { CopyField, StepLine } from './bits'

type Method = 'invite' | 'credentials'
type Secret =
  | { kind: 'invite'; link: string; expires: string }
  | { kind: 'credentials'; username: string; password: string }
type Provisioned = { tenant: Tenant; secret: Secret }

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export function CreateClient({ go }: { go: Go }) {
  const toast = useToast()
  const { role, can } = useOperator()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [done, setDone] = useState<Provisioned | null>(null)

  // org
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState<string>('B2B SaaS')
  const [region, setRegion] = useState('India')
  const [tag, setTag] = useState('')
  const [plan, setPlan] = useState<PlanId>('growth')
  // first admin + access
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [method, setMethod] = useState<Method>('invite')

  // We don't set a landing-page domain here — the client sets up their own later.
  // A slug is still derived from the name only to form a unique workspace id.
  const idSlug = (slugify(name) || 'workspace').slice(0, 24)
  const STEPS = [
    { k: 'org', label: 'Organisation', hint: 'The client and their plan' },
    { k: 'admin', label: 'First admin', hint: 'Who we hand the keys to' },
    { k: 'review', label: 'Review', hint: 'Confirm and provision' },
  ]
  const canNext = step === 0 ? name.trim().length > 1 : step === 1 ? adminName.trim().length > 1 && emailOk(adminEmail) : true
  const goStep = (n: number) => { setDir(n > step ? 1 : -1); setStep(Math.max(0, Math.min(STEPS.length - 1, n))) }

  const provision = () => {
    if (!can('create')) return // defense-in-depth: role gating lives in the handler, not only the button
    const id = `${idSlug}-${Math.random().toString(36).slice(2, 6)}`
    const now = Date.now()
    const lex = lexiconFor(industry)
    let access: Access
    let secret: Secret
    let status: Tenant['status']
    if (method === 'invite') {
      const token = genToken()
      access = { method: 'invite', state: 'pending', invitedAt: now, expiresAt: now + WEEK_MS }
      secret = { kind: 'invite', link: `${workspaceUrl(id)}&invite=${token}`, expires: new Date(now + WEEK_MS).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
      status = 'invited'
    } else {
      const username = usernameFromEmail(adminEmail)
      const password = genTempPassword()
      access = { method: 'credentials', username, state: 'pending', invitedAt: now, expiresAt: now + WEEK_MS }
      secret = { kind: 'credentials', username, password }
      status = 'provisioning'
    }
    const tenant: Tenant = {
      id, name: name.trim(), initials: initialsOf(name), domain: '', industry, region,
      offerings: [], conns: [], fresh: true, lexicon: lex,
      plan, tag: tag.trim() || undefined, status, admin: { name: adminName.trim(), email: adminEmail.trim() }, access,
      createdAt: now, createdBy: OPERATOR.name, source: 'operator',
    }
    addOperatorTenant(tenant)
    const actor = operatorActor(role)
    const target = { type: 'client' as const, id, name: tenant.name }
    logAudit({ action: 'client.created', actor, target, changes: { after: { plan, access: method } }, source: 'console' })
    logAudit({
      action: method === 'invite' ? 'client.invited' : 'client.credentials.issued',
      actor, target,
      // handoff facts only — NEVER the one-time token/password (shown once, never persisted)
      changes: { after: method === 'credentials' ? { username: access.username, expiresAt: access.expiresAt } : { expiresAt: access.expiresAt } },
      source: 'console',
    })
    setDone({ tenant, secret })
    toast(`${tenant.name} is provisioned.`)
  }

  if (done) return <Handoff done={done} go={go} />

  return (
    <div className="mx-auto max-w-[620px] px-6 py-7">
      {/* header + step rail */}
      <div className="mb-5 flex items-center gap-3">
        <button onClick={() => go({ name: 'clients' })} className="grid h-8 w-8 place-items-center rounded-[8px] text-fg-subtle transition-colors hover:bg-sunken hover:text-fg"><X className="h-4 w-4" /></button>
        <h1 className="text-[18px] font-semibold tracking-tight text-fg">New client</h1>
        <div className="ml-auto flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.k} className="flex items-center">
              <button onClick={() => i <= step && goStep(i)} disabled={i > step} className={cn('flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-medium transition-colors', i === step ? 'bg-navy-tint text-navy' : i < step ? 'text-fg hover:bg-sunken' : 'cursor-not-allowed text-fg-subtle')}>
                <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold', i === step ? 'bg-navy text-white' : i < step ? 'bg-pos text-white' : 'bg-sunken text-fg-subtle')}>{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span className={cn('mx-0.5 h-px w-4', i < step ? 'bg-pos/50' : 'bg-line')} />}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={step} custom={dir} variants={{ enter: (d: number) => ({ opacity: 0, x: d * 18 }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: d * -18 }) }} initial="enter" animate="center" exit="exit" transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
          {step === 0 && (
            <Section icon={<Building2 className="h-[18px] w-[18px]" />} title="Who are we onboarding?" sub="The organisation and the plan they're on. They connect their data during their own setup.">
              <Labeled label="Client name">
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Inc." className="input text-[14px]" />
              </Labeled>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="Industry">
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="input appearance-none">
                    {INDUSTRIES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Labeled>
                <Labeled label="Primary region">
                  <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="India" className="input" />
                </Labeled>
              </div>
              <Labeled label="Tag (optional)">
                <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. Pilot · EMEA · Priority" className="input" />
              </Labeled>
              <Labeled label="Plan">
                <div className="grid gap-2 sm:grid-cols-3">
                  {PLANS.map((p) => (
                    <button key={p.id} onClick={() => setPlan(p.id)} className={cn('rounded-[11px] border p-3 text-left transition-colors', plan === p.id ? 'border-navy bg-navy-tint' : 'border-line bg-panel hover:border-line-strong')}>
                      <div className="flex items-center gap-1.5"><span className={cn('text-[13px] font-semibold', plan === p.id ? 'text-navy' : 'text-fg')}>{p.name}</span>{plan === p.id && <Check className="h-3.5 w-3.5 text-navy" />}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-fg-subtle">{p.blurb}</div>
                    </button>
                  ))}
                </div>
              </Labeled>
            </Section>
          )}

          {step === 1 && (
            <Section icon={<UserPlus className="h-[18px] w-[18px]" />} title="Their first admin" sub="We create one admin account for the client. From inside the product they can invite the rest of their team.">
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="Admin name"><input autoFocus value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="e.g. Priya Shah" className="input" /></Labeled>
                <Labeled label="Admin email"><input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="priya@acme.com" className={cn('input', adminEmail && !emailOk(adminEmail) && 'border-neg')} /></Labeled>
              </div>
              <Labeled label="How do they get in?">
                <div className="grid gap-2 sm:grid-cols-2">
                  <MethodCard on={method === 'invite'} onClick={() => setMethod('invite')} icon={<Mail className="h-4 w-4" />} title="Send invite link" rec
                    desc="They click a link and set their own password. The safest handoff — no password ever travels." />
                  <MethodCard on={method === 'credentials'} onClick={() => setMethod('credentials')} icon={<KeyRound className="h-4 w-4" />} title="One-time credentials"
                    desc="We generate a username + temporary password, shown once. They must change it at first sign-in." />
                </div>
              </Labeled>
            </Section>
          )}

          {step === 2 && (
            <Section icon={<CheckCircle2 className="h-[18px] w-[18px]" />} title="Review & provision" sub="This creates the client's workspace and prepares their sign-in. You'll get the handoff next.">
              <Card className="overflow-hidden">
                <Summary label="Client" value={<span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-[7px] bg-navy text-[10px] font-bold text-white">{initialsOf(name || 'W')}</span>{name || '—'}</span>} onEdit={() => goStep(0)} />
                <Summary label="Industry · region" value={`${industry} · ${region}`} onEdit={() => goStep(0)} />
                {tag.trim() && <Summary label="Tag" value={tag.trim()} onEdit={() => goStep(0)} />}
                <Summary label="Plan" value={planName(plan)} onEdit={() => goStep(0)} />
                <Summary label="First admin" value={`${adminName || '—'} · ${adminEmail || '—'}`} onEdit={() => goStep(1)} />
                <Summary label="Access" value={method === 'invite' ? 'Invite link (they set their password)' : 'One-time credentials (change at first sign-in)'} onEdit={() => goStep(1)} />
              </Card>
              <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-navy/15 bg-navy-tint/50 px-3.5 py-2.5 text-[12px] text-fg-muted">
                <Rocket className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy" />
                The workspace starts empty. {adminName || 'The client'} signs in and connects their data — in the product itself.
              </div>
            </Section>
          )}
        </motion.div>
      </AnimatePresence>

      {/* footer */}
      <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
        {step > 0
          ? <Button variant="default" size="md" onClick={() => goStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
          : <Button variant="default" size="md" onClick={() => go({ name: 'clients' })}>Cancel</Button>}
        <div className="flex-1" />
        {step < STEPS.length - 1
          ? <Button variant="navy" size="md" disabled={!canNext} onClick={() => goStep(step + 1)}>Continue <ArrowRight className="h-4 w-4" /></Button>
          : <Button variant="navy" size="md" disabled={!can('create')} title={can('create') ? undefined : 'Your role can’t create clients'} onClick={provision}><Rocket className="h-4 w-4" /> Provision client</Button>}
      </div>
    </div>
  )
}

/* ── Handoff — the shareable result ──────────────────────────────────────────── */
function Handoff({ done, go }: { done: Provisioned; go: Go }) {
  const { tenant, secret } = done
  return (
    <div className="mx-auto max-w-[560px] px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-5 text-center">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-[16px] bg-pos-tint text-pos"><CheckCircle2 className="h-7 w-7" /></motion.div>
          <h1 className="text-[20px] font-semibold tracking-tight text-fg">{tenant.name} is provisioned</h1>
          <p className="mx-auto mt-1 max-w-[44ch] text-[13px] leading-relaxed text-fg-subtle">Share the sign-in below with {tenant.admin?.name || 'their admin'}. Nothing is emailed in this prototype — copy and send it yourself.</p>
        </div>

        {secret.kind === 'invite' ? (
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-fg-muted"><Mail className="h-3.5 w-3.5" /> Invite link</div>
            <CopyField value={secret.link} mono />
            <p className="mt-2 text-[11.5px] text-fg-subtle">Expires {secret.expires}. They set their own password when they open it.</p>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-fg-muted"><KeyRound className="h-3.5 w-3.5" /> One-time credentials</div>
            <div className="space-y-2">
              <div><div className="mb-1 text-[11px] font-medium text-fg-subtle">Username</div><CopyField value={secret.username} mono /></div>
              <div><div className="mb-1 text-[11px] font-medium text-fg-subtle">Temporary password</div><CopyField value={secret.password} mono /></div>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-warn"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" /> Shown once — it isn't stored. They must change it at first sign-in.</p>
          </Card>
        )}

        {/* what happens next */}
        <div className="mt-4 rounded-[12px] border border-line bg-panel p-4">
          <div className="mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-fg-muted">What happens next</div>
          <StepLine done label="We provisioned the workspace & admin" />
          <StepLine done label="We share the sign-in above" />
          <StepLine label={`${tenant.admin?.name || 'They'} signs in and connects their data`} />
          <StepLine label="The workspace goes live" />
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Button variant="default" size="md" className="flex-1" onClick={() => go({ name: 'client', id: tenant.id })}>View client</Button>
          <a href={workspaceUrl(tenant.id)} target="_blank" rel="noreferrer" className="flex-1">
            <Button variant="navy" size="md" className="w-full">Open their workspace <ExternalLink className="h-3.5 w-3.5" /></Button>
          </a>
        </div>
        <button onClick={() => go({ name: 'clients' })} className="mx-auto mt-3 block text-[12.5px] font-medium text-fg-subtle hover:text-fg">Back to all clients</button>
      </motion.div>
    </div>
  )
}

/* ── small building blocks ───────────────────────────────────────────────────── */
function Section({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-navy-tint text-navy">{icon}</span>
        <div><h2 className="text-[18px] font-semibold tracking-tight text-fg">{title}</h2><p className="mt-0.5 text-[13px] leading-relaxed text-fg-subtle">{sub}</p></div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[12px] font-medium text-fg-muted">{label}</span>{children}</label>
}
function MethodCard({ on, onClick, icon, title, desc, rec }: { on: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; rec?: boolean }) {
  return (
    <button onClick={onClick} className={cn('rounded-[11px] border p-3 text-left transition-colors', on ? 'border-navy bg-navy-tint' : 'border-line bg-panel hover:border-line-strong')}>
      <div className="flex items-center gap-2">
        <span className={cn('grid h-7 w-7 place-items-center rounded-[8px]', on ? 'bg-navy text-white' : 'bg-sunken text-fg-muted')}>{icon}</span>
        <span className={cn('text-[13px] font-semibold', on ? 'text-navy' : 'text-fg')}>{title}</span>
        {rec && <Badge tone="pos" className="ml-auto">Recommended</Badge>}
      </div>
      <p className="mt-1.5 text-[11.5px] leading-snug text-fg-subtle">{desc}</p>
    </button>
  )
}
function Summary({ label, value, onEdit }: { label: string; value: React.ReactNode; onEdit?: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-[13px] last:border-0">
      <span className="w-32 shrink-0 text-fg-subtle">{label}</span>
      <b className="min-w-0 flex-1 truncate font-medium text-fg">{value}</b>
      {onEdit && <button onClick={onEdit} className="shrink-0 text-[12px] font-medium text-navy hover:underline">Edit</button>}
    </div>
  )
}
