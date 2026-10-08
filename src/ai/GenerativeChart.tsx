import { motion } from 'motion/react'
import { AlertTriangle, TrendingDown, Users, Wallet } from 'lucide-react'
import type { ChartSpec } from './engine'
import {
  CplBars,
  CplTrendChart,
  CutList,
  Dumbbell,
  FunnelChain,
  PlatformSplit,
  RingGauge,
  SpendSplitBar,
} from '@/components/charts'
import { LEAKS, QUARTER, dearestPage, pageName, quarterCpl, rankablePages, leakTotal } from '@/data/samurai'
import { inr, num } from '@/lib/utils'
import { C } from '@/lib/tokens'

/** The generative-UI switch: a tool result → a real, animated chart. */
export function GenerativeChart({ spec }: { spec: ChartSpec }) {
  switch (spec.kind) {
    case 'leak':
      return (
        <div>
          <SpendSplitBar />
          <div className="mt-4 divide-y divide-line rounded-[10px] border border-line">
            {LEAKS.map((l) => (
              <div key={l.id} className="flex items-start gap-3 px-3 py-2.5">
                <span
                  className={`mt-0.5 rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${
                    l.severity === 'confirmed' ? 'bg-neg-tint text-neg' : 'bg-warn-tint text-warn'
                  }`}
                >
                  {l.severity}
                </span>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-fg">{pageName(l.page)}</div>
                  <div className="text-[11.5px] text-fg-subtle">{l.detail}</div>
                </div>
                <span className="tnum text-[14px] font-bold text-fg">{inr(l.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )
    case 'chain':
      return <FunnelChain pageId={spec.pageId} />
    case 'pacing':
      return <PacingViz />
    case 'cut':
      return <CutList />
    case 'platform':
      return <PlatformSplit />
    case 'testTargets': {
      const top = [...rankablePages()].sort((a, b) => b.cpl! - a.cpl!).slice(0, 3)
      return <CplBars pages={top} />
    }
    case 'cplTrend':
      return <CplTrendChart height={200} />
    case 'dumbbell':
      return <Dumbbell control={spec.control} variant={spec.variant} aLabel={spec.aLabel} bLabel={spec.bLabel} />
    case 'digest':
      return <DigestViz />
    default:
      return null
  }
}

function PacingViz() {
  const need = QUARTER.target - QUARTER.enrol
  return (
    <div className="flex flex-wrap items-center gap-6">
      <RingGauge value={QUARTER.pctTarget} label={`${QUARTER.enrol} of ${QUARTER.target}`} sub={`${QUARTER.intake} enrolments`} color={C.navy} />
      <div className="min-w-[220px] flex-1">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-sunken">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-navy"
            initial={{ width: 0 }}
            animate={{ width: `${QUARTER.pctTarget}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
          <div className="absolute inset-y-[-3px] w-0.5 bg-fg" style={{ left: `${QUARTER.pctPeriod}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[11.5px] text-fg-muted">
          <span>
            <b className="tnum text-fg">{QUARTER.pctTarget}%</b> of target
          </span>
          <span>
            <b className="tnum text-fg">{QUARTER.pctPeriod}%</b> of quarter elapsed
          </span>
        </div>
        <div className="mt-3 text-[12.5px] text-fg-muted">
          <b className="tnum text-fg">{need}</b> more enrolments needed by {QUARTER.closeDate}.
        </div>
      </div>
    </div>
  )
}

function DigestViz() {
  const p = dearestPage()
  const rows = [
    { icon: TrendingDown, label: `Cost per lead is ${inr(quarterCpl())}`, sub: `Down 14% from last quarter's ${inr(QUARTER.prevCpl)}.` },
    { icon: Users, label: `${QUARTER.enrol} of ${QUARTER.target} ${QUARTER.intake} enrolments`, sub: `${QUARTER.target - QUARTER.enrol} to go, ${QUARTER.pctPeriod}% of the quarter elapsed.` },
    { icon: Wallet, label: `${inr(leakTotal())} leaked last month`, sub: `Biggest: the B.Com form (₹64,300). Dearest page: ${p.name}.` },
  ]
  return (
    <div>
      <div className="mb-4 space-y-2.5">
        {rows.map((r, i) => (
          <motion.div key={i} className="flex items-start gap-3" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-navy-tint">
              <r.icon className="h-4 w-4 text-navy" />
            </span>
            <div>
              <div className="text-[13.5px] font-semibold text-fg">{r.label}</div>
              <div className="text-[12px] text-fg-subtle">{r.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>
      <CplTrendChart height={180} />
    </div>
  )
}

/** small note used by callers that want a grounding line */
export function GroundingNote() {
  return <span className="text-[11.5px] text-fg-subtle">Built from your reconciled data · not a generated guess</span>
}
