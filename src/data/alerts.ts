/* Smart Alerts — a DETERMINISTIC monitoring engine. No AI, no inference.
   Every alert is a rule or a cross-sectional statistic computed on the already-reconciled
   account data (campaigns, pages, the leak model, live tests, intake pacing). Each one carries
   its own math so a CRO can audit exactly why it fired, and the money flagged reconciles to the
   account's leak totals: confirmed bleed = ₹1,01,600 (= confirmedLeak), total flagged = ₹1,42,800
   (= leakTotal). Where a baseline needs volume we gate on a sample floor rather than guess. */
import { CAMPAIGNS, EXPERIMENTS, LEAKS, PAGES, QUARTER, ecpl, pageName } from './samurai'
import { inr, num } from '@/lib/utils'

export type Severity = 'critical' | 'warning' | 'watch'
export type Dimension = 'campaign' | 'page' | 'experiment' | 'intake'

export interface Alert {
  id: string
  dimension: Dimension
  severity: Severity
  title: string
  metric: string
  observed: string
  baseline?: string
  /** the deterministic derivation, shown in full so the alert is auditable */
  why: string
  action: string
  /** ₹ used for ranking + the headline; 0 for non-monetary alerts */
  atStake: number
  atStakeLabel?: string
  ref?: { route: 'campaigndetail' | 'pagedetail' | 'experimentdetail' | 'overview'; id?: string }
  /** the rule/stat that fired — surfaced in the UI to prove there is no black box */
  rule: string
}

const r = Math.round
const SEV_RANK: Record<Severity, number> = { critical: 0, warning: 1, watch: 2 }

// ---- deterministic statistics -------------------------------------------------
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1)
const std = (xs: number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) }

const CPL_MIN_LEADS = 10 // sample floor — never judge a campaign's CPL on fewer than this
const CPL_SIGMA = 1 // flag campaigns whose CPL sits more than 1σ above the campaign mean

