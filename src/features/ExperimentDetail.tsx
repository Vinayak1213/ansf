import { Activity, BarChart3, Clock, FlaskConical, Rocket } from 'lucide-react'
import { useState } from 'react'
import { useNav } from '@/lib/nav'
import { useExp } from './experiments/ExperimentsProvider'
import { ExpBehaviorView } from '@/features/behavior/BehaviorView'
import { Badge, Button, Card, InvestigateLink, Segmented, SectionHead } from '@/components/ui'
import { useInvestigate } from '@/components/Investigate'
import { DivergingBars, ExpOverTimeChart, Matchup, MetricTable, MiniFunnels, FunnelTable, NVarFunnels, NVarOverTimeChart, OverTimeTable, VerdictBadge } from '@/components/expcharts'
import { motion } from 'motion/react'
import { cn, inr, num } from '@/lib/utils'
import { EXPERIMENTS, PAGES, VERDICT, ecpl, goalVarOf, isNVar, variantCpl } from '@/data/samurai'
import { expPage, expVariantPage } from '@/data/experiments'
import { bizFromLeads, money, ticketSize } from '@/data/business'
import { elKeyOf } from '@/data/templates'
import { PageCanvas } from './experiments/PageCanvas'
import { C } from '@/lib/tokens'

const VCOLOR = ['bg-navy', 'bg-brand', 'bg-pos', 'bg-warn', 'bg-fg/60']

const badgeTone: Record<string, string> = { pos: 'bg-pos-tint text-pos', navy: 'bg-navy-tint text-navy', neg: 'bg-neg-tint text-neg', warn: 'bg-warn-tint text-warn', neutral: 'bg-sunken text-fg-muted' }

