import { AnimatePresence, motion } from 'motion/react'
import { Brain, ChevronDown, Database, FilePlus2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Insight } from './engine'
import { GenerativeChart } from './GenerativeChart'
import { ApprovalButton } from './ApprovalDialog'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

/** parse a **bold** markdown-ish string into React nodes */
function rich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) =>
    seg.startsWith('**') ? (
      <strong key={i} className="font-semibold text-fg">
        {seg.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{seg}</span>
    ),
  )
}

/** queued state — request in flight, no tokens yet: a subtle shimmer, never a fake progress bar */
function QueuedShimmer() {
  return (
    <div className="mb-2 space-y-2">
      <div className="flex items-center gap-2 text-[12.5px] text-fg-muted">
        <motion.span className="h-1.5 w-1.5 rounded-full bg-navy" animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />
        Reading your reconciled data…
      </div>
      <div className="space-y-1.5">
        {[92, 78, 64].map((w, i) => (
          <div key={i} className="h-2.5 overflow-hidden rounded bg-sunken" style={{ width: `${w}%` }}>
            <motion.div className="h-full w-1/3 bg-gradient-to-r from-transparent via-line-strong/70 to-transparent" animate={{ x: ['-120%', '340%'] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.14, ease: 'linear' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AiOrb({ className }: { className?: string }) {
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-navy to-[#2a4a78] shadow-sm', className)}>
      <Sparkles className="h-1/2 w-1/2 text-white" />
    </span>
  )
}

export function AnswerCard({
  insight,
  live,
  onAddToReport,
}: {
  insight: Insight
  live: boolean
  onAddToReport?: (key: string) => void
}) {
  const [steps, setSteps] = useState(live ? 0 : insight.reasoning.length)
  const [done, setDone] = useState(!live)
  const [openReasoning, setOpenReasoning] = useState(false)

  useEffect(() => {
    if (!live) return
    let i = 0
    const timers: number[] = []
    const tick = () => {
      i += 1
      setSteps(i)
      if (i < insight.reasoning.length) {
        timers.push(window.setTimeout(tick, 480))
      } else {
        timers.push(window.setTimeout(() => setDone(true), 420))
      }
    }
    timers.push(window.setTimeout(tick, 620))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex gap-3">
      <AiOrb className="mt-0.5 h-8 w-8" />
      <div className="min-w-0 flex-1">
        {/* Reasoning */}
        {!done ? (
          steps === 0 ? (
            <QueuedShimmer />
          ) : (
          <div className="mb-2 space-y-1.5">
            <AnimatePresence mode="popLayout">
              {insight.reasoning.slice(0, steps).map((r, i) => (
                <motion.div
                  key={r}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: i === steps - 1 ? 1 : 0.5, y: 0 }}
                  className="flex items-center gap-2 text-[12.5px] text-fg-muted"
                >
                  {i === steps - 1 ? (
                    <motion.span className="h-1.5 w-1.5 rounded-full bg-navy" animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                  ) : (
                    <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-pos-tint text-[9px] text-pos">✓</span>
                  )}
                  {r}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          )
        ) : (
          <button
            onClick={() => setOpenReasoning((v) => !v)}
            className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-sunken px-2.5 py-1 text-[11.5px] text-fg-muted transition-colors hover:text-fg"
          >
            <Brain className="h-3 w-3 text-navy" />
            Reasoned over {insight.sources.length} sources
            <ChevronDown className={cn('h-3 w-3 transition-transform', openReasoning && 'rotate-180')} />
          </button>
        )}

        <AnimatePresence>
          {done && openReasoning && (
            <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-2 space-y-1 overflow-hidden pl-1 text-[12px] text-fg-subtle">
              {insight.reasoning.map((r) => (
                <li key={r} className="flex items-center gap-2">
                  <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-pos-tint text-[9px] text-pos">✓</span>
                  {r}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {/* Answer */}
        <AnimatePresence>
          {done && (
            <motion.div
              initial={live ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-panel shadow-sm"
            >
              <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
                <h3 className="flex-1 text-[15px] font-semibold tracking-tight text-fg">{insight.headline}</h3>
                <span className="rounded-md border border-navy/15 bg-navy-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">Samurai AI</span>
              </div>

              <div className="space-y-3 px-4 py-3.5">
                {insight.narrative.map((para, i) => (
                  <p key={i} className="text-[13.5px] leading-relaxed text-fg-muted">
                    {rich(para)}
                  </p>
                ))}

                <div className="pt-1">
                  <GenerativeChart spec={insight.chart} />
                </div>

                {insight.caveat && (
                  <p className="border-l-2 border-warn/40 bg-warn-tint/40 py-1.5 pl-3 text-[12.5px] italic leading-relaxed text-fg-muted">
                    {insight.caveat}
                  </p>
                )}

                <div className="rounded-[10px] border border-navy/12 bg-navy-tint/60 px-3.5 py-3">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-navy">Recommended</div>
                  <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-fg-muted marker:text-navy/50">
                    {insight.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                  {insight.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {insight.actions.map((a) => (
                        <ApprovalButton key={a.kind + (a.pageId ?? '')} action={a} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface/60 px-4 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
                  <Database className="h-3 w-3" />
                  Built from your reconciled data · not a generated guess
                </span>
                {onAddToReport && (
                  <Button variant="default" size="sm" className="ml-auto" onClick={() => onAddToReport(insight.key)}>
                    <FilePlus2 className="h-3.5 w-3.5" />
                    Add to report
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
