import { motion } from 'motion/react'
import { useState } from 'react'
import { TrendingUp, TrendingDown, Info, ChevronDown } from 'lucide-react'
import { Card, SectionHead } from '@/components/ui'
import { cn, num } from '@/lib/utils'
import { converterLift, type LiftRow } from '@/data/lift'
import { lexiconOf, useTenant } from '@/lib/tenant'

/* "What converters do differently" — the flagship of the user-level layer. It compares the
   conversion rate of visitors who DID a behaviour vs those who DIDN'T.

   Form: the bar IS the answer. Each row's bar length = the MULTIPLIER (how many × more/less likely
   someone is to convert if they did the behaviour) — not a raw-rate gap. The × leads, the bar ranks
   it, and the two real rates sit underneath for honesty. Grouped Lifts (▲) / Sinks (▼); within each
   group the bar is scaled to that group's strongest factor. The card is the complete view — there is
   no separate drill, because it would only re-draw this same data; the full list expands inline.
   Deterministic, reconciles to the scope's base rate, framed as association (not causation). */

const SHOW_POS = 5
const SHOW_NEG = 4

/** how many times MORE (lift) or LESS (sink) likely, as a plain magnitude ≥ 1 */
function factorOf(lift: number): { x: number; more: boolean } {
  const more = lift >= 1
  const f = more ? lift : lift > 0 ? 1 / lift : 20
  return { x: f >= 9.95 ? Math.round(f) : +f.toFixed(1), more }
}

export function ConverterLift({ pageId }: { pageId?: string }) {
  const { tenant } = useTenant()
  const lex = lexiconOf(tenant)
  const [showAll, setShowAll] = useState(false)
  const data = converterLift(pageId)
  const scoped = !!pageId

  if (data.status !== 'ok') {
    return (
      <Card className="p-5">
        <SectionHead title="What converters do differently" hint={scoped ? 'on this page' : "behaviour × outcome — the one thing your CRM can't see"} />
        <div className="flex items-start gap-2 rounded-[10px] bg-sunken px-3.5 py-3 text-[12.5px] leading-relaxed text-fg-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" />
          <span>{data.reason}</span>
        </div>
      </Card>
    )
  }

  const pos = showAll ? data.pos : data.pos.slice(0, SHOW_POS)
  const neg = showAll ? data.neg : data.neg.slice(0, SHOW_NEG)
  const canExpand = data.pos.length > SHOW_POS || data.neg.length > SHOW_NEG
  const total = data.pos.length + data.neg.length
  const topNeg = data.topNeg ? factorOf(data.topNeg.lift) : null

  return (
    <Card className="p-5">
      <SectionHead
        title="What converters do differently"
        hint={scoped ? 'on this page · behaviour × outcome' : "behaviour × outcome — the one thing your CRM can't see"}
      />
      {data.topPos && topNeg && (
        <p className="mb-4 text-[13px] leading-relaxed text-fg-muted">
          Visitors who <b className="text-fg">{data.topPos.label.toLowerCase()}</b> become {lex.conversion.many} <b className="text-pos">{data.topPos.lift}×</b> as often as those who don't. Visitors who <b className="text-fg">{data.topNeg!.label.toLowerCase()}</b> are <b className="text-neg">{topNeg.x}×</b> less likely.
        </p>
      )}

      <div className="space-y-4">
        {pos.length > 0 && <LiftGroup title="Lifts conversion" dir="pos" rows={pos} />}
        {neg.length > 0 && <LiftGroup title="Sinks conversion" dir="neg" rows={neg} />}
      </div>

      {canExpand && (
        <button onClick={() => setShowAll((s) => !s)} className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-navy transition-colors hover:text-navy-hover">
          {showAll ? 'Show fewer' : `Show all ${total} behaviours`}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', showAll && 'rotate-180')} />
        </button>
      )}

      <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-fg-subtle">
        Each bar is how many times <b className="text-fg-muted">more or less likely</b> a visitor is to convert. Across {num(data.totalVisitors)} visitors ({data.baseRatePct}% average) — an association, not a cause; the lift is modelled in this prototype.
      </p>
    </Card>
  )
}

function LiftGroup({ title, dir, rows }: { title: string; dir: 'pos' | 'neg'; rows: LiftRow[] }) {
  const up = dir === 'pos'
  const Icon = up ? TrendingUp : TrendingDown
  const groupMax = Math.max(...rows.map((r) => factorOf(r.lift).x), 1)
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', up ? 'text-pos' : 'text-neg')} />
        <span className="text-[12px] font-semibold text-fg">{title}</span>
      </div>
      <div>
        {rows.map((r, i) => <FactorBar key={r.k} r={r} groupMax={groupMax} dir={dir} delay={i * 0.05} />)}
      </div>
    </div>
  )
}

/* one behaviour: the × leads, the bar ranks it, the two real rates sit underneath */
function FactorBar({ r, groupMax, dir, delay = 0 }: { r: LiftRow; groupMax: number; dir: 'pos' | 'neg'; delay?: number }) {
  const { x, more } = factorOf(r.lift)
  const up = dir === 'pos'
  const w = Math.max(8, (x / groupMax) * 100)
  return (
    <div className="flex items-center gap-3 py-[7px]">
      {/* the answer */}
      <div className="w-[54px] shrink-0 text-right">
        <div className={cn('tnum text-[16px] font-bold leading-none', up ? 'text-pos' : 'text-neg')}>{x}×</div>
        <div className="mt-0.5 text-[9px] font-medium uppercase leading-none tracking-wide text-fg-subtle">{more ? 'more' : 'less'}</div>
      </div>
      {/* behaviour + the two real rates */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-medium text-fg">{r.label}</div>
        <div className="truncate text-[10.5px] text-fg-subtle">
          {num(r.didN)} did it — {!up && 'only '}<span className="tnum text-fg-muted">{r.didRatePct.toFixed(1)}%</span> of them convert vs <span className="tnum">{r.notRatePct.toFixed(1)}%</span> of the rest
        </div>
      </div>
      {/* the bar = the multiplier */}
      <div className="h-2.5 w-[110px] shrink-0 overflow-hidden rounded-full bg-sunken sm:w-[190px]">
        <motion.i
          className={cn('block h-full rounded-full', up ? 'bg-pos' : 'bg-neg')}
          initial={{ width: 0 }}
          animate={{ width: `${w}%` }}
          transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}
