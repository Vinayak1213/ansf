/* Lead Opportunities — "where you're losing leads": the fixable, on-page conversion issues that keep
   visitors you already paid for from becoming leads. A conversion DIAGNOSTIC, deliberately NOT an
   alerts feed — Smart Alerts owns money monitoring (dead spend, CPL outliers, pacing); this owns the
   page experience (device, form fields, scroll reach, friction) and how to fix it.

   Measured facts only — no estimated uplift, no generated narrative. Each finding carries the real
   numbers behind it, a small `viz` spec so the UI can SHOW the gap, the real ad spend reaching the
   affected visitors when that's cleanly attributable, and the recommended fix. Everything is a
   deterministic read of the page's own reconciled data (visits, leads, spend, device split, scroll,
   form funnel). In production this is a scheduled rules job per page — no AI. Validate fixes with
   an A/B test. */
import { PAGES, type Page } from './samurai'
import { pageBehavior, formAnalysis } from './behavior'

export type IssueKind = 'device' | 'form' | 'validation' | 'slowfield' | 'reach' | 'bounce' | 'friction'

export interface VizRow { label: string; value: string; pct: number; tone: 'bad' | 'base' | 'good' }
export type Viz =
  | { type: 'compare'; rows: VizRow[] }
  | { type: 'meter'; value: string; pct: number; caption: string }
  | null

export interface Finding {
  k: IssueKind
  prio: number // ordering only (0 strongest … 2 weakest) — never shown as a severity chip
  weight: number // ordering only — the measured count of affected visitors
  title: string // the opportunity, named plainly
  detail: string // the measured evidence behind it
  viz: Viz // a small visual spec the UI renders inline to SHOW the gap
  money: number | null // real ad spend reaching the affected visitors (₹), when cleanly attributable
  action: string // the recommended fix
  pageId?: string
  pageName?: string
}

export interface LeadOpps {
  scope: string
  status: 'ok' | 'healthy' | 'thin' | 'no_traffic' | 'closed'
  reason?: string
  visits: number
  leads: number
  convRatePct: number
  issueCount: number
  topLine: string
  findings: Finding[]
}

const DEVICE_LABEL: Record<string, string> = { mobile: 'mobile', desktop: 'desktop', tablet: 'tablet' }
const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n)
const pct1 = (n: number) => Math.round(n * 10) / 10
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const bar = (pct: number) => Math.max(2, Math.min(100, pct))

/* the measured, fixable on-page issues on a single page, biggest gap first.
   Closed intake is NOT handled here — that's a spend decision Smart Alerts owns, not a page fix. */
