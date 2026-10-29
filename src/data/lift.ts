/* Behaviour-to-outcome lift — "what converters do differently". The flagship of the user-level
   layer: it joins Samurai's anonymous behaviour to the CRM outcome, so it shows something neither
   tool has alone — with no PII.

   WHERE THE VARIABLES COME FROM (industry-agnostic, PLG — nothing is hand-defined per tenant):
   1. A UNIVERSAL behaviour catalog (returned, reached the form, long session, bounced, rage-clicked,
      form error) — autocaptured for any page in any industry, no setup.
   2. PAGE-SPECIFIC element signals pulled DYNAMICALLY from that page's own tracked elements
      (beh.elements: Apply Now, Download prospectus, WhatsApp…; on a SaaS page it would be Book a
      demo, on e-commerce Add to cart). The conversion element (the form) is excluded — clicking it
      IS converting, so it can't predict converting.

   HONEST SPLIT (prototype): PREVALENCE (who does each behaviour) is MEASURED from the page's real
   sessions, so it varies page to page. The LIFT (association with converting) is modelled here and
   would be measured from the behaviour→CRM join in production. Deterministic, reconciles to the
   scope's base conversion rate; framed as association, not causation; thin cohorts degrade honestly. */
import { PAGES, ACCOUNT } from './samurai'
import { accountBiz, pageBiz } from './business'
import { pageBehavior } from './behavior'

const MIN_COHORT = 30 // a behaviour with fewer visitors than this (either side) is "insufficient signal"
const MIN_TOTAL = 150 // a scope with fewer visitors than this can't support the comparison

function rng(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h >>> 0) % 100000) / 100000 }
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export interface LiftRow {
  k: string
  label: string
  dir: 'pos' | 'neg'
  measured: boolean // prevalence derived from real behaviour (vs modelled in the prototype)
  prevalencePct: number
  didN: number
  didRatePct: number
  notRatePct: number
  lift: number // × on becoming a lead
  enrolLift: number // × on the paid outcome (via the CRM join)
}

export interface LiftResult {
  scope: string // 'account' or a pageId
  status: 'ok' | 'no_conversion' | 'thin'
  reason?: string
  rows: LiftRow[]
  pos: LiftRow[]
  neg: LiftRow[]
  suppressed: number // signals hidden for small sample
  totalVisitors: number
  leads: number
  baseRatePct: number
  topPos?: LiftRow
  topNeg?: LiftRow
}

/* A behavioural profile for the scope, with prevalences taken from REAL behaviour where we can. */
interface Profile {
  scope: string
  total: number
  leads: number
  enrolled: number
  broken: boolean
  formReach: number // share who reached the form (real)
  bounce: number // share who bounced (real-ish)
  rageRate: number // rage clicks ÷ sessions (real)
  elements: { k: string; label: string; ctr: number }[] // dynamic, from the page's tracked elements
}

function profileFor(pageId?: string): Profile {
  if (!pageId) {
    // account: aggregate every page's real behaviour
    let total = 0, rage = 0, formReachW = 0, bounceW = 0
    const clicks: Record<string, { label: string; c: number }> = {}
    for (const p of PAGES) {
      const beh = pageBehavior(p)
      total += beh.sessions
      rage += beh.friction.rageClicks
      formReachW += beh.scroll.formReachPct * beh.sessions
      bounceW += beh.engagement.bouncePct * beh.sessions
      for (const e of beh.elements) {
        if (e.k === 'form') continue
        clicks[e.k] = clicks[e.k] ? { label: e.label, c: clicks[e.k].c + e.clicks } : { label: e.label, c: e.clicks }
      }
    }
    return {
      scope: 'account', total, leads: ACCOUNT.leads, enrolled: accountBiz().enrolled, broken: false,
      formReach: total ? formReachW / total / 100 : 0,
      bounce: total ? bounceW / total / 100 : 0,
      rageRate: total ? rage / total : 0,
      elements: Object.entries(clicks).map(([k, v]) => ({ k, label: v.label, ctr: total ? v.c / total : 0 })),
    }
  }
  const p = PAGES.find((x) => x.id === pageId)
  if (!p) return { scope: pageId, total: 0, leads: 0, enrolled: 0, broken: false, formReach: 0, bounce: 0, rageRate: 0, elements: [] }
  const beh = pageBehavior(p)
  return {
    scope: pageId, total: p.visits, leads: p.leads, enrolled: pageBiz(pageId).enrolled, broken: p.fault === 'broken_form',
    formReach: beh.scroll.formReachPct / 100,
    bounce: beh.engagement.bouncePct / 100,
    rageRate: p.visits ? beh.friction.rageClicks / p.visits : 0,
    elements: beh.elements.filter((e) => e.k !== 'form' && e.clicks > 0).map((e) => ({ k: e.k, label: e.label, ctr: p.visits ? e.ctrPct / 100 : 0 })),
  }
}

