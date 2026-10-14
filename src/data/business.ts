/* Business / revenue model — the single source of truth for "what the spend returned."
   It turns the reconciled lead data into enrolments and revenue using two LABELLED inputs:
   the ticket size (the ₹ an enrolment pays — varies by programme, and by student via
   scholarship / EMI) and the close-rate (share of sales-qualified leads that enrol). Every figure
   reconciles to the account and to the Campaigns / Pages numbers. Deterministic, no AI. */
import { CAMPAIGNS, type Campaign } from './samurai'
import { inr } from '@/lib/utils'

// ---- the two labelled INPUTS (from finance / the CRM in production) --------------------------
/** average ticket size per programme = the ₹ an enrolment pays on average. Individual enrolments
 *  vary (scholarship / EMI / specialisation) and sync from the AMS in production — we don't model
 *  per-student tickets here; this mean is what we show. Varies by programme. */
const TICKET: Record<string, number> = {
  mba: 170000, mbajul: 170000, mca: 150000, bba: 120000, bca: 110000,
  home: 120000, mcom: 100000, bcom: 100000, bsc: 95000, ba: 80000,
}
/** share of sales-qualified leads that enrol and pay */
export const CLOSE_RATE = 0.34

/** average ticket size for a programme page (falls back to a sensible default) */
export const ticketSize = (pageId: string) => TICKET[pageId] ?? 100000


/** compact ₹ for big revenue figures: ₹6.2L, ₹1.20Cr, ₹9,393 */
export const money = (v: number) => (v >= 10000000 ? `₹${(v / 10000000).toFixed(2)}Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : inr(v))

const r = Math.round

export interface Biz {
  spend: number
  leads: number
  qualified: number
  enrolled: number
  revenue: number
  cac: number | null // cost to acquire one enrolment = spend ÷ enrolled
  roas: number // ₹ returned per ₹ spent = revenue ÷ spend
  avgTicket: number | null // revenue ÷ enrolled
}

/** roll a set of campaigns up into the business outcome, rounding per-campaign so every
 *  page/campaign view reconciles with the account total. */
function roll(cs: Campaign[]): Biz {
  let spend = 0, leads = 0, qualified = 0, enrolled = 0, revenue = 0
  for (const c of cs) {
    spend += c.spend
    leads += c.leads
    const q = r(c.leads * c.good)
    qualified += q
    const e = r(q * CLOSE_RATE)
    enrolled += e
    revenue += e * ticketSize(c.pageId)
  }
  return {
    spend, leads, qualified, enrolled, revenue,
    cac: enrolled ? r(spend / enrolled) : null,
    roas: spend ? +(revenue / spend).toFixed(1) : 0,
    avgTicket: enrolled ? r(revenue / enrolled) : null,
  }
}

/** business outcome for one campaign */
export const campaignBiz = (c: Campaign): Biz => roll([c])
/** the campaigns that drive a page (a page can have several) */
export const campaignsForPage = (pageId: string): Campaign[] => CAMPAIGNS.filter((c) => c.pageId === pageId)
/** business outcome for a programme page (sums the campaigns that drive it) */
export const pageBiz = (pageId: string): Biz => roll(campaignsForPage(pageId))
/** the whole account — reconciles to ₹6,20,009 spend · 66 enrolments · ₹78.25L revenue · 12.6× ROAS */
export const accountBiz = (): Biz => roll(CAMPAIGNS)

/** a page's blended lead→qualified rate (from its campaigns) — for projecting experiment revenue */
export const pageGoodRate = (pageId: string): number => {
  const b = pageBiz(pageId)
  return b.leads ? b.qualified / b.leads : 0.5
}
/** project a Biz from raw leads on a page: leads → qualified → enrolled → revenue × ticket.
 *  Used by experiments to turn each version's leads into projected enrolment revenue. */
export function bizFromLeads(pageId: string, spend: number, leads: number): Biz {
  const qualified = r(leads * pageGoodRate(pageId))
  const enrolled = r(qualified * CLOSE_RATE)
  const revenue = enrolled * ticketSize(pageId)
  return { spend, leads, qualified, enrolled, revenue, cac: enrolled ? r(spend / enrolled) : null, roas: spend ? +(revenue / spend).toFixed(1) : 0, avgTicket: enrolled ? r(revenue / enrolled) : null }
}
