/* On-page behavioral data — the "Behavior" lens, kept separate from the revenue lens.
   Everything derives from a page's REAL traffic (visits = sessions, leads = form submits)
   and its fault, so the behavior story reconciles with the economics and the leak model:
   e.g. B.Com (broken_form, 1840 visits → 0 leads) shows the rage-click / mobile-fail signature. */
import { PAGE_ELEMENTS, elLabel } from './templates'
import { PAGES, type Experiment, type Page } from './samurai'

export type Device = 'desktop' | 'mobile' | 'tablet'

export interface ElEngagement { k: string; label: string; clicks: number; ctrPct: number; dead: number; rage: number }
export interface JourneyStep { k: string; label: string; count: number; pct: number; avgSecFromPrev: number }
export interface Branch { k: string; label: string; count: number }
export interface DeviceSplit { k: Device; sharePct: number; convPct: number }
export interface BehSession { id: string; device: Device; source: string; durSec: number; tags: string[]; converted: boolean }
export interface PageBehavior {
  sessions: number
  elements: ElEngagement[]
  scroll: { reach: { p25: number; p50: number; p75: number; p100: number }; foldPct: number; formReachPct: number }
  journey: JourneyStep[]
  branches: Branch[]
  friction: { rageClicks: number; deadClicks: number; quickBacks: number; jsErrors: number; score: number; worstEl?: string }
  engagement: { activeSec: number; scrollReachPct: number; interactions: number; bouncePct: number }
  devices: DeviceSplit[]
  sessionList: BehSession[]
}

/** deterministic 0..1 jitter seeded by a string, so a page's numbers are stable across renders */
function rng(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h >>> 0) % 100000) / 100000 }
}
const r2 = (n: number) => Math.round(n)
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

// per-element share of clicks (Apply Now is the hero CTA and gets the most)
const EL_WEIGHT: Record<string, number> = { apply: 0.30, form: 0.17, prospectus: 0.10, callback: 0.06, whatsapp: 0.05, call: 0.035 }

