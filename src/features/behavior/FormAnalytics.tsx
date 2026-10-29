import { motion } from 'motion/react'
import { TriangleAlert, CircleCheck } from 'lucide-react'
import { Card, SectionHead, InvestigateLink } from '@/components/ui'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useInvestigate } from '@/components/Investigate'
import { cn, num } from '@/lib/utils'
import { formAnalysis, formAnalysisFor, type FormField, type PageBehavior } from '@/data/behavior'
import type { Page } from '@/data/samurai'

const fmtSec = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`)

/* Field-level form analytics for the Behaviour page. The on-page journey funnel above stops at the
   form ("Form started" → "Submitted"); this zooms INSIDE it so a marketer sees which field loses the
   lead. Deterministic + reconciling: Completed = the page's leads. Headline names the one field to
   fix (Zuko's "biggest gap vs the rest"); the full Fields Overview table lives behind Investigate. */
export function FormAnalytics({ p, beh }: { p: Page; beh: PageBehavior }) {
  const investigate = useInvestigate()
  const fa = formAnalysis(p, beh)
  const { started, completed, completionPct, totalAbandons, fields, killerK, status, deviceCause, avgFillSec, failedSubmits } = fa
  const totalCorrections = fields.reduce((a, f) => a + f.corrections, 0)
  const killer = fields.find((f) => f.k === killerK)
  const submit = fields.find((f) => f.k === 'submit')

  const drill = () =>
    investigate({
      title: `Form analytics — ${fa.name}`,
      definition: `A field-by-field breakdown for ${p.name}. Reached: visitors who got to the field. Drop: visitors who left the form here. Hesitate: time before they start typing. Fill: active time in the field. Corrections: values re-typed. Blank: left empty at submit. Measured from field interaction events only — we never capture what's typed.`,
      columns: [
        { key: 'f', label: 'Field' },
        { key: 'reached', label: 'Reached', align: 'right' },
        { key: 'drop', label: 'Drop', align: 'right' },
        { key: 'hes', label: 'Hesitate', align: 'right' },
        { key: 'time', label: 'Fill', align: 'right' },
        { key: 'corr', label: 'Corrections', align: 'right' },
        { key: 'err', label: 'Errors', align: 'right' },
        { key: 'blank', label: 'Blank', align: 'right' },
      ],
      rows: fields.map((f) => ({
        f: f.k === killerK ? `${f.label} · fix first` : f.label,
        reached: num(f.reached),
        drop: f.dropped ? `${num(f.dropped)} · ${f.dropPct}%` : '—',
        hes: f.kind === 'submit' ? '—' : fmtSec(f.hesitationSec),
        time: fmtSec(f.medianSec),
        corr: f.corrections ? `${num(f.corrections)} · ${f.correctionPct}%` : '—',
        err: f.errors ? num(f.errors) : '—',
        blank: f.kind === 'submit' ? '—' : `${f.blankPct}%`,
      })),
      foot: { f: 'Started → Completed', reached: num(started), drop: `${num(totalAbandons)} lost`, hes: '', time: fmtSec(avgFillSec), corr: '', err: '', blank: `${num(completed)} leads` },
      note: `Completed (${num(completed)}) matches this page's lead count, and the field drops add up to started minus completed — so the form reconciles with your account totals. Visitors who reached the form but never started are shown in On-page journey above.`,
    })

  const pct = (n: number) => (started ? Math.max(0, Math.min(100, (n / started) * 100)) : 0)
  const showFunnel = status === 'ok' || status === 'broken' || status === 'closed'

  return (
    <div>
      <SectionHead
        title="Form analytics"
        hint="where the enquiry form loses leads, field by field"
        right={status === 'insufficient' ? undefined : <InvestigateLink onClick={drill} />}
      />
      <Card className="p-5">
        {/* form-level KPI strip — the overview before the field detail */}
        {status !== 'insufficient' && (
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Kpi value={`${completionPct}%`} label="completion rate" />
            <Kpi value={fmtSec(avgFillSec)} label="avg. fill time" />
            <Kpi value={num(totalCorrections)} label="corrections" />
            <Kpi value={num(failedSubmits)} label="failed submits" tone={status === 'broken' && failedSubmits > 0 ? 'neg' : undefined} />
          </div>
        )}

        {/* headline verdict — the one thing to do */}
        {status === 'insufficient' ? (
          <p className="text-[13px] leading-relaxed text-fg-muted">
            Not enough form activity yet — only <b className="text-fg">{num(started)}</b> {started === 1 ? 'start' : 'starts'} in this period. The field breakdown appears as more visitors start the form.
          </p>
        ) : status === 'broken' ? (
          <div className="flex items-start gap-2 rounded-[10px] bg-neg-tint/60 px-3 py-2.5 text-[12.5px] leading-relaxed text-fg">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-neg" />
            <span>
              <b className="text-neg">This form is failing at submit.</b> {submit && <><b>{num(submit.reached)}</b> visitors reached Submit but only <b>{num(completed)}</b> completed</>}
              {deviceCause ? <> — {deviceCause}.</> : '.'} The drop-off below is concentrated on the submit step.
            </span>
          </div>
        ) : status === 'closed' ? (
          <div className="flex items-start gap-2 rounded-[10px] bg-warn-tint/50 px-3 py-2.5 text-[12.5px] leading-relaxed text-fg">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            <span>
              <b>Intake is closed.</b> Only {num(completed)} of {num(started)} visitors who started the form converted — the issue is the offer, not the form. Pause spend on this page rather than editing fields.
            </span>
          </div>
        ) : killer ? (
          <div className="flex items-start gap-2 rounded-[10px] bg-warn-tint/50 px-3 py-2.5 text-[12.5px] leading-relaxed text-fg">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            <span>
              <b className="text-fg">{killer.label}</b> loses the most leads — <b>{num(killer.dropped)}</b> of {num(killer.reached)} visitors who reached it left (<b>{killer.dropPct}%</b>). Start here.
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-[10px] bg-pos-tint/50 px-3 py-2.5 text-[12.5px] leading-relaxed text-fg">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-pos" />
            <span>This form converts well at <b>{completionPct}%</b> — no single field stands out.</span>
          </div>
        )}

        {/* the field drop-off funnel — reached narrows down the form; red is where each field leaks */}
        {showFunnel && (
          <>
            <Tooltip.Provider delayDuration={60} skipDelayDuration={300}>
              <div className="mt-4 space-y-2.5">
                {fields.map((f, i) => {
                  const kept = Math.max(0, f.reached - f.dropped)
                  const isKiller = f.k === killerK
                  return (
                    <Tooltip.Root key={f.k}>
                      <Tooltip.Trigger asChild>
                        <div tabIndex={0} aria-label={`${f.label}: ${num(f.reached)} reached${f.dropped ? `, ${num(f.dropped)} dropped (${f.dropPct}%)` : ''}`} className="group cursor-default rounded-md outline-none focus-visible:ring-2 focus-visible:ring-navy/40">
                          <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className={cn('truncate transition-colors', isKiller ? 'font-semibold text-fg' : 'text-fg-muted group-hover:text-fg')}>{f.label}</span>
                              {isKiller && <span className="shrink-0 rounded bg-neg-tint px-1 py-0.5 text-[9px] font-bold uppercase text-neg">Fix first</span>}
                            </span>
                            <span className="tnum shrink-0 text-fg-subtle">
                              {num(f.reached)} reached
                              {f.dropped > 0 && <span className="text-neg"> · −{num(f.dropped)} ({f.dropPct}%)</span>}
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-sunken transition-[height] duration-200 ease-out group-hover:h-[14px] group-focus-visible:h-[14px] motion-reduce:transition-none">
                            <motion.div className="flex h-full" initial={{ width: 0 }} animate={{ width: `${pct(f.reached)}%` }} transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}>
                              <div className="h-full bg-navy" style={{ flexGrow: kept }} />
                              {f.dropped > 0 && <div className={cn('h-full transition-colors', isKiller ? 'bg-neg' : 'bg-neg/55 group-hover:bg-neg/80')} style={{ flexGrow: f.dropped }} />}
                            </motion.div>
                          </div>
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content side="top" align="center" sideOffset={6} collisionPadding={12} className="z-[60] max-w-[250px] rounded-[10px] border border-line bg-panel px-3 py-2.5 shadow-lg">
                          <FieldTip f={f} isKiller={isKiller} />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  )
                })}
                {/* completed = leads (reconciles) */}
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <div tabIndex={0} aria-label={`Completed: ${num(completed)} leads, ${completionPct}% of starters`} className="group cursor-default rounded-md outline-none focus-visible:ring-2 focus-visible:ring-navy/40">
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-pos">Completed</span>
                        <span className="tnum text-fg-subtle">{num(completed)} leads · {completionPct}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-sunken transition-[height] duration-200 ease-out group-hover:h-[14px] group-focus-visible:h-[14px] motion-reduce:transition-none">
                        <motion.i className="block h-full rounded-full bg-pos" initial={{ width: 0 }} animate={{ width: `${pct(completed)}%` }} transition={{ duration: 0.7, delay: fields.length * 0.05, ease: [0.22, 1, 0.36, 1] }} />
                      </div>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content side="top" sideOffset={6} collisionPadding={12} className="z-[60] rounded-[10px] border border-line bg-panel px-3 py-2.5 text-[12px] leading-relaxed shadow-lg">
                      <div className="mb-1.5 font-semibold text-pos">Completed</div>
                      <ul className="list-disc space-y-0.5 pl-4 text-fg-muted marker:text-fg-subtle">
                        <li>Leads: <span className="tnum text-fg">{num(completed)}</span></li>
                        <li>Completion: <span className="tnum text-fg">{completionPct}% of {num(started)} who started</span></li>
                      </ul>
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </div>
            </Tooltip.Provider>
            <p className="mt-3.5 border-t border-line pt-3 text-[11.5px] leading-relaxed text-fg-subtle">
              <b className="text-fg-muted">{num(started)}</b> visitors started the form and <b className="text-fg-muted">{num(completed)}</b> submitted ({completionPct}%). The dark bar is visitors who continued; red is where each field loses them. Completed matches this page's lead count.
            </p>
          </>
        )}
      </Card>
    </div>
  )
}

