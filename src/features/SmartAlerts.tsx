import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, FlaskConical, Megaphone, ScrollText, ShieldCheck, Target, TriangleAlert } from 'lucide-react'
import { Card } from '@/components/ui'
import { useNav } from '@/lib/nav'
import { cn, inr } from '@/lib/utils'
import { ALERTS, WATCHED, confirmedBleedTotal, flaggedTotal, type Alert, type Dimension, type Severity } from '@/data/alerts'

const DIM: Record<Dimension, { icon: typeof Megaphone; label: string }> = {
  campaign: { icon: Megaphone, label: 'Campaign' },
  page: { icon: ScrollText, label: 'Page' },
  experiment: { icon: FlaskConical, label: 'Test' },
  intake: { icon: Target, label: 'Intake' },
}

const SEV: Record<Severity, { label: string; rail: string; chip: string; dot: string }> = {
  critical: { label: 'Critical', rail: 'bg-neg', chip: 'bg-neg-tint text-neg', dot: 'bg-neg' },
  warning: { label: 'Warning', rail: 'bg-warn', chip: 'bg-warn-tint text-warn', dot: 'bg-warn' },
  watch: { label: 'Watch', rail: 'bg-navy', chip: 'bg-navy-tint text-navy', dot: 'bg-navy' },
}

const stagger = { animate: { transition: { staggerChildren: 0.05 } } }
const rise = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } }

type Filter = 'all' | Dimension