export function pageBehavior(p: Page): PageBehavior {
  const rand = rng(p.id)
  const j = (spread: number) => 1 + (rand() - 0.5) * spread // ~1 ± spread/2
  const sessions = p.visits
  const conv = p.visits ? p.leads / p.visits : 0
  const broken = p.fault === 'broken_form'
  const closed = p.fault === 'closed_intake'

  // ---- scroll reach ----
  const formReachPct = broken ? r2(46 * j(0.1)) : closed ? r2(41 * j(0.1)) : clamp(r2((38 + conv * 380) * j(0.06)), 40, 70)
  const scroll = {
    foldPct: 33,
    formReachPct,
    reach: {
      p25: clamp(r2(96 * j(0.03)), 88, 99),
      p50: clamp(formReachPct + r2(12 * j(0.2)), 45, 85),
      p75: clamp(formReachPct - r2(4 * j(0.4)), 20, 70),
      p100: clamp(r2(formReachPct * 0.42 * j(0.2)), 8, 40),
    },
  }

  // ---- on-page journey funnel (reconciles: landed = visits, submit = leads) ----
  const scrolledToForm = r2(sessions * formReachPct / 100)
  const formStart = broken
    ? r2(scrolledToForm * 0.42 * j(0.1))
    : closed
      ? r2(scrolledToForm * 0.2 * j(0.15))
      : clamp(r2(p.leads / 0.62), p.leads, scrolledToForm)
  const journeyRaw: [string, string, number, number][] = [
    ['land', 'Landed', sessions, 0],
    ['scroll', 'Scrolled to form', scrolledToForm, r2(9 * j(0.3))],
    ['start', 'Form started', formStart, r2(15 * j(0.3))],
    ['submit', 'Submitted', p.leads, r2(34 * j(0.25))],
  ]
  const journey: JourneyStep[] = journeyRaw.map(([k, label, count, secs]) => ({ k, label, count, pct: sessions ? r2((count / sessions) * 100) : 0, avgSecFromPrev: secs }))

  // ---- branches (alternate actions off the main funnel) ----
  const branches: Branch[] = [
    { k: 'prospectus', label: 'Downloaded prospectus', count: r2(sessions * 0.06 * j(0.3)) },
    { k: 'whatsapp', label: 'Opened WhatsApp', count: r2(sessions * 0.03 * j(0.4)) },
    { k: 'call', label: 'Tapped call', count: r2(sessions * 0.02 * j(0.4)) },
    { k: 'left', label: 'Left without interacting', count: r2(sessions * (broken ? 0.34 : closed ? 0.4 : 0.24) * j(0.15)) },
  ]

  // ---- element engagement + rage/dead on the broken control ----
  const elements: ElEngagement[] = PAGE_ELEMENTS.map((e) => {
    const w = EL_WEIGHT[e.k] ?? 0.03
    const clicks = r2(sessions * w * j(0.18))
    let rage = r2(clicks * 0.02 * rand())
    let dead = r2(clicks * 0.015 * rand())
    if (broken && e.k === 'form') { rage = r2(sessions * 0.09 * j(0.1)); dead = r2(sessions * 0.05 * j(0.1)) } // submit fails → frustration piles on the form
    if (broken && e.k === 'apply') { rage = r2(sessions * 0.03 * j(0.2)) }
    return { k: e.k, label: elLabel(e.k), clicks, ctrPct: sessions ? +((clicks / sessions) * 100).toFixed(1) : 0, dead, rage }
  })

  // ---- friction totals ----
  const rageClicks = elements.reduce((a, e) => a + e.rage, 0)
  const deadClicks = elements.reduce((a, e) => a + e.dead, 0)
  const quickBacks = r2(sessions * (broken ? 0.19 : closed ? 0.16 : 0.06) * j(0.2))
  const jsErrors = broken ? 122 : closed ? 0 : 3
  const worstEl = broken ? 'form' : elements.slice().sort((a, b) => b.rage - a.rage)[0]?.rage ? elements.slice().sort((a, b) => b.rage - a.rage)[0].k : undefined
  const score = clamp(r2((broken ? 82 : closed ? 46 : 14) + (rageClicks / Math.max(1, sessions)) * 120 * j(0.1)), 4, 96)

  // ---- engagement ----
  const scrollReachPct = r2((scroll.reach.p25 + scroll.reach.p50 + scroll.reach.p75 + scroll.reach.p100) / 4)
  const engagement = {
    activeSec: clamp(r2((26 + conv * 520) * j(0.15)), 18, 98),
    scrollReachPct,
    interactions: +(2.2 + conv * 22 + rand()).toFixed(1),
    bouncePct: clamp(r2((broken ? 61 : closed ? 68 : 50 - conv * 260) * j(0.08)), 22, 78),
  }

  // ---- device split (broken form fails below 380px → mobile converts 0) ----
  const mobileShare = r2(41 * j(0.12))
  const tabletShare = r2(7 * j(0.2))
  const desktopShare = 100 - mobileShare - tabletShare
  const baseConv = r2(conv * 100 * 10) / 10
  const devices: DeviceSplit[] = [
    { k: 'desktop', sharePct: desktopShare, convPct: broken ? +(baseConv || 4.6).toFixed(1) : +(baseConv * 1.15).toFixed(1) },
    { k: 'mobile', sharePct: mobileShare, convPct: broken ? 0 : +(baseConv * 0.8).toFixed(1) },
    { k: 'tablet', sharePct: tabletShare, convPct: +(baseConv * 0.9).toFixed(1) },
  ]

  // ---- sample sessions for the replay list ----
  const srcPool = ['Google · MBA Brand', 'Meta · Prospecting', 'Google · Search', 'Meta · Retargeting', 'Direct']
  const mk = (i: number, device: Device, tags: string[], converted: boolean, dur: number): BehSession => ({ id: `${p.id}-s${i}`, device, source: srcPool[r2(rand() * (srcPool.length - 1))], durSec: dur, tags, converted })
  const sessionList: BehSession[] = broken
    ? [
        mk(1, 'mobile', ['rage click', 'form error'], false, 41),
        mk(2, 'mobile', ['rage click', 'quick-back'], false, 22),
        mk(3, 'desktop', ['converted'], true, 76),
        mk(4, 'mobile', ['dead click'], false, 30),
        mk(5, 'desktop', ['scrolled 90%', 'left'], false, 52),
      ]
    : closed
      ? [
          mk(1, 'desktop', ['quick-back'], false, 12),
          mk(2, 'mobile', ['bounced'], false, 8),
          mk(3, 'desktop', ['scrolled 40%', 'left'], false, 19),
          mk(4, 'mobile', ['quick-back'], false, 11),
        ]
      : [
          mk(1, 'desktop', ['converted'], true, 84),
          mk(2, 'mobile', ['converted'], true, 63),
          mk(3, 'desktop', ['scrolled 75%'], false, 47),
          mk(4, 'mobile', ['rage click'], false, 29),
          mk(5, 'desktop', ['dead click', 'left'], false, 38),
        ]

  return { sessions, elements, scroll, journey, branches, friction: { rageClicks, deadClicks, quickBacks, jsErrors, score, worstEl }, engagement, devices, sessionList }
}

/** account-level friction roll-up for the Overview "Friction hotspots" card */
export function frictionHotspots(pages: Page[]) {
  return pages
    .map((p) => ({ p, b: pageBehavior(p) }))
    .sort((a, b) => b.b.friction.score - a.b.friction.score)
}