function Kpi({ value, label, tone }: { value: string; label: string; tone?: 'warn' | 'neg' }) {
  return (
    <div className="rounded-[10px] bg-sunken px-3 py-2">
      <div className={cn('tnum text-[16px] font-bold leading-none', tone === 'neg' ? 'text-neg' : tone === 'warn' ? 'text-warn' : 'text-fg')}>{value}</div>
      <div className="mt-1 text-[10.5px] leading-tight text-fg-subtle">{label}</div>
    </div>
  )
}

/* Hover/focus card for a form field — just the field's drop story (the funnel's subject).
   The full diagnostics (time, corrections, errors, blank) live in Investigate, so this stays light. */
function FieldTip({ f, isKiller }: { f: FormField; isKiller: boolean }) {
  return (
    <div className="text-[12px] leading-relaxed">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="font-semibold text-fg">{f.label}</span>
        {isKiller && <span className="rounded bg-neg-tint px-1 py-0.5 text-[9px] font-bold uppercase text-neg">Fix first</span>}
      </div>
      <ul className="list-disc space-y-0.5 pl-4 text-fg-muted marker:text-fg-subtle">
        <li>Reached: <span className="tnum text-fg">{num(f.reached)} visitors</span></li>
        {f.dropped > 0 ? (
          <>
            <li>Dropped here: <span className="tnum text-neg">{num(f.dropped)} ({f.dropPct}%)</span></li>
            <li>Share of total drop-off: <span className="tnum text-fg">{f.shareOfAbandons}%</span></li>
          </>
        ) : (
          <li>Dropped here: <span className="text-fg">none — all continued</span></li>
        )}
      </ul>
    </div>
  )
}