function pageFindings(p: Page): Finding[] {
  if (!p.visits || p.draft || p.fault === 'closed_intake') return []
  const beh = pageBehavior(p)
  const fa = formAnalysis(p, beh)
  const broken = p.fault === 'broken_form'
  const spendFrac = (f: number) => Math.round(p.spend * f)
  const out: Finding[] = []

  // --- 1. a device converting at half the best device's rate or worse (real breakage, not normal mobile variance) ---
  const best = Math.max(...beh.devices.map((d) => d.convPct), 0.1)
  const bestDev = beh.devices.find((d) => d.convPct === best)
  const worst = beh.devices
    .filter((d) => d.sharePct >= 15 && d.convPct <= best * 0.5)
    .sort((a, b) => a.convPct - b.convPct)[0]
  if (worst && bestDev && bestDev.k !== worst.k) {
    const visitorsN = Math.round((p.visits * worst.sharePct) / 100)
    const isMobileBreak = broken && worst.k === 'mobile'
    const dl = DEVICE_LABEL[worst.k] ?? worst.k
    const bl = DEVICE_LABEL[bestDev.k] ?? 'desktop'
    const scale = Math.max(best, 0.1)
    out.push({
      k: 'device', prio: 0, weight: visitorsN,
      title: isMobileBreak ? 'Mobile visitors can’t convert' : `Low conversion on ${dl}`,
      detail: `${cap(dl)} is ${worst.sharePct}% of your traffic but converts far below ${bl}${isMobileBreak ? ' — the form fails below 380px' : ''}.`,
      viz: { type: 'compare', rows: [
        { label: cap(dl), value: worst.convPct <= 0.1 ? '0%' : `${pct1(worst.convPct)}%`, pct: bar((worst.convPct / scale) * 100), tone: 'bad' },
        { label: cap(bl), value: `${pct1(best)}%`, pct: 100, tone: 'good' },
      ] },
      money: spendFrac(worst.sharePct / 100),
      action: isMobileBreak ? 'Fix form submission on mobile — test the submit step below 380px width.' : `Debug the ${dl} layout and form; something there is blocking conversion.`,
    })
  }

  // --- 2. the form field that loses the most would-be leads ---
  if (!broken && fa.status === 'ok' && fa.started >= 20 && fa.totalAbandons >= 10 && fa.killerK) {
    const killer = fa.fields.find((f) => f.k === fa.killerK)!
    const dropPct = fa.started ? Math.round((fa.totalAbandons / fa.started) * 100) : 0
    out.push({
      k: 'form', prio: 0, weight: fa.totalAbandons,
      title: `“${killer.label}” loses the most leads`,
      detail: `${dropPct}% of people who start the form never finish — the single biggest drop is at “${killer.label}”.`,
      viz: { type: 'compare', rows: [
        { label: 'Start', value: fmt(fa.started), pct: 100, tone: 'base' },
        { label: 'Finish', value: fmt(fa.completed), pct: bar((fa.completed / fa.started) * 100), tone: 'good' },
      ] },
      money: null,
      action: `Make “${killer.label}” optional or relax its validation — it’s where the form sheds the most people.`,
    })
  }

  // --- 3. high-intent visitors blocked at submit by a validation error ---
  if (fa.failedSubmits >= 12) {
    out.push({
      k: 'validation', prio: 0, weight: fa.failedSubmits,
      title: 'People are blocked at submit',
      detail: `${fmt(fa.failedSubmits)} visitors filled the form and pressed submit, but a validation error stopped them.`,
      viz: null, money: null,
      action: 'Loosen validation on the last step — accept common phone and email formats, and show errors inline before submit.',
    })
  }

  // --- 4. a field that is slow or re-typed (effort friction, distinct from the drop-off field) ---
  if (!broken && fa.status === 'ok') {
    const slow = fa.fields
      .filter((f) => f.kind !== 'submit' && f.k !== fa.killerK)
      .sort((a, b) => b.medianSec + b.corrections - (a.medianSec + a.corrections))[0]
    if (slow && (slow.medianSec >= 10 || slow.correctionPct >= 7)) {
      out.push({
        k: 'slowfield', prio: 2, weight: slow.corrections,
        title: `“${slow.label}” is slow to fill`,
        detail: `Visitors spend about ${slow.medianSec}s on “${slow.label}” and ${slow.correctionPct}% re-enter it — a sign it’s fiddly${slow.kind === 'select' ? ', especially on mobile' : ''}.`,
        viz: null, money: null,
        action: slow.kind === 'select'
          ? `Shorten the “${slow.label}” dropdown or make it searchable — long selects are slow on mobile.`
          : `Simplify “${slow.label}” — add an input mask or an example so people get it right first time.`,
      })
    }
  }

  // --- 5. the form sits too far down the page ---
  const reach = beh.scroll.formReachPct
  if (!broken && reach < 52) {
    out.push({
      k: 'reach', prio: 1, weight: Math.round((p.visits * (100 - reach)) / 100),
      title: 'Most visitors never see the form',
      detail: `Only ${reach}% of visitors scroll far enough to reach the form — the rest leave before they ever see it.`,
      viz: { type: 'meter', value: `${reach}%`, pct: reach, caption: 'reach the form' },
      money: null,
      action: 'Put the form, or a “book a call” button, above the fold so arrivals see it straight away.',
    })
  }

  // --- 6. visitors bouncing within seconds — usually an ad-to-page message mismatch ---
  const quick = beh.friction.quickBacks
  if (!broken && (beh.engagement.bouncePct >= 55 || quick >= p.visits * 0.1)) {
    out.push({
      k: 'bounce', prio: 1, weight: quick,
      title: 'Visitors leave within seconds',
      detail: `${fmt(quick)} visitors bounce almost immediately — often a sign the page doesn’t match what the ad promised.`,
      viz: { type: 'meter', value: `${beh.engagement.bouncePct}%`, pct: beh.engagement.bouncePct, caption: 'bounce quickly' },
      money: spendFrac(quick / p.visits),
      action: 'Match the page headline and offer to the ad they clicked, so arrivals immediately see what they came for.',
    })
  }

  // --- 7. an element people rage-click (it should respond but doesn’t) ---
  const worstEl = beh.friction.worstEl ? beh.elements.find((e) => e.k === beh.friction.worstEl) : undefined
  if (worstEl && worstEl.rage >= Math.max(25, p.visits * 0.03)) {
    out.push({
      k: 'friction', prio: 2, weight: worstEl.rage,
      title: `“${worstEl.label}” frustrates visitors`,
      detail: `${fmt(worstEl.rage)} visitors clicked “${worstEl.label}” over and over — it isn’t responding the way they expect.`,
      viz: null, money: null,
      action: `Check that “${worstEl.label}” works on tap and gives immediate feedback (loading, success, error).`,
    })
  }

  return out.sort(byRank)
}

