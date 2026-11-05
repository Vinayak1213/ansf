import { pageBehavior } from './behavior'
import { pageBiz } from './business'
import { pageAds, pageWeekly } from './pages'
import type { Page } from './samurai'
import type { StepSource } from './funnels'

/* ============================================================================
   Metric catalog — the data a dashboard widget can be built from, presented the
   same searchable, source-grouped way the funnel builder uses. Every value is
   measured and reconciles to the page's own totals (no modelled or invented data),
   so any chart the user assembles is as trustworthy as the headline numbers.

   `ratio` metrics (cost per lead, return, conversion %) are not scaled by the date
   range; counts and money are. `group`/`source` drive the picker's grouping + icon.
   ========================================================================== */

export interface Point { label: string; value: number }
export interface Metric { id: string; label: string; money?: boolean; pct?: boolean; ratio?: boolean; group: string; source: StepSource }

/* ---- single value (KPI) ---- */
export const KPI_METRICS: Metric[] = [
  { id: 'spend', label: 'Spend', money: true, group: 'Ad spend', source: 'ad' },
  { id: 'clicks', label: 'Ad clicks', group: 'Ad spend', source: 'ad' },
  { id: 'visits', label: 'Visits', group: 'Website activity', source: 'tag' },
  { id: 'leads', label: 'Leads', group: 'Website activity', source: 'tag' },
  { id: 'cpl', label: 'Cost per lead', money: true, ratio: true, group: 'CRM & revenue', source: 'crm' },
  { id: 'qualified', label: 'Qualified leads', group: 'CRM & revenue', source: 'crm' },
  { id: 'enrolled', label: 'Enrolments', group: 'CRM & revenue', source: 'crm' },
  { id: 'revenue', label: 'Revenue', money: true, group: 'CRM & revenue', source: 'finance' },
  { id: 'roas', label: 'Return on ad spend', ratio: true, group: 'CRM & revenue', source: 'finance' },
]
export function kpiValue(p: Page, id: string): number | null {
  const b = pageBiz(p.id)
  switch (id) {
    case 'spend': return p.spend
    case 'clicks': return p.clicks
    case 'visits': return p.visits
    case 'leads': return p.leads
    case 'cpl': return p.leads ? Math.round(p.spend / p.leads) : null // ₹0 would read as "free" — show the honest empty state
    case 'qualified': return b.qualified
    case 'enrolled': return b.enrolled
    case 'revenue': return b.revenue
    case 'roas': return b.roas
    default: return 0
  }
}

/* ---- over time (trend) ---- */
export const TREND_METRICS: Metric[] = [
  { id: 'spend', label: 'Spend', money: true, group: 'Ad spend', source: 'ad' },
  { id: 'clicks', label: 'Ad clicks', group: 'Ad spend', source: 'ad' },
  { id: 'visits', label: 'Visits', group: 'Website activity', source: 'tag' },
  { id: 'leads', label: 'Leads', group: 'Website activity', source: 'tag' },
  { id: 'cpl', label: 'Cost per lead', money: true, ratio: true, group: 'CRM & revenue', source: 'crm' },
  { id: 'enrolled', label: 'Enrolments', group: 'CRM & revenue', source: 'crm' },
  { id: 'revenue', label: 'Revenue', money: true, group: 'CRM & revenue', source: 'finance' },
]

/** spread a measured total across the 13 weeks using an existing series' shape, so the weekly
 *  figures sum back to the real total (reconciled) — the shape is illustrative, the total is not.
 *  Uses the largest-remainder method, so every weekly value is a non-negative integer. */
function distribute(total: number, shape: number[]): number[] {
  const t = Math.max(0, Math.round(total))
  const w = shape.map((v) => Math.max(0, v || 0))
  const sum = w.reduce((a, b) => a + b, 0) || w.length || 1
  const exact = w.map((v) => (t * v) / sum)
  const out = exact.map((x) => Math.floor(x))
  let rem = t - out.reduce((a, b) => a + b, 0)
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < order.length && rem > 0; k++, rem--) out[order[k].i]++
  return out
}
export function trendSeries(p: Page, id: string): Point[] {
  const wk = pageWeekly(p)
  const b = pageBiz(p.id)
  let arr: number[]
  switch (id) {
    case 'spend': arr = wk.spend; break
    case 'leads': if (!p.leads) return []; arr = wk.leads; break
    case 'cpl': if (!p.leads) return []; arr = wk.cpl; break
    case 'clicks': arr = distribute(p.clicks, wk.spend); break
    case 'visits': arr = distribute(p.visits, wk.spend); break
    case 'enrolled': arr = distribute(b.enrolled, wk.leads); break
    case 'revenue': arr = distribute(b.revenue, wk.leads); break
    default: return []
  }
  return arr.map((v, i) => ({ label: `W${i + 1}`, value: v }))
}

/* ---- breakdowns (bar / split) ---- */
export const BREAKDOWN_SOURCES: Metric[] = [
  { id: 'spend_ad', label: 'Spend', money: true, group: 'Across ads', source: 'ad' },
  { id: 'leads_ad', label: 'Leads', group: 'Across ads', source: 'ad' },
  { id: 'cpl_ad', label: 'Cost per lead', money: true, ratio: true, group: 'Across ads', source: 'ad' },
  { id: 'sessions_device', label: 'Sessions', group: 'Across devices', source: 'tag' },
  { id: 'conv_device', label: 'Conversion rate', pct: true, ratio: true, group: 'Across devices', source: 'tag' },
]
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export function breakdownSeries(p: Page, id: string): Point[] {
  if (id.endsWith('_ad')) {
    return pageAds(p).map((a) => ({
      label: a.name.replace(/^Search — /, ''),
      value: id === 'spend_ad' ? a.spend : id === 'leads_ad' ? a.leads : (a.cpl ?? 0),
    }))
  }
  return pageBehavior(p).devices.map((d) => ({ label: cap(d.k), value: id === 'sessions_device' ? Math.round((p.visits * d.sharePct) / 100) : d.convPct }))
}

/* ---- custom field (mapped to a CRM field, same honesty as a custom funnel stage) ---- */
/** The four fields the demo CRM populates; any other mapped field has no data yet → `null`
 *  (the honest "awaiting sync" state, exactly like a custom funnel stage). */
export function crmFieldValue(p: Page, field: string): number | null {
  const b = pageBiz(p.id)
  switch (field) {
    case 'sales_qualified': return b.qualified
    case 'registration_paid': return Math.min(b.qualified, Math.round(b.enrolled * 1.3))
    case 'fee_paid': return b.enrolled
    case 'revenue': return b.revenue
    case 'leads': return p.leads
    default: return null
  }
}
export const customIsMoney = (field?: string) => field === 'revenue'
export function customTrendSeries(p: Page, field: string): Point[] {
  const total = crmFieldValue(p, field)
  if (total == null) return []
  return distribute(total, pageWeekly(p).leads).map((v, i) => ({ label: `W${i + 1}`, value: v }))
}

/** metric metadata by catalog + id, for formatting a resolved value */
export function metricMeta(group: 'kpi' | 'trend' | 'breakdown', id: string): Metric | undefined {
  const list = group === 'kpi' ? KPI_METRICS : group === 'trend' ? TREND_METRICS : BREAKDOWN_SOURCES
  return list.find((m) => m.id === id)
}