/* Per-variant form funnel for the Experiments Behaviour tab — the same field-level analysis, one
   compact funnel per version, each reconciling to that variant's own leads (the Result tab). Shows
   which field a version fixed or broke. Full per-field detail is in the Investigate drill. */
export function FormFunnelCompare({ arms, hint }: { arms: { letter: string; name: string; page: Page; started: number; completed: number }[]; hint?: string }) {
  const investigate = useInvestigate()
  const data = arms.map((a) => ({ ...a, fa: formAnalysisFor(a.page, a.started, a.completed) }))
  if (!data.some((d) => d.fa.status === 'ok' || d.fa.status === 'broken')) return null

  const drill = () =>
    investigate({
      title: 'Form analytics — by version',
      definition: 'Each version’s enquiry form, field by field. Reached: visitors who got to the field. Drop: visitors who left there. Each version reconciles to its own lead count on the Result tab.',
      columns: [
        { key: 'v', label: 'Version' },
        { key: 'f', label: 'Field' },
        { key: 'reached', label: 'Reached', align: 'right' },
        { key: 'drop', label: 'Drop', align: 'right' },
        { key: 'time', label: 'Median', align: 'right' },
      ],
      rows: data.flatMap((d) =>
        d.fa.fields.map((f, i) => ({
          v: i === 0 ? `${d.letter} · ${d.name}` : '',
          f: f.k === d.fa.killerK ? `${f.label} · fix first` : f.label,
          reached: num(f.reached),
          drop: f.dropped ? `${num(f.dropped)} · ${f.dropPct}%` : '—',
          time: fmtSec(f.medianSec),
        })),
      ),
      note: 'Each version’s Completed matches its lead count on the Result tab. A page’s full form breakdown is on that page’s Behaviour tab.',
    })

  return (
    <div>
      <SectionHead title="Form analytics — by version" hint={hint ?? 'which field each version loses leads on'} right={<InvestigateLink onClick={drill} />} />
      <Card className="p-5">
        <div className="space-y-5">
          {data.map((d) => {
            const fa = d.fa
            const killer = fa.fields.find((f) => f.k === fa.killerK)
            const pct = (n: number) => (fa.started ? Math.max(0, Math.min(100, (n / fa.started) * 100)) : 0)
            return (
              <div key={d.letter}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px]">
                  <span className="flex min-w-0 items-center gap-2">
                    <b className="shrink-0 text-fg">Version {d.letter}</b>
                    <span className="truncate text-fg-subtle">{d.name}</span>
                  </span>
                  <span className="tnum shrink-0 text-fg-subtle">{num(fa.started)} started → {num(fa.completed)} leads · {fa.completionPct}%</span>
                </div>
                {fa.status === 'insufficient' ? (
                  <p className="text-[11.5px] text-fg-subtle">Not enough form activity on this version yet.</p>
                ) : (
                  <>
                    <div className="mb-2 text-[11.5px] leading-relaxed text-fg-muted">
                      {fa.status === 'broken' ? (
                        <span className="text-neg"><b>Failing at submit</b>{fa.deviceCause ? ` — ${fa.deviceCause}` : ''}.</span>
                      ) : killer ? (
                        <span><b className="text-fg">{killer.label}</b> loses the most — {killer.dropPct}% of visitors who reach it.</span>
                      ) : (
                        <span className="text-pos">Converts well — no single field stands out.</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {fa.fields.map((f) => {
                        const kept = Math.max(0, f.reached - f.dropped)
                        const isK = f.k === fa.killerK
                        return (
                          <div key={f.k} className="flex items-center gap-2.5">
                            <span className="w-[104px] shrink-0 truncate text-[11px] text-fg-subtle">{f.label}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                              <motion.div className="flex h-full" initial={{ width: 0 }} animate={{ width: `${pct(f.reached)}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                                <div className="h-full bg-navy" style={{ flexGrow: kept }} />
                                {f.dropped > 0 && <div className={cn('h-full', isK ? 'bg-neg' : 'bg-neg/55')} style={{ flexGrow: f.dropped }} />}
                              </motion.div>
                            </div>
                            <span className="tnum w-[56px] shrink-0 text-right text-[10.5px] text-fg-subtle">{f.dropped > 0 ? `−${num(f.dropped)}` : '·'}</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-3.5 border-t border-line pt-3 text-[11.5px] leading-relaxed text-fg-subtle">Each version’s form funnel, reconciled to its own lead count. The dark bar is visitors who continued; red is where each field loses them — compare which field a version fixed or broke.</p>
      </Card>
    </div>
  )
}