// element → modelled base lift + display label (the page supplies the element; this maps intent strength)
const EL_LIFT: Record<string, number> = { apply: 2.6, prospectus: 3.1, callback: 2.2, whatsapp: 2.0, call: 2.0 }
const elLabelFor = (k: string, label: string) => (k === 'prospectus' ? 'Downloaded a resource' : `Clicked "${label}"`)

interface Raw { k: string; label: string; dir: 'pos' | 'neg'; m: number; prev: number; measured: boolean }

function rawSignals(prof: Profile): Raw[] {
  const out: Raw[] = []
  // universal catalog
  out.push({ k: 'reachedform', label: 'Reached the form', dir: 'pos', m: 1.8, prev: clamp(prof.formReach, 0.2, 0.9), measured: true })
  out.push({ k: 'return', label: 'Came back a 2nd+ time', dir: 'pos', m: 2.8, prev: 0.16, measured: false })
  out.push({ k: 'long', label: 'Spent 2+ minutes on page', dir: 'pos', m: 1.9, prev: 0.24, measured: false })
  out.push({ k: 'pricing', label: 'Viewed the pricing', dir: 'pos', m: 2.3, prev: 0.22, measured: false })
  out.push({ k: 'bounce', label: 'Bounced in under 10s', dir: 'neg', m: 0.15, prev: clamp(prof.bounce * 0.45, 0.05, 0.4), measured: true })
  out.push({ k: 'formerr', label: 'Hit a form error', dir: 'neg', m: 0.3, prev: prof.broken ? 0.5 : 0.05, measured: true })
  out.push({ k: 'rage', label: 'Rage-clicked', dir: 'neg', m: 0.4, prev: clamp(prof.rageRate, 0.01, 0.3), measured: true })
  // dynamic page element signals
  for (const e of prof.elements) {
    out.push({ k: `el-${e.k}`, label: elLabelFor(e.k, e.label), dir: 'pos', m: EL_LIFT[e.k] ?? 1.6, prev: clamp(e.ctr, 0.01, 0.6), measured: true })
  }
  return out
}

const _cache: Record<string, LiftResult> = {}
export function converterLift(pageId?: string): LiftResult {
  const key = pageId ?? 'account'
  if (_cache[key]) return _cache[key]
  const prof = profileFor(pageId)
  const total = prof.total
  const base = total ? prof.leads / total : 0
  const emptyRes = (status: LiftResult['status'], reason: string): LiftResult =>
    ({ scope: key, status, reason, rows: [], pos: [], neg: [], suppressed: 0, totalVisitors: total, leads: prof.leads, baseRatePct: +(base * 100).toFixed(1) })

  if (prof.leads === 0 || base === 0) return (_cache[key] = emptyRes('no_conversion', 'No conversions on this page yet — the lift needs conversions to compare against. See the funnel and friction below for where it is losing people.'))
  if (total < MIN_TOTAL) return (_cache[key] = emptyRes('thin', 'Not enough sessions yet to compare behaviours — this fills in as traffic builds.'))

  let suppressed = 0
  const rows: LiftRow[] = []
  for (const s of rawSignals(prof)) {
    const j = 1 + (rng(key + ':' + s.k)() - 0.5) * 0.2 // ±10% per-scope jitter so pages differ, deterministically
    const m = s.dir === 'pos' ? Math.max(1.1, s.m * j) : Math.min(0.85, s.m * j)
    const me = s.dir === 'pos' ? m * 1.12 : m * 0.82
    const p = clamp(s.prev, 0.02, 0.92)
    const didN = Math.round(p * total)
    const notN = total - didN
    if (didN < MIN_COHORT || notN < MIN_COHORT) { suppressed++; continue } // insufficient signal
    const rNot = base / (p * m + (1 - p))
    const rDid = m * rNot
    rows.push({
      k: s.k, label: s.label, dir: s.dir, measured: s.measured,
      prevalencePct: +(p * 100).toFixed(0),
      didN,
      didRatePct: +(Math.min(rDid, 0.99) * 100).toFixed(1),
      notRatePct: +(Math.min(rNot, 0.99) * 100).toFixed(1),
      lift: +m.toFixed(1),
      enrolLift: +me.toFixed(1),
    })
  }

  const pos = rows.filter((r) => r.dir === 'pos').sort((a, b) => b.lift - a.lift)
  const neg = rows.filter((r) => r.dir === 'neg').sort((a, b) => a.lift - b.lift)
  if (pos.length + neg.length < 2) return (_cache[key] = emptyRes('thin', 'Not enough behaviours clear the sample-size floor yet — this sharpens as traffic builds.'))

  const res: LiftResult = {
    scope: key, status: 'ok', rows: [...pos, ...neg], pos, neg, suppressed,
    totalVisitors: total, leads: prof.leads, baseRatePct: +(base * 100).toFixed(1),
    topPos: pos[0], topNeg: neg[0],
  }
  return (_cache[key] = res)
}