export function SmartAlerts() {
  const [filter, setFilter] = useState<Filter>('all')
  const shown = useMemo(() => (filter === 'all' ? ALERTS : ALERTS.filter((a) => a.dimension === filter)), [filter])

  const crit = ALERTS.filter((a) => a.severity === 'critical').length
  const warn = ALERTS.filter((a) => a.severity === 'warning').length
  const watch = ALERTS.filter((a) => a.severity === 'watch').length

  const FILTERS: { key: Filter; label: string; n: number }[] = [
    { key: 'all', label: 'All', n: ALERTS.length },
    { key: 'campaign', label: 'Campaigns', n: ALERTS.filter((a) => a.dimension === 'campaign').length },
    { key: 'page', label: 'Pages', n: ALERTS.filter((a) => a.dimension === 'page').length },
    { key: 'experiment', label: 'Tests', n: ALERTS.filter((a) => a.dimension === 'experiment').length },
    { key: 'intake', label: 'Intake', n: ALERTS.filter((a) => a.dimension === 'intake').length },
  ]

  return (
    <div className="mx-auto max-w-[920px] px-8 py-7">
      {/* header */}
      <div className="mb-1 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-neg text-white"><TriangleAlert className="h-3.5 w-3.5" /></span>
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">Smart Alerts</h1>
      </div>
      <p className="mb-5 max-w-[78ch] text-[13px] leading-relaxed text-fg-subtle">
        What needs attention now, across <b className="text-fg-muted">campaigns, pages, live tests and intake pacing</b> — ranked by money at stake. Every alert is a <b className="text-fg-muted">deterministic rule or statistic</b> on your reconciled data and shows its own math. No AI, no guesswork; nothing fires where the signal isn't there.
      </p>

      {/* summary strip */}
      <Card className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
        <Stat value={inr(flaggedTotal())} label="flagged" tone="fg" />
        <span className="h-8 w-px bg-line" />
        <Stat value={inr(confirmedBleedTotal())} label="confirmed bleed" tone="neg" />
        <div className="ml-auto flex items-center gap-4 text-[12px]">
          <Count n={crit} label="critical" dot="bg-neg" />
          <Count n={warn} label="warning" dot="bg-warn" />
          <Count n={watch} label="watch" dot="bg-navy" />
        </div>
      </Card>

      {/* filters */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors',
              filter === f.key ? 'border-navy/20 bg-navy-tint text-navy' : 'border-line bg-surface text-fg-muted hover:bg-sunken',
            )}
          >
            {f.label}
            <span className={cn('tnum rounded-full px-1.5 text-[10.5px] font-semibold', filter === f.key ? 'bg-navy/10' : 'bg-sunken text-fg-subtle')}>{f.n}</span>
          </button>
        ))}
      </div>

      {/* feed */}
      {shown.length === 0 ? (
        <Card className="flex items-center gap-3 p-6">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-pos-tint text-pos"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <div className="text-[14px] font-semibold text-fg">Nothing flagged here</div>
            <div className="text-[12.5px] text-fg-subtle">No rule or threshold has crossed for this filter.</div>
          </div>
        </Card>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
          {shown.map((a) => (
            <motion.div key={a.id} variants={rise}>
              <AlertCard alert={a} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* what's watched + how it works */}
      <div className="mt-6 rounded-[12px] border border-line bg-surface/50 px-4 py-3 text-[11.5px] leading-relaxed text-fg-subtle">
        <b className="text-fg-muted">Watching</b> {WATCHED.campaigns} campaigns · {WATCHED.pages} pages · {WATCHED.liveTests} live tests · {' '}
        January intake pacing. Detection is deterministic — rules and cross-sectional statistics over already-reconciled spend, leads and CPL (plus the leak and fault model), never an AI estimate. Flagged money reconciles to your account's leak totals.
      </div>
    </div>
  )
}

function AlertCard({ alert: a }: { alert: Alert }) {
  const { go } = useNav()
  const sev = SEV[a.severity]
  const Dim = DIM[a.dimension]
  const DimIcon = Dim.icon
  const drillLabel = a.dimension === 'campaign' ? 'View campaign' : a.dimension === 'page' ? 'View page' : a.dimension === 'experiment' ? 'Open test' : 'See pacing'

  return (
    <Card className="flex overflow-hidden p-0">
      <div className={cn('w-1 shrink-0', sev.rail)} />
      <div className="min-w-0 flex-1 p-4">
        {/* top line */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', sev.chip)}>
            {a.severity === 'critical' && <TriangleAlert className="h-3 w-3" />}{sev.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-fg-subtle"><DimIcon className="h-3.5 w-3.5" />{Dim.label}</span>
          {a.atStake > 0 && (
            <span className="ml-auto text-right">
              <span className="tnum text-[15px] font-bold text-fg">{inr(a.atStake)}</span>
              {a.atStakeLabel && <span className="ml-1 text-[10.5px] text-fg-subtle">{a.atStakeLabel}</span>}
            </span>
          )}
        </div>

        {/* title */}
        <div className="mt-1.5 text-[14px] font-semibold leading-snug text-fg">{a.title}</div>

        {/* observed vs baseline */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-fg-subtle">{a.metric}</span>
          <span className={cn('tnum rounded-md px-1.5 py-0.5 font-semibold', sev.chip)}>{a.observed}</span>
          {a.baseline && (
            <>
              <span className="text-fg-subtle">vs</span>
              <span className="tnum rounded-md bg-sunken px-1.5 py-0.5 font-medium text-fg-muted">{a.baseline}</span>
            </>
          )}
        </div>

        {/* the math — auditable */}
        <p className="mt-2.5 border-l-2 border-line pl-2.5 text-[12.5px] leading-relaxed text-fg-muted">{a.why}</p>

        {/* action + drill + rule */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[12.5px] text-fg"><b className="font-semibold text-fg-muted">Do:</b> {a.action}</span>
          {a.ref && (
            <button
              onClick={() => go(a.ref!.route, a.ref!.id)}
              className="inline-flex items-center gap-1 rounded-[8px] border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-navy transition-colors hover:border-line-strong hover:bg-sunken"
            >
              {drillLabel} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-medium text-fg-subtle" title="The deterministic rule that fired">
            <span className="h-1 w-1 rounded-full bg-fg-subtle" />{a.rule}
          </span>
        </div>
      </div>
    </Card>
  )
}

function Stat({ value, label, tone }: { value: string; label: string; tone: 'fg' | 'neg' }) {
  return (
    <div>
      <div className={cn('tnum text-[22px] font-bold leading-none tracking-tight', tone === 'neg' ? 'text-neg' : 'text-fg')}>{value}</div>
      <div className="mt-1 text-[11px] text-fg-subtle">{label}</div>
    </div>
  )
}

function Count({ n, label, dot }: { n: number; label: string; dot: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-fg-muted">
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      <b className="tnum font-semibold text-fg">{n}</b> {label}
    </span>
  )
}