const byRank = (a: Finding, b: Finding) => a.prio - b.prio || b.weight - a.weight

const _cache: Record<string, LeadOpps> = {}
export function leadOpportunities(pageId?: string): LeadOpps {
  const key = pageId ?? 'account'
  if (_cache[key]) return _cache[key]
  const res = pageId ? forPage(pageId) : forAccount()
  return (_cache[key] = res)
}

const plural = (n: number) => (n === 1 ? 'gap' : 'gaps')

function forPage(pageId: string): LeadOpps {
  const p = PAGES.find((x) => x.id === pageId)
  if (!p) return blank(pageId)
  const convRatePct = p.visits ? pct1((p.leads / p.visits) * 100) : 0
  if (!p.visits || p.draft) return { ...blank(pageId), status: 'no_traffic', reason: 'No traffic on this page yet — opportunities appear once visitors arrive.', visits: p.visits, leads: p.leads, convRatePct }
  if (p.fault === 'closed_intake') return { ...blank(pageId), status: 'closed', reason: 'Intake on this page is closed, so there’s nothing to optimise right now — handle the live spend from Smart Alerts.', visits: p.visits, leads: p.leads, convRatePct }
  if (p.visits < 150) return { ...blank(pageId), status: 'thin', reason: 'Not enough visitors yet to spot issues reliably — this fills in as traffic builds.', visits: p.visits, leads: p.leads, convRatePct }

  const findings = pageFindings(p).slice(0, 4)
  if (findings.length === 0) {
    return { scope: pageId, status: 'healthy', visits: p.visits, leads: p.leads, convRatePct, issueCount: 0, topLine: `No conversion issues stand out — this page turns ${convRatePct}% of visitors into leads cleanly.`, findings: [] }
  }
  return { scope: pageId, status: 'ok', visits: p.visits, leads: p.leads, convRatePct, issueCount: findings.length, topLine: `This page turns ${convRatePct}% of visitors into leads. Here’s where the rest slip away — ${findings.length} fixable ${plural(findings.length)}, biggest first.`, findings }
}

function forAccount(): LeadOpps {
  const withTraffic = PAGES.filter((p) => p.visits && !p.draft) // incl. closed/broken, for the reconciling totals
  const visits = withTraffic.reduce((s, p) => s + p.visits, 0)
  const leads = withTraffic.reduce((s, p) => s + p.leads, 0)
  const convRatePct = visits ? pct1((leads / visits) * 100) : 0

  // every finding across the account's pages, strongest first, then pick greedily so no KIND and no
  // PAGE repeats — the account view spreads across pages AND shows a variety of lead-leaks, instead of
  // the same card per page or three symptoms of one broken page. (The page detail still shows all of a
  // page's issues.)
  const all: Finding[] = []
  for (const p of withTraffic) for (const f of pageFindings(p)) all.push({ ...f, pageId: p.id, pageName: p.name })
  all.sort(byRank)
  const usedKind = new Set<IssueKind>()
  const usedPage = new Set<string>()
  const findings: Finding[] = []
  for (const f of all) {
    if (usedKind.has(f.k) || usedPage.has(f.pageId!)) continue
    usedKind.add(f.k); usedPage.add(f.pageId!); findings.push(f)
    if (findings.length === 4) break
  }
  if (findings.length === 0) {
    return { scope: 'account', status: 'healthy', visits, leads, convRatePct, issueCount: 0, topLine: 'No conversion issues stand out across your pages right now.', findings: [] }
  }
  return { scope: 'account', status: 'ok', visits, leads, convRatePct, issueCount: findings.length, topLine: 'The biggest ways to win more leads from the traffic you already pay for — each on the page where it costs most.', findings }
}

const blank = (scope: string): LeadOpps => ({ scope, status: 'thin', visits: 0, leads: 0, convRatePct: 0, issueCount: 0, topLine: '', findings: [] })
