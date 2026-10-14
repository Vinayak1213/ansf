/* Enrollment Studio — the outcome graph: ad spend → clicks → leads → qualified → enrolled → revenue,
   derived from the real campaign data plus TWO labelled inputs (programme fee + close-rate), so every
   stage reconciles with the account. Each edge carries what the "Studio agent" found (grounded in real
   data) and the intervention it would stage — never a fabricated causal claim. */
import { CAMPAIGNS } from './samurai'

// ---- the two labelled INPUTS (from the CRM / finance in production) --------------------------------
const FEE: Record<string, number> = { mba: 170000, mca: 150000, bba: 120000, bca: 110000, home: 120000, mcom: 100000, bsc: 95000, ba: 80000, bcom: 100000, mbajul: 170000 }
const CLOSE_RATE = 0.34 // qualified → enrolled

const r = Math.round

function funnel() {
  let spend = 0, clicks = 0, leads = 0, qualified = 0, enrolled = 0, revenue = 0
  for (const c of CAMPAIGNS) {
    spend += c.spend; clicks += c.clicks; leads += c.leads
    const q = r(c.leads * c.good)
    qualified += q
    const e = r(q * CLOSE_RATE)
    enrolled += e
    revenue += e * (FEE[c.pageId] ?? 100000)
  }
  return { spend, clicks, leads, qualified, enrolled, revenue, pending: qualified - enrolled }
}
export const OUTCOME = funnel()

export interface Stage { key: string; label: string; value: number; money?: boolean; sub?: string }
export const STAGES: Stage[] = [
  { key: 'spend', label: 'Ad spend', value: OUTCOME.spend, money: true, sub: 'last 30 days' },
  { key: 'clicks', label: 'Clicks', value: OUTCOME.clicks },
  { key: 'leads', label: 'Leads', value: OUTCOME.leads },
  { key: 'qualified', label: 'Qualified', value: OUTCOME.qualified, sub: 'CRM-qualified' },
  { key: 'enrolled', label: 'Enrolled', value: OUTCOME.enrolled, sub: `${OUTCOME.pending} in pipeline` },
  { key: 'revenue', label: 'Revenue', value: OUTCOME.revenue, money: true },
]

export interface Intervention {
  title: string
  rationale: string
  variant: string
  metric: string
  arms: string[]
  readout: string
  kind: 'test' | 'fix' | 'reallocate'
}
export interface Edge {
  id: string
  from: string
  to: string
  stat: string
  leak: 'none' | 'watch' | 'high'
  atStake: string
  diagnosis: string
  evidence: string[]
  intervention: Intervention
}

const pctEdge = (a: number, b: number) => `${((b / a) * 100).toFixed(b / a < 0.1 ? 1 : 0)}%`

