/* Decision Queue — judges each live experiment on QUALIFIED leads, not just form-fills.
   A variant can win the A/B test on volume and still lose you money if its leads don't qualify.
   The quality signal is each arm's CRM sales-qualified rate (seeded here; from the CRM in
   production). Everything else is derived, so the queue reconciles with the experiment data. */
import { EXPERIMENTS, isNVar, goalVarOf, type Experiment } from './samurai'
import { inr } from '@/lib/utils'

/* CRM sales-qualified rate per arm, keyed by experiment id → arm key.
   N-variant arms are the version letters (A/B/C…); A/B arms are 'A' (control) and 'B' (variant). */
const QUAL: Record<string, Record<string, number>> = {
  'e-nvar': { A: 0.61, B: 0.42, C: 0.50 }, // B wins volume but its leads are the lowest quality — the flip
  'e-bba': { A: 0.50, B: 0.58 }, // variant wins volume AND quality — ship
  'e-mcom': { A: 0.45, B: 0.70 }, // near-tie on volume, quality breaks it — ship
  'e-mca': { A: 0.55, B: 0.44 }, // variant loses on volume AND quality — roll back
  'e-home': { A: 0.5, B: 0.5 }, // too early
}

export interface DecisionArm {
  key: string
  label: string
  leads: number
  qualRate: number
  qualified: number
  spend: number
  cpl: number | null
  cpql: number | null
}
export type DecisionKind = 'flip' | 'ship' | 'rollback' | 'early'
export interface Decision {
  e: Experiment
  arms: DecisionArm[]
  leadLeader: DecisionArm
  qualLeader: DecisionArm
  maxLeads: number
  maxQual: number
  kind: DecisionKind
  headline: string
  detail: string
  action: string
  uncertainty: string
  totalQualified: number
}

const r = Math.round
const pct = (n: number) => Math.round(n * 100)

function armsOf(e: Experiment): DecisionArm[] {
  const q = QUAL[e.id] ?? {}
  if (isNVar(e)) {
    const g = goalVarOf(e)
    return (e.variants ?? []).map((v) => {
      const leads = g?.arms[v.letter]?.count ?? 0
      const qualRate = q[v.letter] ?? 0.5
      const qualified = r(leads * qualRate)
      return { key: v.letter, label: `Version ${v.letter}`, leads, qualRate, qualified, spend: v.spend, cpl: leads ? r(v.spend / leads) : null, cpql: qualified ? r(v.spend / qualified) : null }
    })
  }
  const mk = (key: string, label: string, a: { leads: number; spend: number }): DecisionArm => {
    const qualRate = q[key] ?? 0.5
    const qualified = r(a.leads * qualRate)
    return { key, label, leads: a.leads, qualRate, qualified, spend: a.spend, cpl: a.leads ? r(a.spend / a.leads) : null, cpql: qualified ? r(a.spend / qualified) : null }
  }
  return [mk('A', 'Control (A)', e.control), mk('B', 'Variant B', e.variant)]
}

const maxBy = (arms: DecisionArm[], f: (a: DecisionArm) => number) => arms.reduce((best, a) => (f(a) > f(best) ? a : best), arms[0])

function buildDecision(e: Experiment): Decision {
  const arms = armsOf(e)
  const leadLeader = maxBy(arms, (a) => a.leads)
  const qualLeader = maxBy(arms, (a) => a.qualified)
  const totalQualified = arms.reduce((s, a) => s + a.qualified, 0)
  const maxLeads = Math.max(...arms.map((a) => a.leads), 1)
  const maxQual = Math.max(...arms.map((a) => a.qualified), 1)
  const nvar = isNVar(e)

  let kind: DecisionKind
  if (e.verdict === 'pending' || totalQualified < 6) kind = 'early'
  else if (leadLeader.key !== qualLeader.key) kind = 'flip'
  else kind = nvar ? 'ship' : qualLeader.key === 'B' ? 'ship' : 'rollback'

  let headline = ''
  let detail = ''
  let action = ''
  if (kind === 'flip') {
    headline = "The lead winner isn't the quality winner"
    detail = `${leadLeader.label} wins on enquiries (${leadLeader.leads} vs ${qualLeader.leads}), but its leads qualify at just ${pct(leadLeader.qualRate)}% vs ${qualLeader.label}'s ${pct(qualLeader.qualRate)}% — so ${qualLeader.label} produces more qualified leads (${qualLeader.qualified} vs ${leadLeader.qualified}) at a lower cost (${inr(qualLeader.cpql!)} vs ${inr(leadLeader.cpql!)} per qualified). Shipping on volume buys cheaper but worse leads.`
    action = `Hold ${leadLeader.label} · keep ${qualLeader.label}`
  } else if (kind === 'ship') {
    const w = qualLeader
    const loser = arms.find((a) => a.key !== w.key)!
    const nearTie = Math.abs(w.leads - loser.leads) <= 1
    headline = nearTie ? 'Quality breaks a near-tie' : 'Clear winner — aligned on volume and quality'
    detail = nearTie
      ? `Near-level on enquiries (${w.leads} vs ${loser.leads}), but ${w.label}'s leads qualify at ${pct(w.qualRate)}% vs ${pct(loser.qualRate)}% — ${w.qualified} qualified vs ${loser.qualified}, at ${inr(w.cpql!)} vs ${inr(loser.cpql!)} per qualified. The quality gap is the real win.`
      : `${w.label} wins on enquiries (${w.leads} vs ${loser.leads}) and quality (${pct(w.qualRate)}% vs ${pct(loser.qualRate)}%) — ${w.qualified} qualified vs ${loser.qualified}. The extra leads are better leads too.`
    action = `Ship ${w.label}`
  } else if (kind === 'rollback') {
    const w = qualLeader
    const loser = arms.find((a) => a.key !== w.key)!
    headline = 'Losing on volume and quality'
    detail = `${loser.label} trails on enquiries (${loser.leads} vs ${w.leads}) and quality (${pct(loser.qualRate)}% vs ${pct(w.qualRate)}%) — ${loser.qualified} qualified vs ${w.qualified}. It's worse on both.`
    action = `Roll back ${loser.label}`
  } else {
    const lo = Math.min(...arms.map((a) => a.qualified))
    const hi = Math.max(...arms.map((a) => a.qualified))
    headline = 'Too early to decide'
    detail = `Only ${lo === hi ? lo : `${lo}–${hi}`} qualified per arm — below the reading threshold, so quality can't be judged yet.`
    action = 'Keep testing'
  }

  const uncertainty =
    kind === 'early'
      ? `Day ${e.days} · check back once each arm clears the bar`
      : kind === 'rollback'
        ? `Day ${e.days} · enough signal to call it`
        : `Day ${e.days} · ${totalQualified} qualified so far — directional, not a significance claim`

  return { e, arms, leadLeader, qualLeader, maxLeads, maxQual, kind, headline, detail, action, uncertainty, totalQualified }
}

const ORDER: Record<DecisionKind, number> = { flip: 0, rollback: 1, ship: 2, early: 3 }

/** every live experiment as a decision card, most-urgent first */
export function decisions(): Decision[] {
  return EXPERIMENTS.filter((e) => e.status === 'running')
    .map(buildDecision)
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind])
}
/** count of live tests that need a call now (everything except the still-collecting ones) */
export const openDecisionsCount = () => decisions().filter((d) => d.kind !== 'early').length