/* ---- experiment behavioral lens: a full A/B behaviour report (Statsig-style scorecard + per-arm heatmap/funnel + over-time) ---- */
export interface BehMetric { key: string; label: string; unit: 'pct' | 'num' | 'sec'; c: number; v: number; betterUp: boolean; role: 'primary' | 'secondary' | 'guardrail'; deltaPct: number; ciLow: number; ciHigh: number; sig: boolean }
export interface ArmStep { k: string; label: string; count: number; pct: number }
export interface ExpArm { elements: { k: string; label: string; clicks: number }[]; funnel: ArmStep[]; rage: number; sessions: number }
export interface ExpBehaviorData {
  metrics: BehMetric[]
  primaryKey: string
  primary: BehMetric
  dir: number
  sig: boolean
  collecting: boolean
  headline: string
  days: number
  sessions: { c: number; v: number }
  series: { day: number; c: number; v: number }[]
  arms: { control: ExpArm; variant: ExpArm }
  sessionsByArm: { control: BehSession[]; variant: BehSession[] }
}

export function expBehavior(e: Experiment): ExpBehaviorData {
  const p = PAGES.find((x) => x.id === e.pageId)
  const base = p ? pageBehavior(p) : undefined
  // quick A/B against a second existing page → read the variant arm's shape from that page
  const variantPage = e.variantPageId ? PAGES.find((x) => x.id === e.variantPageId) : undefined
  const vbase = variantPage ? pageBehavior(variantPage) : undefined
  const rand = rng(e.id + 'x')
  const dir = e.verdict === 'best' || e.verdict === 'good' ? 1 : e.verdict === 'low' ? -1 : 0
  const mag = e.verdict === 'best' ? 1 : e.verdict === 'good' ? 0.7 : e.verdict === 'low' ? 0.85 : 0.25
  const powered = e.verdict !== 'pending'
  // volumes are strictly the test's OWN sessions since launch — never a page-lifetime fallback
  const ctrlN = e.control.v
  const varN = e.variant.v
  const collecting = ctrlN === 0 && varN === 0
  const primaryKey = /form/i.test(e.goal) ? 'form' : /scroll/i.test(e.goal) ? 'scroll' : 'apply'
  const bump = (x: number, pct: number, betterUp: boolean) => r2((x + x * pct * mag * dir * (betterUp ? 1 : -1)) * 10) / 10
  const ciHalf = clamp(r2(60 / Math.sqrt(Math.max(ctrlN, 1) / 40)), 3, 60)
  const mk = (key: string, label: string, unit: 'pct' | 'num' | 'sec', c: number, v: number, betterUp: boolean, role: 'primary' | 'secondary' | 'guardrail'): BehMetric => {
    const deltaPct = c ? r2(((v - c) / c) * 100) : 0
    const ciLow = deltaPct - ciHalf
    const ciHigh = deltaPct + ciHalf
    const sig = powered && Math.abs(deltaPct) >= 4 && (ciLow > 0 || ciHigh < 0) && (role === 'primary' || e.verdict === 'best' || e.verdict === 'low')
    return { key, label, unit, c, v, betterUp, role, deltaPct, ciLow, ciHigh, sig }
  }

  // variant-arm shape comes from the real variant page when this is a page-vs-page test; else it's modeled off control
  const ratioOf = (b: PageBehavior | undefined, n: number) => (b && b.sessions ? Math.max(b.sessions / Math.max(n, 1), 1) : 1)
  const corrApply = e.corr.find((c) => /apply/i.test(c.label))
  const corrForm = e.corr.find((c) => /form/i.test(c.label))
  const scrollC = base?.scroll.formReachPct ?? 50
  const scrollV = vbase ? vbase.scroll.formReachPct : clamp(bump(scrollC, 0.18, true), 5, 95)
  const activeC = base?.engagement.activeSec ?? 45
  const activeV = vbase ? clamp(vbase.engagement.activeSec, 10, 140) : clamp(r2(bump(activeC, 0.16, true)), 10, 140)
  const rageC = base ? Math.max(2, r2(base.friction.rageClicks / ratioOf(base, ctrlN))) : 10
  const rageV = vbase ? Math.max(0, r2(vbase.friction.rageClicks / ratioOf(vbase, varN))) : Math.max(0, r2(bump(rageC, 0.32, false)))
  const applyC = corrApply?.c ?? 44
  const applyV = corrApply?.v ?? r2(bump(applyC, 0.2, true))
  const formC = corrForm?.c ?? 70
  const formV = corrForm?.v ?? r2(bump(formC, 0.15, true))
  const roleOf = (k: string): 'primary' | 'secondary' | 'guardrail' => (k === primaryKey ? 'primary' : k === 'rage' ? 'guardrail' : 'secondary')
  const metrics: BehMetric[] = [
    mk('scroll', 'Scroll-to-form rate', 'pct', scrollC, scrollV, true, roleOf('scroll')),
    mk('apply', 'Apply-Now clicks', 'num', applyC, applyV, true, roleOf('apply')),
    mk('form', 'Form starts', 'num', formC, formV, true, roleOf('form')),
    mk('active', 'Active time on page', 'sec', activeC, activeV, true, roleOf('active')),
    mk('rage', 'Rage clicks', 'num', rageC, rageV, false, 'guardrail'),
  ].sort((a, b) => (a.role === 'primary' ? -2 : a.role === 'guardrail' ? 2 : 0) - (b.role === 'primary' ? -2 : b.role === 'guardrail' ? 2 : 0))
  const primary = metrics.find((m) => m.role === 'primary')!

  // primary metric over time (control ~flat, variant converges to its endpoint)
  const days = e.days
  const seriesLen = Math.max(days || 6, 5)
  const series = Array.from({ length: seriesLen }, (_, i) => {
    const t = i / (seriesLen - 1)
    return { day: i + 1, c: r2(primary.c * (1 + (rand() - 0.5) * 0.06) * 10) / 10, v: r2((primary.c + (primary.v - primary.c) * (0.3 + 0.7 * t)) * (1 + (rand() - 0.5) * 0.05) * 10) / 10 }
  })

  // per-arm element clicks (heatmap comparison) + funnels
  const goalEl = primaryKey === 'form' ? 'form' : 'apply'
  const armEls = (n: number, boost: number) => PAGE_ELEMENTS.map((el) => {
    const b = base?.elements.find((x) => x.k === el.k)
    const ctr = b ? b.ctrPct / 100 : EL_WEIGHT[el.k] ?? 0.03
    let clicks = r2(ctr * n)
    if (el.k === goalEl) clicks = r2(clicks * (1 + boost))
    return { k: el.k, label: elLabel(el.k), clicks }
  })
  const armFunnel = (n: number, leads: number, scrollPct: number): ArmStep[] => {
    const scrolled = r2((n * scrollPct) / 100)
    const start = clamp(leads ? r2(leads / 0.62) : r2(scrolled * 0.3), leads, scrolled)
    return ([['land', 'Landed', n], ['scroll', 'Scrolled to form', scrolled], ['start', 'Started form', start], ['submit', 'Submitted', leads]] as [string, string, number][])
      .map(([k, label, count]) => ({ k, label, count, pct: n ? r2((count / n) * 100) : 0 }))
  }
  const scrollM = metrics.find((m) => m.key === 'scroll')!
  const arms = {
    control: { elements: armEls(ctrlN, 0), funnel: armFunnel(ctrlN, e.control.leads, scrollM.c), rage: rageC, sessions: ctrlN },
    variant: { elements: armEls(varN, 0.2 * mag * dir), funnel: armFunnel(varN, e.variant.leads, scrollM.v), rage: metrics.find((m) => m.key === 'rage')!.v, sessions: varN },
  }

  // sessions split by arm
  const list = base?.sessionList ?? []
  const half = Math.ceil(list.length / 2)
  const sessionsByArm = {
    control: list.slice(0, half).map((s) => ({ ...s, id: s.id + 'c' })),
    variant: list.slice(half).map((s) => ({ ...s, id: s.id + 'v', converted: dir > 0 ? true : s.converted })),
  }

  const pl = primary.label.toLowerCase()
  const headline = collecting ? 'Collecting — no behaviour captured yet'
    : e.verdict === 'pending' ? 'Too early — behaviour not yet distinguishable'
    : primary.sig ? (dir > 0 ? `Variant lifted ${pl} ${Math.abs(primary.deltaPct)}% — significant` : `Variant hurt ${pl} ${Math.abs(primary.deltaPct)}% — significant`)
    : (dir > 0 ? `Variant is ahead on ${pl}, not yet significant` : dir < 0 ? `Variant is behind on ${pl}, not yet significant` : 'No behavioural difference yet')

  return { metrics, primaryKey, primary, dir, sig: primary.sig, collecting, headline, days, sessions: { c: ctrlN, v: varN }, series, arms, sessionsByArm }
}

/** deep-link intent: open a page detail straight into its Behavior view (e.g. from Overview) */
let _pendingBehavior: string | null = null
export const openBehavior = (id: string) => { _pendingBehavior = id }
export const takePendingBehavior = (id: string) => { if (_pendingBehavior === id) { _pendingBehavior = null; return true } return false }
