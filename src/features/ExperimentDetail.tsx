import { Activity, BarChart3, FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { useNav } from '@/lib/nav'
import { useExp } from './experiments/ExperimentsProvider'
import { ExpBehaviorView } from '@/features/behavior/BehaviorView'
import { Badge, Button, Card, Segmented, SectionHead } from '@/components/ui'
import { RingGauge } from '@/components/charts'
import { DivergingBars, ExpOverTimeChart, Matchup, MetricTable, MiniFunnels, FunnelTable, NVarFunnels, NVarOverTimeChart, OverTimeTable, TimingBar, VerdictBadge } from '@/components/expcharts'
import { motion } from 'motion/react'
import { cn, inr, num } from '@/lib/utils'
import { EXPERIMENTS, VERDICT, ecpl, goalVarOf, isNVar, variantCpl } from '@/data/samurai'
import { expPage, readinessPct } from '@/data/experiments'
import { C } from '@/lib/tokens'

const VCOLOR = ['bg-navy', 'bg-brand', 'bg-pos', 'bg-warn', 'bg-fg/60']

const badgeTone: Record<string, string> = { pos: 'bg-pos-tint text-pos', navy: 'bg-navy-tint text-navy', neg: 'bg-neg-tint text-neg', warn: 'bg-warn-tint text-warn', neutral: 'bg-sunken text-fg-muted' }

export function ExperimentDetail({ id }: { id: string }) {
  const { go } = useNav()
  const { openDeclare, openStop } = useExp()
  const e = EXPERIMENTS.find((x) => x.id === id)
  const [view, setView] = useState<{ funnel: 'graph' | 'table'; overtime: 'graph' | 'table'; evidence: 'graph' | 'table' }>({ funnel: 'graph', overtime: 'graph', evidence: 'graph' })
  const [lens, setLens] = useState<'result' | 'behavior'>('result')
  if (!e) return <div className="p-10 text-fg-subtle">Experiment not found.</div>

  const p = expPage(e)
  const cc = ecpl(e.control)
  const vc = ecpl(e.variant)
  const vd = VERDICT[e.verdict]
  const canAct = e.status === 'running' || e.status === 'limited'
  const toggle = (key: 'funnel' | 'overtime' | 'evidence') => (
    <Segmented value={view[key]} onChange={(v) => setView((s) => ({ ...s, [key]: v }))} options={[{ value: 'graph', label: 'Graph' }, { value: 'table', label: 'Table' }]} />
  )

  const head = (
    <>
      <div className="mb-3 flex items-center gap-2 text-[13px] text-fg-muted">
        <button onClick={() => go('experiments')} className="font-medium hover:text-fg">Experiments</button>
        <span className="text-fg-subtle">/</span><span className="text-fg">{e.name}</span>
      </div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">{e.name}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-fg-subtle">
            <span>{p && <>On <b className="text-fg-muted">{p.name}</b> · </>}Goal: {e.goal}</span>
            {e.templateName && <button onClick={() => go('sandbox', e.templateId ?? 'new')} className="inline-flex items-center gap-1 rounded-md border border-line bg-sunken px-1.5 py-0.5 text-[11px] font-medium text-fg-muted transition-colors hover:border-navy/40 hover:text-navy" title="Open the template this test came from"><FlaskConical className="h-3 w-3" /> {e.templateName}</button>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canAct ? (
            <>
              <Button variant="danger" size="md" onClick={() => openStop(e.id)}>Stop test</Button>
              {!isNVar(e) && <Button variant="primary" size="md" onClick={() => openDeclare(e.id)}>Declare a winner</Button>}
            </>
          ) : null}
          <Button variant="default" size="md" onClick={() => go('pagedetail', e.pageId)}>Open the page</Button>
        </div>
      </div>
      <div className="mb-5 inline-flex rounded-[10px] border border-line bg-sunken p-0.5">
        {([['result', 'Result', BarChart3], ['behavior', 'Behaviour', Activity]] as const).map(([v, lbl, Icon]) => (
          <button key={v} onClick={() => setLens(v)} className={cn('inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-[12.5px] font-medium transition-colors', lens === v ? 'bg-panel text-fg shadow-sm' : 'text-fg-subtle hover:text-fg-muted')}>
            <Icon className="h-3.5 w-3.5" />{lbl}
          </button>
        ))}
      </div>
    </>
  )

  if (lens === 'behavior') {
    return (
      <div className="mx-auto max-w-[900px] px-8 py-7">
        {head}
        <ExpBehaviorView e={e} />
      </div>
    )
  }

  // ---- N-variant test (built in the template builder): each variable compared A vs B vs C ----
  if (isNVar(e)) {
    return (
      <div className="mx-auto max-w-[940px] px-8 py-7">
        {head}
        <NVariantResult e={e} />
        <div className="mt-5"><WhyCard e={e} /></div>
      </div>
    )
  }

  // ---- limited ----
  if (e.verdict === 'limited') {
    const rows = [['20%', '~4,400', '~16 months'], ['50%', '~700', '~2.6 months'], ['100%', '~175', '~3 weeks']]
    return (
      <div className="mx-auto max-w-[900px] px-8 py-7">
        {head}
        <Card className="border-warn/25 bg-warn-tint/40 p-5">
          <VerdictBadge e={e} />
          <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">At this page's volume, the chosen goal (<b>{e.goal}</b>) can't reach a reliable verdict in a usable window. That's about the traffic, not your versions.</p>
        </Card>
        <div className="mt-5"><SectionHead title="Why — the arithmetic" /></div>
        <Card className="overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line text-fg-subtle"><tr><th className="px-4 py-2.5 text-left font-medium">Improvement sought</th><th className="px-4 py-2.5 text-right font-medium">Sessions needed / variant</th><th className="px-4 py-2.5 text-right font-medium">At this volume</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r[0]} className="border-b border-line last:border-0"><td className="px-4 py-2.5">{r[0]}</td><td className="px-4 py-2.5 text-right tnum">{r[1]}</td><td className="px-4 py-2.5 text-right tnum font-semibold">{r[2]}</td></tr>)}</tbody>
          </table>
          <div className="border-t border-line bg-surface/60 px-4 py-2.5 text-[11.5px] text-fg-subtle">Only large changes are findable in a sane window — which is why the goal defaults to a micro-conversion.</div>
        </Card>
        <div className="mt-5"><SectionHead title="Your options" /></div>
        <Card>
          {[['1', 'Switch the goal to Apply-Now clicks', 'Decide in about 3 weeks instead of months.'], ['2', 'Test a bigger change', 'A larger swing needs far less traffic to detect.'], ['3', 'Pool with a sibling page', `Combine ${p?.name ?? 'this page'} with a similar programme to raise volume.`]].map((o) => (
            <div key={o[0]} className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-0">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-navy text-[11px] font-bold text-white">{o[0]}</span>
              <div className="flex-1"><b className="text-[13.5px] text-fg">{o[1]}</b><p className="text-[12px] text-fg-subtle">{o[2]}</p></div>
            </div>
          ))}
        </Card>
        <div className="mt-5"><WhyCard e={e} /></div>
      </div>
    )
  }

  // ---- collecting (just launched) ----
  if (cc == null || vc == null) {
    return (
      <div className="mx-auto max-w-[900px] px-8 py-7">
        {head}
        <Card className="p-5">
          <Badge tone="neutral">Collecting</Badge>
          <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">This test is live and splitting traffic evenly. A verdict appears once each version has enough events.</p>
        </Card>
        <div className="mt-5"><GaugesRow e={e} /></div>
        <div className="mt-5"><WhyCard e={e} /></div>
      </div>
    )
  }

  // ---- normal ----
  const better = vc < cc
  const dpct = Math.abs(Math.round(((vc - cc) / cc) * 100))
  const summary = e.verdict === 'nodiff' ? 'No measurable difference between the two versions.'
    : better ? <>Variant B turns ad spend into leads <b className="text-fg">{dpct}% cheaper</b> than the current page.</>
    : <>Variant B is <b className="text-fg">{dpct}% dearer</b> per lead than the current page.</>
  const honesty = (e.verdict === 'best' || e.verdict === 'good') ? `A ${dpct}% gain at this volume is a good bet made in ${e.days} days, not a law of physics — and when there's no difference, this screen says so.`
    : e.verdict === 'low' ? 'Not shipping a worse page is value too.'
    : e.verdict === 'nodiff' ? "A real result — it saved you from shipping a change that wouldn't have paid." : ''

  return (
    <div className="mx-auto max-w-[900px] px-8 py-7">
      {head}
      {/* verdict hero */}
      <Card className="p-5">
        <div className="mb-4"><VerdictBadge e={e} /></div>
        <Matchup e={e} />
        <p className="mt-4 text-[13.5px] leading-relaxed text-fg-muted">{summary}</p>
        {honesty && <p className="mt-2 text-[12px] italic leading-relaxed text-fg-subtle">{honesty}</p>}
      </Card>

      {/* funnel */}
      <div className="mt-5">
        <SectionHead title="Conversion funnel" hint="where each version keeps or loses people" right={toggle('funnel')} />
        <Card className="p-5">{view.funnel === 'table' ? <FunnelTable e={e} /> : <MiniFunnels e={e} />}</Card>
      </div>

      {/* over time */}
      <div className="mt-5">
        <SectionHead title="Cost per lead over the test" hint="how the gap developed" right={toggle('overtime')} />
        <Card className="p-5">
          {view.overtime === 'table' ? <OverTimeTable e={e} /> : (
            <>
              <div className="mb-2 flex flex-wrap gap-5 text-[12px]">
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: C.pos }} /> Variant B · <b className="tnum text-fg">{inr(vc)}</b></span>
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: C.lineStrong }} /> Control · <b className="tnum text-fg">{inr(cc)}</b></span>
              </div>
              <ExpOverTimeChart e={e} height={200} />
            </>
          )}
        </Card>
      </div>

      {/* evidence */}
      <div className="mt-5">
        <SectionHead title="The evidence" hint="control (A) vs variant (B)" right={toggle('evidence')} />
        <Card className="p-5">
          {view.evidence === 'table' ? <MetricTable e={e} /> : <DivergingBars e={e} />}
          <p className="mt-4 border-t border-line pt-3 text-[11.5px] text-fg-subtle">Based on {e.variant.v} vs {e.control.v} visitors over {e.days} days{e.verdict === 'pending' ? ' — still below the reading threshold, so treat direction as provisional.' : '.'}</p>
        </Card>
      </div>

      {/* gauges */}
      <div className="mt-5"><GaugesRow e={e} /></div>

      {/* why + decision */}
      <div className="mt-5"><WhyCard e={e} /></div>
      {e.status === 'ended' && e.decision && (
        <div className="mt-5">
          <SectionHead title="Decision record" />
          <Card>
            {[['Declared by', e.decision.by], ['Date', e.decision.date], ['Reason', e.decision.reason], ['What we learned', e.decision.learned]].map((d) => (
              <div key={d[0]} className="flex items-start justify-between gap-4 border-b border-line px-5 py-3 last:border-0"><span className="text-[12.5px] text-fg-subtle">{d[0]}</span><b className="max-w-[60%] text-right text-[13px] text-fg">{d[1]}</b></div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}

function GaugesRow({ e }: { e: (typeof EXPERIMENTS)[number] }) {
  const rp = readinessPct(e)
  const decideDay = e.status === 'ended' ? e.days : e.estDays ?? (e.verdict === 'pending' ? 20 : 12)
  const pct = Math.min(100, Math.round(((e.days || 0) / decideDay) * 100))
  const cap = e.status === 'ended' ? `Decided on day ${e.days}.` : e.verdict === 'pending' ? `Day ${e.days} — below the reading threshold. Check back around day ${decideDay}.` : `Day ${e.days} of about ${decideDay}. The ${e.goal} reaches a verdict around day ${decideDay}.`
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card className="p-5">
        <SectionHead title="Readiness" hint="evidence collected" />
        <RingGauge value={rp} label={rp >= 100 ? 'Ready to call' : 'Collecting'} sub={rp >= 100 ? 'enough events for this verdict' : 'more events needed'} color={rp >= 100 ? C.pos : C.navy} />
      </Card>
      <Card className="p-5">
        <SectionHead title="Timing" hint="decision clock" />
        <TimingBar pct={pct} caption={cap} />
      </Card>
    </div>
  )
}

/* N-variant results: the leading version by cost-per-goal, then each VARIABLE compared A vs B vs C
   (with the button it maps to on each version). Counts are real from each variant; 0 while collecting. */
function NVariantResult({ e }: { e: (typeof EXPERIMENTS)[number] }) {
  const variants = e.variants ?? []
  const variables = e.variables ?? []
  const goal = goalVarOf(e)
  const goalName = (goal?.name ?? 'lead').toLowerCase()
  const plur = (n: number, w: string) => (n === 1 ? w : /[^aeiou]y$/i.test(w) ? w.slice(0, -1) + 'ies' : w + 's')
  const goalCount = (letter: string) => goal?.arms[letter]?.count ?? 0
  const collecting = !variants.some((v) => goalCount(v.letter) > 0)
  const cplOf = (letter: string) => variantCpl(e, letter)
  const ranked = [...variants].filter((v) => cplOf(v.letter) != null).sort((a, b) => cplOf(a.letter)! - cplOf(b.letter)!)
  const best = ranked[0]

  return (
    <>
      <Card className="p-5">
        {collecting ? (
          <>
            <Badge tone="neutral">Collecting</Badge>
            <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">This test is live and splitting traffic evenly across {variants.length} versions. Each variable below fills in as events come in; the cheapest cost per <b>{goal?.name ?? 'goal'}</b> wins.</p>
          </>
        ) : best ? (
          <>
            <div className="flex items-center gap-2"><span className="rounded-full bg-pos-tint px-2 py-0.5 text-[11px] font-bold uppercase text-pos">Leading</span><b className="text-[15px] text-fg">Version {best.letter} · {best.name}</b></div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">cheapest per <b>{goal?.name}</b> at <b className="text-fg">{inr(cplOf(best.letter)!)}</b> per {goalName}, across {variants.length} versions.</p>
          </>
        ) : null}
      </Card>

      <div className="mt-5">
        <SectionHead title={`Cost per ${goalName} by version`} hint="the decision" />
        <Card className="p-5">
          <div className="space-y-2.5">
            {variants.map((v, i) => {
              const cpl = cplOf(v.letter)
              const cnt = goalCount(v.letter)
              const maxCnt = Math.max(...variants.map((x) => goalCount(x.letter)), 1)
              const isBest = !!best && v.letter === best.letter && !collecting
              return (
                <div key={v.letter}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5"><i className={cn('h-2 w-2 rounded-full', VCOLOR[i % VCOLOR.length])} /><b className="text-fg">Version {v.letter}</b> <span className="text-fg-subtle">{v.name}</span>{isBest && <span className="rounded bg-pos-tint px-1 py-0.5 text-[9px] font-bold uppercase text-pos">Leading</span>}</span>
                    <span className="tnum text-fg-subtle"><b className="text-fg">{num(cnt)}</b> {plur(cnt, goalName)}{cpl != null ? ` · ${inr(cpl)}` : ''}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-sunken"><motion.i className={cn('block h-full rounded-full', VCOLOR[i % VCOLOR.length], isBest ? '' : 'opacity-70')} initial={{ width: 0 }} animate={{ width: `${(cnt / maxCnt) * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} /></div>
                </div>
              )
            })}
          </div>
          <p className="mt-3 border-t border-line pt-3 text-[11px] text-fg-subtle">{num(variants.reduce((s, v) => s + v.v, 0))} visitors across {variants.length} versions over {e.days} day{e.days === 1 ? '' : 's'} — real counts from each version.</p>
        </Card>
      </div>

      {!collecting && (
        <>
          <div className="mt-5">
            <SectionHead title="Conversion by version" hint="share of each version's visitors who reach each action" />
            <Card className="p-5"><NVarFunnels e={e} /></Card>
          </div>
          <div className="mt-5">
            <SectionHead title={`Cost per ${goalName} over the test`} hint="how each version trended" />
            <Card className="p-5">
              <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
                {variants.map((v, i) => {
                  const cpl = cplOf(v.letter)
                  return <span key={v.letter} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: C.series[i % C.series.length] }} /> Version {v.letter}{cpl != null ? <> · <b className="tnum text-fg">{inr(cpl)}</b></> : null}</span>
                })}
              </div>
              <NVarOverTimeChart e={e} height={200} />
            </Card>
          </div>
        </>
      )}

      <div className="mt-5">
        <SectionHead title="Your variables — A vs B vs C" hint="each metric, every version, with the button it maps to" />
        <Card className="p-5">
          <div className="space-y-4">
            {variables.map((vr) => {
              const max = Math.max(...variants.map((v) => vr.arms[v.letter]?.count ?? 0), 1)
              const top = Math.max(...variants.map((v) => vr.arms[v.letter]?.count ?? 0))
              return (
                <div key={vr.id}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <b className="text-[13px] text-fg">{vr.name}</b>
                    {vr.isGoal ? <span className="rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Goal</span> : <span className="rounded bg-sunken px-1.5 py-0.5 text-[9px] font-bold uppercase text-fg-subtle">Signal</span>}
                  </div>
                  <div className="space-y-1.5">
                    {variants.map((v, i) => {
                      const arm = vr.arms[v.letter]
                      const count = arm?.count ?? 0
                      return (
                        <div key={v.letter} className="flex items-center gap-2 text-[12px]">
                          <span className="flex w-20 shrink-0 items-center gap-1.5"><i className={cn('h-2 w-2 shrink-0 rounded-full', VCOLOR[i % VCOLOR.length])} /><b className="text-fg">Version {v.letter}</b></span>
                          <span className="w-32 shrink-0 truncate text-fg-muted" title={arm?.button || undefined}>{arm?.button || <span className="text-fg-subtle">not placed</span>}</span>
                          <div className="h-3 flex-1 overflow-hidden rounded bg-sunken"><motion.i className={cn('block h-full rounded', VCOLOR[i % VCOLOR.length], count === top && top > 0 ? '' : 'opacity-70')} initial={{ width: 0 }} animate={{ width: `${(count / max) * 100}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} /></div>
                          <b className="tnum w-8 shrink-0 text-right text-fg">{num(count)}</b>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-fg-subtle">Each variable is the button you placed on that version — so pages that look nothing alike compare like-for-like. The goal decides; the rest are tracked alongside.{collecting ? ' Counts build as traffic comes in.' : ''}</p>
        </Card>
      </div>

      <div className="mt-5"><GaugesRow e={e} /></div>

      {e.status === 'ended' && e.decision && (
        <div className="mt-5">
          <SectionHead title="Decision record" />
          <Card>
            {[['Declared by', e.decision.by], ['Date', e.decision.date], ['Reason', e.decision.reason], ['What we learned', e.decision.learned]].map((d) => (
              <div key={d[0]} className="flex items-start justify-between gap-4 border-b border-line px-5 py-3 last:border-0"><span className="text-[12.5px] text-fg-subtle">{d[0]}</span><b className="max-w-[60%] text-right text-[13px] text-fg">{d[1]}</b></div>
            ))}
          </Card>
        </div>
      )}
    </>
  )
}

function WhyCard({ e }: { e: (typeof EXPERIMENTS)[number] }) {
  return (
    <div>
      <SectionHead title="Why we ran it" />
      <Card>
        {e.origin && <div className="flex gap-4 border-b border-line px-5 py-3"><span className="w-36 shrink-0 text-[12.5px] text-fg-subtle">Where it came from</span><span className="text-[13px] font-medium text-navy">{e.origin}</span></div>}
        <div className="flex gap-4 px-5 py-3"><span className="w-36 shrink-0 text-[12.5px] text-fg-subtle">Hypothesis</span><span className="text-[13px] text-fg">{e.narrative.hyp}</span></div>
      </Card>
    </div>
  )
}
