import { formAnalysis, pageBehavior } from './behavior'
import type { Page } from './samurai'

/* ============================================================================
   Visitor Intelligence — the distinct WAYS visitors decide, where interested
   ones slip away, and which behaviours separate converters from the rest.

   Two capabilities:
     • journeyPatterns(p) — recurring journey archetypes, tagged converting /
       opportunity / repeated-comparison / friction, each with a confidence level
       and performance relative to the page average.
     • conversionDrivers(p) — behavioural signals ASSOCIATED with conversion
       (positive / negative / combination), ranked by lift. Association, not cause.

   Determinism: in production this is sequence-mining + attribution over the
   behaviour-capture tag's real event stream. In this prototype both are derived
   from each page's reconciled aggregates (seeded, reconciling) and labelled
   illustrative; any recommended change is to be validated with an A/B test.
   ========================================================================== */

function rng(seed: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
  return () => { h += 0x6d2b79f5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const conf = (v: number): Confidence => (v >= 120 ? 'strong' : v >= 40 ? 'emerging' : 'hypothesis')

export type PatternKind = 'converting' | 'opportunity' | 'comparison' | 'friction'
export type Confidence = 'strong' | 'emerging' | 'hypothesis'
export interface VPattern {
  id: string
  kind: PatternKind
  name: string
  blurb: string
  journey: string[]
  journeys: number            // journeys exhibiting the pattern (≈ sessions, not unique people)
  converters?: number
  convRatePct?: number
  shareOfConvPct?: number
  relMultiple?: number        // group conv rate ÷ page conv rate
  lastStage?: string
  sections?: [string, string]
  form?: { filled: string[]; stall: string }
  evidence?: string
  investigate?: string
  confidence: Confidence
  topDevice: string
  topChannel: string
  action: string
  sessionIds: string[]
}
export interface VisitorIntel {
  status: 'ok' | 'thin' | 'no_traffic' | 'closed'
  journeysAnalysed: number
  baselineConvPct: number
  patterns: VPattern[]
  reason?: string
}

function gate(p: Page, sessions: number, leads: number): VisitorIntel | null {
  if (p.draft || sessions === 0) return { status: 'no_traffic', journeysAnalysed: 0, baselineConvPct: 0, patterns: [], reason: 'No visitor journeys yet — patterns appear once this page gathers traffic.' }
  if (p.fault === 'closed_intake') return { status: 'closed', journeysAnalysed: sessions, baselineConvPct: 0, patterns: [], reason: 'Intake on this page is closed — handle the live spend from Alerts.' }
  if (sessions < 120) return { status: 'thin', journeysAnalysed: sessions, baselineConvPct: leads ? +((leads / sessions) * 100).toFixed(1) : 0, patterns: [], reason: 'Not enough journeys yet to read patterns reliably.' }
  return null
}

export function visitorIntel(p: Page): VisitorIntel {
  const beh = pageBehavior(p)
  const sessions = beh.sessions
  const leads = p.leads
  const g = gate(p, sessions, leads)
  if (g) return g

  const r = rng(p.id + ':vi')
  const j = (spread: number) => 1 + (r() - 0.5) * spread
  const r2 = Math.round
  const baselineConvPct = +((leads / sessions) * 100).toFixed(1)
  const topDevice = [...beh.devices].sort((a, b) => b.sharePct - a.sharePct)[0]?.k ?? 'desktop'
  const channels = ['Google · Search', 'Meta · Prospecting', 'Google · Brand', 'Direct']
  const ch = () => channels[Math.floor(r() * channels.length)]
  const reach = beh.journey.find((s) => s.k === 'scroll')?.count ?? r2(sessions * 0.5)
  const formStart = beh.journey.find((s) => s.k === 'start')?.count ?? 0
  const converts = beh.sessionList.filter((s) => s.converted)
  const frictiony = beh.sessionList.filter((s) => s.tags.some((t) => ['rage click', 'form error', 'dead click', 'quick-back'].includes(t)))
  const leavers = beh.sessionList.filter((s) => !s.converted && s.tags.some((t) => t.includes('scrolled') || t === 'left'))
  const frictionyNC = frictiony.filter((s) => !s.converted)
  const pick = (list: typeof beh.sessionList, n = 3) => list.slice(0, n).map((s) => s.id)

  const patterns: VPattern[] = []

  if (leads > 0) {
    const defs = [
      { id: 'direct', name: 'Direct decision-makers', blurb: 'Decide fast, minimal exploration.', journey: ['Hero', 'Apply', 'Enquiry'], share: 0.16, w: 0.40, action: 'Keep the hero CTA prominent — test a sticky Apply button.' },
      { id: 'proof', name: 'Proof seekers', blurb: 'Want credibility before acting.', journey: ['Hero', 'Testimonials', 'Programme', 'Apply'], share: 0.15, w: 0.33, action: 'Test moving testimonials above the fold.' },
      { id: 'compare', name: 'Comparison shoppers', blurb: 'Weigh the details before deciding.', journey: ['Programme', 'Fees', 'FAQ', 'Apply'], share: 0.13, w: 0.27, action: 'Put fees beside programme details to shorten the compare loop.' },
    ]
    const ws = defs.map((d) => d.w * j(0.15))
    const wsum = ws.reduce((a, b) => a + b, 0)
    const raw = ws.map((w) => (leads * w) / wsum)
    const cv = raw.map((x) => Math.floor(x))
    let rem = leads - cv.reduce((a, b) => a + b, 0)
    const order = raw.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac)
    for (let k = 0; rem > 0 && order.length; k++, rem--) cv[order[k % order.length].i]++
    defs.forEach((d, i) => {
      const journeys = Math.max(cv[i] + 1, r2(sessions * d.share * j(0.2)))
      const convRatePct = +((cv[i] / journeys) * 100).toFixed(1)
      patterns.push({
        id: d.id, kind: 'converting', name: d.name, blurb: d.blurb, journey: d.journey,
        journeys, converters: cv[i], convRatePct, shareOfConvPct: r2((cv[i] / leads) * 100),
        relMultiple: baselineConvPct ? +(convRatePct / baselineConvPct).toFixed(1) : undefined,
        confidence: conf(journeys), topDevice, topChannel: ch(), action: d.action, sessionIds: pick(converts),
      })
    })
  }

  // form-level drop-off — the deepest, most actionable opportunity. High-intent visitors who
  // filled most of the form, then stalled on one field. Built from real form-field data: the
  // stall is the field they HESITATE longest on (a decision field), distinct from the biggest
  // raw drop the Forms lens flags. Shows exactly where to optimise the page/form.
  const fa = formAnalysis(p, beh)
  const ctaDrop = Math.max(0, formStart - leads)
  const SHORT: Record<string, string> = { 'Full name': 'Name', Email: 'Email', 'Phone number': 'Phone', 'Programme of interest': 'Programme' }
  const nonSubmit = fa.fields.filter((f) => f.kind !== 'submit')
  const stall = [...nonSubmit].filter((f) => f.dropped > 0).sort((a, b) => b.hesitationSec - a.hesitationSec)[0]
  if (fa.status === 'ok' && stall && stall.dropped >= 5) {
    const idx = nonSubmit.findIndex((f) => f.k === stall.k)
    const filled = nonSubmit.slice(0, idx).map((f) => f.label)
    patterns.push({
      id: 'form-staller', kind: 'opportunity', name: 'Form stallers',
      blurb: `Filled ${filled.map((l) => SHORT[l] ?? l).join(', ').toLowerCase()}, then stalled on ‘${stall.label}’.`,
      journey: ['Fees', 'Apply', ...filled.map((l) => SHORT[l] ?? l), SHORT[stall.label] ?? stall.label],
      journeys: stall.dropped, lastStage: stall.label, form: { filled, stall: stall.label },
      evidence: `Longest hesitation of any field · ${stall.blankPct}% leave it blank — they reach it ready to enquire but can’t decide.`,
      investigate: 'Does the page give enough to choose a programme before this step?',
      action: `Add programme guidance at ‘${stall.label}’ (or richer info on the programme page) so visitors can decide in place.`,
      confidence: conf(stall.dropped), topDevice, topChannel: ch(), sessionIds: pick(frictionyNC),
    })
  } else if (ctaDrop >= 8) patterns.push({
    id: 'cta-drop', kind: 'opportunity', name: 'CTA drop-offs', blurb: 'Started the enquiry, didn’t finish.', journey: ['Apply', 'Enquiry', 'Exit'],
    journeys: ctaDrop, lastStage: 'Enquiry form', confidence: conf(ctaDrop), topDevice, topChannel: ch(),
    investigate: 'Is there friction between the CTA and the form?',
    action: p.fault === 'broken_form' ? 'Fix the mobile form — Submit fails below 380px.' : 'Shorten the form and check the mobile Submit.',
    sessionIds: pick(frictionyNC),
  })

  const hiAband = Math.max(0, r2((reach - formStart) * (0.3 + r() * 0.15)))
  if (hiAband >= 15) patterns.push({
    id: 'hi-aband', kind: 'opportunity', name: 'High-intent abandoners', blurb: 'Explored fees & proof, then left.', journey: ['Fees', 'Testimonials', 'FAQ', 'Exit'],
    journeys: hiAband, lastStage: 'Fees', confidence: conf(hiAband), topDevice, topChannel: ch(),
    investigate: 'Is the next step after reviewing programme info clear enough?',
    action: 'Add a fees FAQ / value note beside pricing.', sessionIds: pick(leavers),
  })

  // repeated comparison vs evidence-backed friction
  const loopN = r2(beh.friction.quickBacks * (0.6 + r() * 0.5))
  const isFriction = p.fault === 'broken_form' || beh.friction.score >= 65
  if (beh.friction.score >= 28 || loopN >= 10) {
    const journeys = Math.max(loopN, 10)
    patterns.push(p.fault === 'broken_form'
      ? { id: 'loop', kind: 'friction', name: 'Repeated submit attempts', blurb: 'Click Submit again and again, nothing happens.', journey: ['Enquiry', 'Enquiry', 'Exit'], journeys, sections: ['Enquiry', 'Enquiry'], evidence: '0% of this group converts — the form is broken.', confidence: conf(journeys), topDevice, topChannel: ch(), action: 'Make Submit fire a request and show a confirmation.', sessionIds: pick(frictionyNC) }
      : { id: 'loop', kind: isFriction ? 'friction' : 'comparison', name: 'Repeated comparison', blurb: 'Bounce between fees and programme, then leave.', journey: ['Fees', 'Programme', 'Fees', 'Exit'], journeys, sections: ['Fees', 'Programme'], evidence: isFriction ? 'Higher exit than comparable journeys.' : 'Exit in line with the page — likely research, not friction.', confidence: conf(journeys), topDevice, topChannel: ch(), action: 'Show fees alongside programme value so visitors don’t bounce.', sessionIds: pick(frictionyNC) })
  }

  return { status: 'ok', journeysAnalysed: sessions, baselineConvPct, patterns }
}

/* ---------------- Conversion Drivers ---------------- */
export type DriverGroup = 'positive' | 'negative' | 'combination'
export interface Driver {
  id: string
  group: DriverGroup
  label: string
  lift: number
  strength: 'strong' | 'emerging'
  interpretation: string
  sessionIds: string[]
}
export interface ConversionDrivers {
  status: 'ok' | 'thin' | 'no_traffic' | 'closed'
  baselineConvPct: number
  drivers: Driver[]
  reason?: string
}

export function conversionDrivers(p: Page): ConversionDrivers {
  const beh = pageBehavior(p)
  const sessions = beh.sessions
  const leads = p.leads
  const g = gate(p, sessions, leads)
  if (g) return { status: g.status, baselineConvPct: g.baselineConvPct, drivers: [], reason: g.reason }

  const r = rng(p.id + ':cd')
  const lift = (base: number, spread: number) => +(base * (1 + (r() - 0.5) * spread)).toFixed(1)
  const baselineConvPct = +((leads / sessions) * 100).toFixed(1)
  const broken = p.fault === 'broken_form'
  const converts = beh.sessionList.filter((s) => s.converted)
  const frictiony = beh.sessionList.filter((s) => s.tags.some((t) => ['rage click', 'form error', 'dead click', 'quick-back'].includes(t)))
  const frictionyNC = frictiony.filter((s) => !s.converted)
  const pick = (list: typeof beh.sessionList, n = 3) => list.slice(0, n).map((s) => s.id)
  const drivers: Driver[] = []

  if (!broken) {
    drivers.push({ id: 'testimonials', group: 'positive', label: 'Viewed testimonials', lift: lift(2.1, 0.18), strength: 'strong', interpretation: 'Social proof lifts intent before the enquiry.', sessionIds: pick(converts) })
    drivers.push({ id: 'prospectus', group: 'positive', label: 'Downloaded the prospectus', lift: lift(1.7, 0.2), strength: 'strong', interpretation: 'Prospectus readers enquire more often.', sessionIds: pick(converts) })
    drivers.push({ id: 'return', group: 'positive', label: 'Returned a second time', lift: lift(1.5, 0.2), strength: 'emerging', interpretation: 'Some decide over more than one visit.', sessionIds: pick(converts) })
    drivers.push({ id: 'fees-prog', group: 'combination', label: 'Fees + programme together', lift: lift(1.8, 0.18), strength: 'strong', interpretation: 'Value lands when fees and programme are seen together.', sessionIds: pick(converts) })
    drivers.push({ id: 'test-fees', group: 'combination', label: 'Testimonials + fees', lift: lift(2.0, 0.2), strength: 'emerging', interpretation: 'Proof plus price clears the biggest doubts.', sessionIds: pick(converts) })
  }
  drivers.push({ id: 'form-err', group: 'negative', label: 'Hit a form error', lift: broken ? 0.1 : lift(0.35, 0.3), strength: 'strong', interpretation: broken ? 'The mobile form blocks every submit.' : 'Form errors stop otherwise-interested visitors.', sessionIds: pick(frictionyNC) })
  drivers.push({ id: 'cta-noprog', group: 'negative', label: 'Clicked CTA, no progress', lift: lift(0.5, 0.3), strength: broken ? 'strong' : 'emerging', interpretation: 'Clicking the CTA without reaching the form rarely converts.', sessionIds: pick(frictionyNC) })
  if (beh.friction.quickBacks >= sessions * 0.05) drivers.push({ id: 'loops', group: 'negative', label: 'Looped between sections', lift: lift(0.7, 0.2), strength: 'emerging', interpretation: 'Repeated back-and-forth often precedes an exit.', sessionIds: pick(frictionyNC) })

  return { status: 'ok', baselineConvPct, drivers }
}
