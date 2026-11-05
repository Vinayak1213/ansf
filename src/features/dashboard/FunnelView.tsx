import { Fragment } from 'react'
import { ArrowRight, Database, MousePointerClick, Wallet } from 'lucide-react'
import { cn, inrCompact, num } from '@/lib/utils'
import { useRange } from '@/lib/range'
import { useTenant, type Tenant } from '@/lib/tenant'
import type { Page } from '@/data/samurai'
import { resolveFunnel, SOURCE_LABEL, type FunnelCtx, type FunnelDef, type ResolvedStep, type StepSource } from '@/data/funnels'

/* The funnel as a horizontal chain of source-tagged nodes. Reused by the dashboard widget and the
   editor preview. Honest about provenance: a stage with no connected source reads "connect …" /
   "awaiting sync" rather than a fabricated number. */

const SRC_ICON: Record<StepSource, typeof Wallet> = { ad: Wallet, tag: MousePointerClick, crm: Database, finance: Database }

export function connCtx(p: Page, tenant: Tenant): FunnelCtx {
  const has = (re: RegExp) => !!tenant.conns?.some((c) => re.test(c))
  return {
    p,
    adsConnected: has(/ads/i),
    tagConnected: has(/clarity|tag|hotjar|behaviou?r/i),
    crmConnected: has(/crm|hubspot|salesforce|zoho|superleap/i),
  }
}

export function FunnelView({ p, def }: { p: Page; def: FunnelDef }) {
  const { tenant } = useTenant()
  const { factor: f } = useRange()
  const steps = resolveFunnel(def, connCtx(p, tenant))
  return <ChainRow steps={steps} f={f} />
}

export function ChainRow({ steps, f }: { steps: ResolvedStep[]; f: number }) {
  if (steps.length === 0) return <div className="rounded-[10px] bg-sunken px-3 py-5 text-center text-[12.5px] text-fg-subtle">No stages yet — add some in the editor.</div>
  return (
    <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <Fragment key={s.id + i}>
          <StepNode s={s} f={f} final={i === steps.length - 1} />
          {i < steps.length - 1 && <Connector from={steps[i]} to={steps[i + 1]} />}
        </Fragment>
      ))}
    </div>
  )
}

function StepNode({ s, f, final }: { s: ResolvedStep; f: number; final: boolean }) {
  const Icon = SRC_ICON[s.source]
  const ok = s.status === 'ok'
  const val = s.value == null ? 0 : Math.round(s.value * f)
  return (
    <div className={cn('min-w-[112px] shrink-0 rounded-[11px] border px-3 py-2.5 text-center', ok ? (final ? 'border-pos/30 bg-pos-tint/40' : 'border-line bg-sunken') : 'border-dashed border-line-strong bg-surface/40')}>
      <div className="flex items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-fg-subtle"><Icon className="h-3 w-3" />{SOURCE_LABEL[s.source]}</div>
      {ok
        ? <div className={cn('mt-1 text-[16px] font-bold leading-none tnum', final ? 'text-pos' : 'text-fg')}>{s.money ? inrCompact(val) : num(val)}</div>
        : <div className="mt-1 text-[16px] font-bold leading-none text-fg-subtle">—</div>}
      <div className="mt-1 max-w-[120px] truncate text-[11px] text-fg">{s.label}</div>
      {s.status === 'disconnected' && <div className="mt-1 inline-block rounded bg-navy-tint px-1.5 py-0.5 text-[9px] font-semibold text-navy">Connect {SOURCE_LABEL[s.source]}</div>}
      {s.status === 'awaiting' && <div className="mt-1 inline-block rounded bg-warn-tint px-1.5 py-0.5 text-[9px] font-semibold text-warn">Awaiting sync</div>}
    </div>
  )
}

function Connector({ from, to }: { from: ResolvedStep; to: ResolvedStep }) {
  const pct = from.status === 'ok' && to.status === 'ok' && !from.money && !to.money && (from.value ?? 0) > 0
    ? Math.round(((to.value ?? 0) / (from.value ?? 1)) * 100)
    : null
  return (
    <div className="flex shrink-0 flex-col items-center justify-center px-0.5">
      <ArrowRight className="h-3.5 w-3.5 text-fg-subtle" />
      {pct != null && <span className="mt-0.5 text-[9px] tnum text-fg-subtle">{pct}%</span>}
    </div>
  )
}
