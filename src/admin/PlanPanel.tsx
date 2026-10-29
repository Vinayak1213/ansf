import { CreditCard } from 'lucide-react'
import { Badge, Card } from '@/components/ui'
import { DAY_MS, ENTITLEMENTS, PLANS, entitlementsOf, type Entitlements, type PlanId, type Tenant } from '@/lib/tenant'
import { TRIAL_DAYS, trialState } from '@/lib/onboarding'
import { cn } from '@/lib/utils'
import { fmtDate } from './lib'

export function PlanPanel({ t, canEdit, onChange }: { t: Tenant; canEdit: boolean; onChange: (plan: PlanId, overrides: Partial<Entitlements>) => void }) {
  const ent = entitlementsOf(t)
  const base = ENTITLEMENTS[t.plan ?? 'trial']
  const used = t.conns?.length ?? 0
  const now = Date.now()
  const trial = trialState(t, now)
  const ageDays = t.createdAt ? Math.floor((now - t.createdAt) / DAY_MS) : null
  const expGranted = !base.experiments && ent.experiments // granted via override

  const setPlan = (plan: PlanId) => onChange(plan, t.overrides ?? {})
  const toggleExpOverride = () => {
    const next = { ...(t.overrides ?? {}) }
    if (ent.experiments === base.experiments) next.experiments = !base.experiments // diverge from the plan
    else delete next.experiments // back to plan default
    onChange(t.plan ?? 'trial', next)
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="relative top-[2px] text-fg-muted"><CreditCard className="h-4 w-4" /></span>
        <h2 className="text-[14px] font-semibold tracking-tight text-fg">Plan &amp; access</h2>
      </div>

      {/* plan */}
      <div className="flex items-center gap-3 border-b border-line py-2 text-[13px]">
        <span className="w-28 shrink-0 text-fg-subtle">Plan</span>
        {canEdit ? (
          <select value={t.plan ?? 'trial'} onChange={(e) => setPlan(e.target.value as PlanId)} className="h-8 rounded-[8px] border border-line bg-panel px-2 text-[13px] text-fg outline-none focus:border-navy">
            {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        ) : <span className="font-medium text-fg">{PLANS.find((p) => p.id === (t.plan ?? 'trial'))?.name}</span>}
        <span className="ml-auto text-right text-[11.5px] text-fg-subtle">{PLANS.find((p) => p.id === (t.plan ?? 'trial'))?.blurb}</span>
      </div>

      {/* trial window (trial plan only) */}
      {t.plan === 'trial' && (
        <div className="flex items-center gap-3 border-b border-line py-2 text-[13px]">
          <span className="w-28 shrink-0 text-fg-subtle">Trial</span>
          {trial.state === 'not_started' ? <Badge tone="neutral">Not started</Badge>
            : trial.state === 'ended' ? <Badge tone="neg">Ended</Badge>
            : <span className="font-medium text-fg">Day {trial.dayShown} of {TRIAL_DAYS} · <span className={cn((trial.daysLeft ?? 99) <= 3 ? 'text-warn' : 'text-fg-subtle')}>{trial.daysLeft} days left</span></span>}
        </div>
      )}

      {/* connections meter — real usage */}
      <div className="border-b border-line py-2.5">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-fg-subtle">Connections</span>
          <span className="font-medium text-fg">{ent.connectionCap == null ? <>Unlimited <span className="text-fg-subtle">· {used} connected</span></> : `${used} of ${ent.connectionCap}`}</span>
        </div>
        {ent.connectionCap != null && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={used} aria-valuemax={ent.connectionCap} aria-label="Connections used">
            <div className={cn('h-full rounded-full', used >= ent.connectionCap ? 'bg-warn' : 'bg-navy')} style={{ width: `${Math.min(100, (used / ent.connectionCap) * 100)}%` }} />
          </div>
        )}
        {ent.connectionCap != null && used >= ent.connectionCap && <p className="mt-1 text-[11px] text-warn">At the plan limit — Scale allows unlimited.</p>}
      </div>

      {/* experiments capability */}
      <div className="flex items-center gap-3 border-b border-line py-2.5 text-[13px]">
        <span className="w-28 shrink-0 text-fg-subtle">Experiments</span>
        <Badge tone={ent.experiments ? 'pos' : 'neutral'}>{ent.experiments ? 'On' : 'Off'}</Badge>
        {expGranted && <Badge tone="navy">Override</Badge>}
        {canEdit && <button onClick={toggleExpOverride} className="ml-auto text-[12px] font-medium text-navy hover:underline">{ent.experiments === base.experiments ? (base.experiments ? 'Turn off (override)' : 'Grant (override)') : 'Reset to plan'}</button>}
      </div>

      {/* not tracked */}
      <div className="flex items-center gap-3 border-b border-line py-2.5 text-[13px]">
        <span className="w-28 shrink-0 text-fg-subtle">Seats · runs</span>
        <span className="text-fg-subtle">Not tracked in this prototype</span>
      </div>

      {/* provisioned */}
      <div className="flex items-center gap-3 py-2.5 text-[13px]">
        <span className="w-28 shrink-0 text-fg-subtle">Provisioned</span>
        <span className="font-medium text-fg">{fmtDate(t.createdAt)}{ageDays != null && <span className="text-fg-subtle"> · {ageDays} days ago</span>}</span>
      </div>

      {/* honest billing block */}
      <div className="mt-2 rounded-[10px] bg-sunken/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-fg-subtle">
        Billing isn’t connected in this prototype — amounts, invoices, MRR and renewal dates aren’t available. “Active” means the workspace is live, not that a subscription is paid.
      </div>
    </Card>
  )
}