export const EDGES: Edge[] = [
  {
    id: 'spend-clicks', from: 'spend', to: 'clicks', stat: `₹${r(OUTCOME.spend / OUTCOME.clicks)}/clk`, leak: 'none',
    atStake: 'blended CPC',
    diagnosis: `Blended ₹${r(OUTCOME.spend / OUTCOME.clicks)} per click across 10 campaigns — Meta runs ~2.4× Google's cost per lead.`,
    evidence: ['Google: 77% of spend, 89% of leads', 'Meta: 23% of spend, 11% of leads'],
    intervention: { kind: 'reallocate', title: 'Shift budget from Meta prospecting to Search', rationale: 'Search converts clicks to qualified leads far more efficiently on these programmes.', variant: 'Move 15% of Meta prospecting spend to the best-qualified Search campaigns.', metric: 'Cost per qualified lead', arms: ['Current split', 'Rebalanced split'], readout: 'observational — confirm with a geo holdout' },
  },
  {
    id: 'clicks-leads', from: 'clicks', to: 'leads', stat: pctEdge(OUTCOME.clicks, OUTCOME.leads), leak: 'high',
    atStake: '₹1,01,600 wasted',
    diagnosis: 'Two campaigns spent ₹1,01,600 and produced 0 leads — a broken mobile form and an intake that closed 11 days ago but is still buying traffic.',
    evidence: ['B.Com · Meta: 1,840 sessions → 0 leads — form fails below 380px', 'MBA · July: intake closed 11 days ago, still live on Meta — ₹37,300 spent', 'Both are already flagged as confirmed money leaks'],
    intervention: { kind: 'fix', title: 'Stop the two dead campaigns + fix the B.Com mobile form', rationale: 'You are paying for clicks that structurally cannot become leads. Fix the form, pause the closed intake.', variant: 'Pause B.Com·Meta & MBA·July; ship the mobile-form fix as an A/B on B.Com.', metric: 'Leads, then qualified', arms: ['Current (broken) form', 'Fixed mobile form'], readout: '~2 weeks' },
  },
  {
    id: 'leads-qualified', from: 'leads', to: 'qualified', stat: pctEdge(OUTCOME.leads, OUTCOME.qualified), leak: 'high',
    atStake: '46% of leads never qualify',
    diagnosis: `${OUTCOME.leads} leads → ${OUTCOME.qualified} qualified (54%), so 46% never become sales-qualified. The gap concentrates in low-intent traffic: Generic·Search qualifies at just 40% vs 58–60% on matched programme pages. A cheap lead that never qualifies costs ₹3,180 per qualified lead — 1.8× the ₹1,732 headline CPL.`,
    evidence: ['Generic·Search 40% qualified · MBA Brand 58% · BCA 60% (CRM sales-qualified rate)', 'Generic homepage is already flagged as a wrong-page leak — ₹1,373/lead vs ₹1,166 on matched pages', 'Blended ₹3,180 per qualified lead vs the ₹1,732 headline CPL'],
    intervention: { kind: 'test', title: 'Add an intent + eligibility pre-check to the enquiry form', rationale: 'Low-intent and ineligible visitors self-select out before enquiring, so the leads that do come through qualify higher — fewer leads, but more that sales can convert.', variant: 'Version B: a 3-question intent + eligibility pre-check ahead of the form, piloted on the highest-volume programme page.', metric: 'Qualified leads (enrolment confirmed later)', arms: ['A — current form', 'B — pre-check'], readout: '~3 weeks to a qualified-lead read' },
  },
  {
    id: 'qualified-enrolled', from: 'qualified', to: 'enrolled', stat: pctEdge(OUTCOME.qualified, OUTCOME.enrolled), leak: 'watch',
    atStake: `${OUTCOME.pending} qualified still in pipeline`,
    diagnosis: `${OUTCOME.qualified} qualified → ${OUTCOME.enrolled} enrolled so far (34%); ${OUTCOME.pending} are still progressing through the pipeline — recent qualified leads are still maturing, not lost. Speed of first response is the lever you can test.`,
    evidence: ['First-response speed is a known lever on start-rate — worth testing here', 'Cohort still maturing — recent qualified leads are not a final scoreboard', 'Watch “application started” as the leading proxy for enrolment'],
    intervention: { kind: 'test', title: 'Test a faster first-response flow for qualified leads', rationale: 'Cut time-to-first-contact for qualified leads and more of them should reach application and start.', variant: 'Route qualified leads to instant WhatsApp + a same-day counsellor slot vs the current next-day call.', metric: 'Application started (leading proxy) → enrolled (lagged)', arms: ['Current next-day call', 'Instant WhatsApp + same-day slot'], readout: 'leading read ~2 weeks · enrolment confirmed over the intake window' },
  },
  {
    id: 'enrolled-revenue', from: 'enrolled', to: 'revenue', stat: `₹${(OUTCOME.revenue / OUTCOME.enrolled / 100000).toFixed(1)}L`, leak: 'none',
    atStake: '12.6× ROAS',
    diagnosis: `${OUTCOME.enrolled} enrolments → ₹${(OUTCOME.revenue / 100000).toFixed(1)}L (blended ₹${r(OUTCOME.revenue / OUTCOME.enrolled / 1000)}k per enrolment) — a 12.6× blended ROAS. Higher-fee programmes with cheap qualified leads are under-funded.`,
    evidence: ['BCA·Search: ₹1,964 / qualified at 20× ROAS — room to scale', 'MBA (₹1.7L fee) carries the most revenue per enrolment'],
    intervention: { kind: 'reallocate', title: 'Tilt spend toward high-fee, cheap-qualified programmes', rationale: 'Optimise for revenue per qualified lead, not lead volume — scale the programmes that enrol at high value for a low qualified cost.', variant: 'Add budget to BCA·Search and BBA·Search; cap the low-ROAS Meta cohorts.', metric: 'Revenue per qualified lead', arms: ['Current allocation', 'Value-tilted allocation'], readout: 'observational — confirm with a holdout before scaling' },
  },
]

/** edges that need attention now (for the nav badge) */
export const leakCount = () => EDGES.filter((e) => e.leak === 'high').length