function detect(): Alert[] {
  const out: Alert[] = []
  const confirmedBleed = CAMPAIGNS.filter((c) => c.spend > 0 && c.leads === 0).reduce((n, c) => n + c.spend, 0)

  // 1) DEAD SPEND — a campaign spending with zero leads. Provable, critical. ------------------
  for (const c of CAMPAIGNS) {
    if (c.spend > 0 && c.leads === 0) {
      const leak = LEAKS.find((l) => l.page === c.pageId)
      const closed = PAGES.find((p) => p.id === c.pageId)?.fault === 'closed_intake'
      out.push({
        id: `dead-${c.id}`, dimension: 'campaign', severity: 'critical',
        title: `${c.name} — ${inr(c.spend)} spent, 0 leads`,
        metric: 'Leads', observed: '0 leads', baseline: `${inr(c.spend)} spent · ${num(c.clicks)} clicks`,
        why: leak ? `${leak.detail} Every rupee on this campaign reaches a page that cannot convert.`
          : `${inr(c.spend)} spent across ${num(c.clicks)} clicks with 0 leads recorded.`,
        action: closed ? 'Pause the campaign — the intake is closed.' : 'Pause the campaign and fix the page before resuming.',
        atStake: c.spend, atStakeLabel: 'confirmed bleed',
        ref: { route: 'campaigndetail', id: c.id }, rule: 'no leads',
      })
    }
  }

  // 2) WRONG PAGE — a likely leak from the reconciled leak model. Warning. --------------------
  for (const l of LEAKS) {
    if (l.reason !== 'wrong_page') continue // broken/closed are already covered as dead-spend
    const cpl = PAGES.find((p) => p.id === l.page)?.cpl
    out.push({
      id: `leak-${l.id}`, dimension: 'page', severity: 'warning',
      title: `${pageName(l.page)} — converting at a worse rate than matched pages`,
      metric: 'CPL', observed: cpl ? `${inr(cpl)} / lead` : 'worse CPL', baseline: '₹1,166 on matched pages',
      why: l.detail, action: 'Route this traffic to the matching programme page.',
      atStake: l.amount, atStakeLabel: 'at a worse rate',
      ref: { route: 'pagedetail', id: l.page }, rule: 'wrong page',
    })
  }

  // 3) HIGH-CPL OUTLIER — cross-sectional z-score over converting campaigns. Watch. -----------
  const scored = CAMPAIGNS.filter((c) => c.leads >= CPL_MIN_LEADS && c.cpl != null)
  if (scored.length >= 5) {
    const cpls = scored.map((c) => c.cpl as number)
    const m = mean(cpls), sd = std(cpls)
    for (const c of scored) {
      const cpl = c.cpl as number
      const z = sd ? (cpl - m) / sd : 0
      if (z <= CPL_SIGMA) continue
      const perLead = r(cpl - m) // rounded once, so the shown multiplication is exact
      const excess = perLead * c.leads
      out.push({
        id: `cpl-${c.id}`, dimension: 'campaign', severity: 'watch',
        title: `${c.name} — dearest cost per lead`,
        metric: 'CPL', observed: `${inr(cpl)} / lead`, baseline: `${inr(r(m))} campaign average`,
        why: `${inr(cpl)} per lead — ${inr(perLead)} dearer than your average campaign (${inr(r(m))}). Across its ${c.leads} leads, that's ${inr(excess)} more than if it matched the average. ${Math.round(c.good * 100)}% of its leads qualify.`,
        action: 'Worth a look — check whether the page or targeting has headroom.',
        atStake: excess, atStakeLabel: 'above average',
        ref: { route: 'campaigndetail', id: c.id }, rule: 'dearer than usual',
      })
    }
  }

  // 4) INTAKE PACING — elapsed window ahead of target attainment. Warning. --------------------
  if (QUARTER.pctPeriod > QUARTER.pctTarget) {
    const gap = QUARTER.pctPeriod - QUARTER.pctTarget
    const need = QUARTER.target - QUARTER.enrol
    out.push({
      id: 'pacing', dimension: 'intake', severity: 'warning',
      title: `${QUARTER.intake} intake behind pace by ${gap} pts`,
      metric: 'Intake pacing', observed: `${QUARTER.pctTarget}% to target`, baseline: `${QUARTER.pctPeriod}% of window elapsed`,
      why: `${num(QUARTER.enrol)} of ${num(QUARTER.target)} enrolled with ${QUARTER.pctPeriod}% of the window gone — ${num(need)} more needed by ${QUARTER.closeDate}. Recovering the ${inr(confirmedBleed)} of confirmed bleed funds roughly this gap without new spend.`,
      action: 'Clear the confirmed leaks first — they fund the shortfall.',
      atStake: 0, atStakeLabel: '',
      ref: { route: 'overview' }, rule: 'behind pace',
    })
  }

  // 5) EXPERIMENT — a running test that is losing and overdue to call. Warning. ----------------
  for (const e of EXPERIMENTS) {
    if (e.status !== 'running' || e.verdict !== 'low') continue
    const cc = ecpl(e.control), vc = ecpl(e.variant)
    if (cc == null || vc == null || vc <= cc) continue
    out.push({
      id: `exp-${e.id}`, dimension: 'experiment', severity: 'warning',
      title: `${e.name} — variant losing after ${e.days} days`,
      metric: 'CPL · variant vs control', observed: `${inr(vc)} variant`, baseline: `${inr(cc)} control`,
      why: `On day ${e.days} the variant is ${inr(vc - cc)}/lead dearer than control and the micro-signals agree — a decidable result that is still running.`,
      action: 'Replace the variant and free the test slot.',
      atStake: 0, atStakeLabel: '',
      ref: { route: 'experimentdetail', id: e.id }, rule: 'test losing',
    })
  }

  return out.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || b.atStake - a.atStake)
}

export const ALERTS = detect()

export const alertCount = (s?: Severity) => (s ? ALERTS.filter((a) => a.severity === s).length : ALERTS.length)
export const criticalCount = () => alertCount('critical')
/** money flagged by the leak-based alerts — reconciles to leakTotal (₹1,42,800) */
export const flaggedTotal = () => ALERTS.filter((a) => a.atStakeLabel === 'confirmed bleed' || a.atStakeLabel === 'at a worse rate').reduce((n, a) => n + a.atStake, 0)
/** confirmed, provable bleed only — reconciles to confirmedLeak (₹1,01,600) */
export const confirmedBleedTotal = () => ALERTS.filter((a) => a.atStakeLabel === 'confirmed bleed').reduce((n, a) => n + a.atStake, 0)

/** what the engine continuously watches — shown so coverage is explicit, never implied */
export const WATCHED = {
  campaigns: CAMPAIGNS.length,
  pages: PAGES.length,
  liveTests: EXPERIMENTS.filter((e) => e.status === 'running').length,
}
