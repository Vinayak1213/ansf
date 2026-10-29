import { motion } from 'motion/react'
import { ArrowUpRight, PauseCircle, Route, Shuffle, Wrench, type LucideIcon } from 'lucide-react'
import { proposeMoves, recoverableThisWeek, type Move } from './engine'
import { ApprovalButton } from './ApprovalDialog'
import { Card } from '@/components/ui'
import { cn, inr } from '@/lib/utils'

/* "This week's moves" — the Spend Steward.
   The agent turns the reconciled leaks into ranked, applyable moves. It LEADS with the money it can
   RECOVER (confirmed, ties to account totals), then the ones worth a review, then a projected efficiency
   move. Confidence is visible: confirmed money reads loud; a likely saving reads as a review, not a promise;
   a projection is never counted as money in hand. You make every call via the approval dialog. */

const ICON: Record<string, LucideIcon> = { 'm-form': Wrench, 'm-pause': PauseCircle, 'm-route': Route, 'm-realloc': Shuffle }

const TONE = {
  confirmed: { ic: 'bg-pos-tint text-pos', amt: 'text-pos' },
  likely: { ic: 'bg-warn-tint text-warn', amt: 'text-warn' },
  estimate: { ic: 'bg-navy-tint text-navy', amt: 'text-navy' },
} as const

export function MovesQueue({ onInvestigate }: { onInvestigate: (key: string) => void }) {
  const moves = proposeMoves()
  const confirmed = moves.filter((m) => m.confidence === 'confirmed')
  const review = moves.filter((m) => m.confidence !== 'confirmed')
  const recoverable = recoverableThisWeek()

  return (
    <Card className="overflow-hidden p-0">
      {/* hero — lead with the reconciled money */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-pos-tint/50 to-transparent px-5 py-4">
        <div>
          <div className="text-[13px] font-semibold text-fg">This week&rsquo;s moves</div>
          <div className="text-[11.5px] text-fg-subtle">{confirmed.length} ready to apply · every ₹ ties to your account totals</div>
        </div>
        <div className="text-right">
          <div className="tnum text-[26px] font-bold leading-none tracking-tight text-pos">{inr(recoverable)}</div>
          <div className="mt-0.5 text-[11px] font-medium text-fg-subtle">recoverable this week</div>
        </div>
      </div>

      {/* confirmed, recoverable moves */}
      <div>
        {confirmed.map((m, i) => <MoveRow key={m.id} m={m} delay={i * 0.05} onInvestigate={onInvestigate} />)}
      </div>

      {/* worth a review — likely savings + projected efficiency, never added to the recoverable total */}
      {review.length > 0 && (
        <>
          <div className="border-t border-line bg-sunken/40 px-5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">Worth a review — not counted above</div>
          <div>{review.map((m, i) => <MoveRow key={m.id} m={m} delay={0.1 + i * 0.05} onInvestigate={onInvestigate} />)}</div>
        </>
      )}
    </Card>
  )
}

function MoveRow({ m, delay, onInvestigate }: { m: Move; delay: number; onInvestigate: (key: string) => void }) {
  const Icon = ICON[m.id] ?? Wrench
  const tone = TONE[m.confidence]
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }} className="flex items-start gap-3 border-t border-line px-5 py-3.5 first:border-t-0">
      <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[9px]', tone.ic)}><Icon className="h-4 w-4" /></span>

      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-fg">{m.title}</div>
        <div className="mt-0.5 text-[11.5px] leading-snug text-fg-subtle">{m.why}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {m.action && <ApprovalButton action={m.action} />}
          <button onClick={() => onInvestigate(m.investigateKey)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-navy transition-colors hover:bg-navy-tint/50">
            {m.action ? 'Why' : 'Review'} <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* the money register — loud for reconciled, quiet for a review, none for a projection */}
      <div className="shrink-0 pt-0.5 text-right">
        {m.confidence === 'confirmed' ? (
          <><div className={cn('tnum text-[16px] font-bold leading-none', tone.amt)}>+{inr(m.recovered!)}</div><div className="mt-0.5 text-[9.5px] font-medium uppercase tracking-wide text-fg-subtle">recoverable</div></>
        ) : m.confidence === 'likely' ? (
          <><div className="tnum text-[13.5px] font-semibold leading-none text-fg-muted">~{inr(m.recovered!)}</div><div className="mt-0.5 text-[9.5px] font-medium uppercase tracking-wide text-fg-subtle">to review</div></>
        ) : (
          <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-semibold text-fg-subtle">projected</span>
        )}
      </div>
    </motion.div>
  )
}