export function ExperimentDetail({ id }: { id: string }) {
  const { go } = useNav()
  const { openDeclare, openStop, newExperiment } = useExp()
  const investigate = useInvestigate()
  const e = EXPERIMENTS.find((x) => x.id === id)
  const [view, setView] = useState<{ funnel: 'graph' | 'table'; overtime: 'graph' | 'table'; evidence: 'graph' | 'table' }>({ funnel: 'graph', overtime: 'graph', evidence: 'graph' })
  const [lens, setLens] = useState<'result' | 'behavior'>('result')
  if (!e) return <div className="p-10 text-fg-subtle">Experiment not found.</div>

  const p = expPage(e)
  const vpage = expVariantPage(e)
  const dstr = `${e.days} day${e.days === 1 ? '' : 's'}`
  const runLabel = e.days === 0
    ? (e.status === 'ended' ? 'Ended today' : e.status === 'stopped' ? 'Stopped today' : 'Launched today')
    : e.status === 'ended' ? `Ran ${dstr}`
    : e.status === 'stopped' ? `Stopped after ${dstr}`
    : `Running · ${dstr} in`
  const cc = ecpl(e.control)
  const vc = ecpl(e.variant)
  const vd = VERDICT[e.verdict]
  const canAct = e.status === 'running'
  const cplDrill = () => investigate({
    title: 'Cost per lead — how it’s calculated',
    definition: 'Cost per lead = ad spend ÷ leads, worked out separately for each version.',
    columns: [
      { key: 'v', label: 'Version' },
      { key: 's', label: 'Spend', align: 'right' },
      { key: 'l', label: 'Leads', align: 'right' },
      { key: 'c', label: 'Spend ÷ leads', align: 'right' },
    ],
    rows: [
      { v: 'Control (A)', s: inr(e.control.spend), l: num(e.control.leads), c: cc != null ? `${inr(e.control.spend)} ÷ ${num(e.control.leads)} = ${inr(cc)}` : '—' },
      { v: `Variant B${vpage ? ' · ' + vpage.name : ''}`, s: inr(e.variant.spend), l: num(e.variant.leads), c: vc != null ? `${inr(e.variant.spend)} ÷ ${num(e.variant.leads)} = ${inr(vc)}` : '—' },
    ],
    note: 'Spend is each version’s even share of the test budget; leads are the goal conversions it produced. A version with no leads shows “—” — we never divide by zero.',
  })
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
            <span>{p && <>On <b className="text-fg-muted">{p.name}</b>{vpage && <> vs <b className="text-fg-muted">{vpage.name}</b></>} · </>}Goal: {e.goal}</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-sunken px-1.5 py-0.5 text-[11.5px] font-medium text-fg-muted"><Clock className="h-3 w-3" /> {runLabel}</span>
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

  // ---- collecting (just launched) ----
  if (cc == null || vc == null) {
    return (
      <div className="mx-auto max-w-[900px] px-8 py-7">
        {head}
        <Card className="p-5">
          <Badge tone="neutral">Collecting</Badge>
          <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">This test is live and splitting traffic evenly. A verdict appears once each version has enough events.</p>
        </Card>
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

  // the shipped version becomes the baseline for a follow-up test. Winner from the decision, else the cheaper arm.
  const winnerLetter: 'A' | 'B' = e.decision?.win ?? (better ? 'B' : 'A')
  const winnerPage = winnerLetter === 'A' ? p : (vpage ?? p)

  return (
    <div className="mx-auto max-w-[900px] px-8 py-7">
      {head}
      {/* verdict hero */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><VerdictBadge e={e} /><InvestigateLink onClick={cplDrill} /></div>
        <Matchup e={e} />
        <p className="mt-4 text-[13.5px] leading-relaxed text-fg-muted">{summary}</p>
        {honesty && <p className="mt-2 text-[12px] italic leading-relaxed text-fg-subtle">{honesty}</p>}
      </Card>

      {/* what it returned — projected revenue per version */}
      <ExperimentReturn e={e} />

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
      {e.status === 'ended' && e.decision && (
        <div className="mt-5">
          <SectionHead title="What’s next" />
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-tint text-brand"><Rocket className="h-[18px] w-[18px]" /></span>
              <div className="flex-1">
                <b className="text-[14px] text-fg">Build on this result</b>
                <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">
                  {winnerLetter === 'A'
                    ? <>You kept <b className="text-fg-muted">{winnerPage?.name ?? 'the control'}</b> — the variant didn’t beat it. Try a different change against it.</>
                    : better
                      ? <>Variant B shipped — now live on <b className="text-fg-muted">{winnerPage?.name ?? 'the page'}</b>, turning ad spend into leads <b className="text-fg">{dpct}% cheaper</b>. Test your next idea against it to keep lowering cost per lead.</>
                      : <>Variant B shipped — now live on <b className="text-fg-muted">{winnerPage?.name ?? 'the page'}</b>. Test your next idea against it.</>}
                </p>
                {e.decision.learned && <p className="mt-2 rounded-[10px] bg-sunken px-3 py-2 text-[12px] text-fg-subtle"><b className="text-fg-muted">Carry forward:</b> {e.decision.learned}</p>}
                <div className="mt-3">
                  <Button variant="primary" size="md" onClick={() => newExperiment(winnerPage?.id)}><Rocket className="h-3.5 w-3.5" /> Run a follow-up test</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
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
  const investigate = useInvestigate()
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const cplDrill = () => {
    const totalSpend = variants.reduce((s, v) => s + v.spend, 0)
    const totalGoal = variants.reduce((s, v) => s + goalCount(v.letter), 0)
    const blended = totalGoal ? Math.round(totalSpend / totalGoal) : null
    investigate({
      title: `Cost per ${goalName} — how it’s calculated`,
      definition: `Cost per ${goalName} = each version’s ad spend ÷ the ${plur(2, goalName)} it produced. Worked per version, so pages that are otherwise different compare like-for-like.`,
      columns: [
        { key: 'v', label: 'Version' },
        { key: 's', label: 'Spend', align: 'right' },
        { key: 'g', label: cap(plur(2, goalName)), align: 'right' },
        { key: 'c', label: `Spend ÷ ${goalName}`, align: 'right' },
      ],
      rows: variants.map((v) => {
        const cnt = goalCount(v.letter)
        const cpl = cplOf(v.letter)
        return { v: `Version ${v.letter} · ${v.name}`, s: inr(v.spend), g: num(cnt), c: cpl != null ? `${inr(v.spend)} ÷ ${num(cnt)} = ${inr(cpl)}` : '—' }
      }),
      foot: { v: 'All versions (blended)', s: inr(totalSpend), g: num(totalGoal), c: blended != null ? `${inr(totalSpend)} ÷ ${num(totalGoal)} = ${inr(blended)}` : '—' },
      note: `Spend is each version’s allocation; ${plur(2, goalName)} are the goal variable’s count per version. A version with no ${plur(2, goalName)} shows “—” — we never divide by zero.`,
    })
  }

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
        <SectionHead title={`Cost per ${goalName} by version`} hint="the decision" right={<InvestigateLink onClick={cplDrill} />} />
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

      <ExperimentReturn e={e} />

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

      <NVarPlacement e={e} />

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

/* Visual placement preview — reconstructs, per version, which button each variable sits on (as set up
   in the builder) and renders it read-only on that version's own page. */
function NVarPlacement({ e }: { e: (typeof EXPERIMENTS)[number] }) {
  const variants = e.variants ?? []
  const variables = e.variables ?? []
  const [pv, setPv] = useState(variants[0]?.letter ?? 'A')
  const cur = variants.find((v) => v.letter === pv) ?? variants[0]
  if (!cur || variables.length === 0) return null
  const page = PAGES.find((p) => p.id === cur.pageId)
  const placement: Record<string, string> = {}
  for (const vr of variables) {
    const arm = vr.arms[cur.letter]
    const key = arm?.elKey ?? (arm?.button ? elKeyOf(arm.button) : undefined)
    if (key) placement[vr.id] = key
  }
  return (
    <div className="mt-5">
      <SectionHead title="Where each variable sits" hint="the button each variable maps to on every version — as set up" />
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {variants.map((v) => (
            <button key={v.letter} onClick={() => setPv(v.letter)} className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors', cur.letter === v.letter ? 'border-navy bg-navy-tint text-navy' : 'border-line text-fg-muted hover:border-line-strong')}>
              <b>Version {v.letter}</b><span className="hidden text-fg-subtle sm:inline">· {v.name}</span>
            </button>
          ))}
        </div>
        <PageCanvas readOnly variables={variables} placement={placement} page={page} caption={`pages.onlinejain.com${page?.path ?? ''} · Version ${cur.letter}`} />
      </Card>
    </div>
  )
}

/* "What it returned" for an experiment — projected enrolment revenue per version (A/B/C/D/E). A
   version with fewer leads but a bigger ticket can still win on money, so this can crown a
   different winner than cost-per-lead. Main view = ranked revenue bars; Investigate drills the
   per-version projection. Handles collecting / 0-enrolment / tie / same-page cases. */
function ExperimentReturn({ e }: { e: (typeof EXPERIMENTS)[number] }) {
  const investigate = useInvestigate()
  const list = isNVar(e)
    ? (e.variants ?? []).map((v) => ({ letter: v.letter, name: v.name, pageId: v.pageId, spend: v.spend, leads: goalVarOf(e)?.arms[v.letter]?.count ?? 0 }))
    : [
        { letter: 'A', name: expPage(e)?.name ?? 'Control', pageId: e.pageId, spend: e.control.spend, leads: e.control.leads },
        { letter: 'B', name: (e.variantPageId && PAGES.find((p) => p.id === e.variantPageId)?.name) || 'Variant B', pageId: e.variantPageId ?? e.pageId, spend: e.variant.spend, leads: e.variant.leads },
      ]
  const rows = list.map((v) => ({ ...v, biz: bizFromLeads(v.pageId, v.spend, v.leads), cpl: v.leads ? Math.round(v.spend / v.leads) : null }))
  const maxRev = Math.max(...rows.map((r) => r.biz.revenue), 0)

  if (maxRev <= 0 || e.verdict === 'pending') {
    return (
      <div className="mt-5">
        <SectionHead title="What it returned" hint="projected enrolment revenue per version" />
        <Card className="p-5"><p className="text-[13px] leading-relaxed text-fg-muted">Too early — projected revenue appears once a version reaches enough leads to enrol. The cost-per-lead read above is the live decision for now.</p></Card>
      </div>
    )
  }

  const sorted = [...rows].sort((a, z) => z.biz.revenue - a.biz.revenue)
  const revLeader = sorted[0]
  const withLeads = rows.filter((r) => r.leads > 0)
  const costLeader = withLeads.length ? withLeads.reduce((a, b) => ((a.cpl ?? Infinity) <= (b.cpl ?? Infinity) ? a : b)) : undefined
  const tie = sorted.length > 1 && sorted[0].biz.revenue === sorted[1].biz.revenue
  const flip = !!costLeader && costLeader.letter !== revLeader.letter && !tie
  const ticketsDiffer = !!costLeader && ticketSize(revLeader.pageId) !== ticketSize(costLeader.pageId)

  const drill = () =>
    investigate({
      title: `What it returned — ${e.name}`,
      definition: "Projected enrolment revenue per version: each version’s leads → sales-qualified → enrolled (at the page’s qualify rate and a 34% close-rate), × the programme ticket. CAC is each version’s spend ÷ its enrolments — the cost to win one enrolment, the deeper cost beneath cost-per-lead. It can crown a different winner than cost-per-lead when programmes have different ticket sizes.",
      columns: [
        { key: 'v', label: 'Version' },
        { key: 'enq', label: 'Leads', align: 'right' },
        { key: 'en', label: 'Enrol', align: 'right' },
        { key: 't', label: 'Ticket', align: 'right' },
        { key: 'rev', label: 'Revenue', align: 'right' },
        { key: 'cac', label: 'CAC', align: 'right' },
        { key: 'roas', label: 'Return', align: 'right' },
      ],
      rows: sorted.map((r) => ({
        v: `${r.letter} · ${r.name}`,
        enq: num(r.leads),
        en: r.biz.enrolled ? num(r.biz.enrolled) : '—',
        t: money(ticketSize(r.pageId)),
        rev: r.biz.enrolled ? money(r.biz.revenue) : '—',
        cac: r.biz.cac ? inr(r.biz.cac) : '—',
        roas: r.biz.enrolled ? `${r.biz.roas}×` : '—',
      })),
      note: "Projections use each page’s qualify rate and a 34% close-rate — directional until enrolments are confirmed over the intake window.",
    })

  return (
    <div className="mt-5">
      <SectionHead title="What it returned" hint="projected revenue per version — money, not just leads" right={<InvestigateLink onClick={drill} />} />
      <Card className="p-5">
        <div className="space-y-3">
          {sorted.map((r, i) => (
            <div key={r.letter}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                <span className="flex min-w-0 items-center gap-1.5">
                  <b className="shrink-0 text-fg">Version {r.letter}</b>
                  <span className="truncate text-fg-subtle">{r.name}</span>
                  {i === 0 && !tie && <span className="shrink-0 rounded bg-pos-tint px-1 py-0.5 text-[9px] font-bold uppercase text-pos">Most revenue</span>}
                  {flip && costLeader && r.letter === costLeader.letter && <span className="shrink-0 rounded bg-navy-tint px-1 py-0.5 text-[9px] font-bold uppercase text-navy">Cheapest/lead</span>}
                </span>
                <span className="tnum shrink-0 text-fg-muted">{r.biz.enrolled ? <><b className="text-fg">{money(r.biz.revenue)}</b> · {r.biz.roas}×</> : '—'}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
                <motion.i className={cn('block h-full rounded-full', i === 0 && !tie ? 'bg-pos' : 'bg-pos/45')} initial={{ width: 0 }} animate={{ width: `${Math.max(2, (r.biz.revenue / maxRev) * 100)}%` }} transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3.5 border-t border-line pt-3 text-[11.5px] leading-relaxed text-fg-muted">
          {tie ? (
            <>The versions project <b className="text-fg">similar revenue</b> at this volume — use the cost-per-lead read above for now.</>
          ) : flip && ticketsDiffer ? (
            <><b className="text-fg">Version {revLeader.letter}</b> brings the most revenue (<b className="tnum">{money(revLeader.biz.revenue)}</b>), even though <b className="text-fg">Version {costLeader!.letter}</b> is cheapest per lead — its <b className="tnum">{money(ticketSize(revLeader.pageId))}</b> ticket outweighs the extra leads.</>
          ) : (
            <><b className="text-fg">Version {revLeader.letter}</b> brings the most projected revenue at <b className="tnum">{money(revLeader.biz.revenue)}</b> · {revLeader.biz.roas}× return. Projected from each version’s leads at the page’s qualify + close rates.</>
          )}
        </p>
      </Card>
    </div>
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
