/* ============================================================
   Samurai dataset — one reconciling source of truth.
   Account (this month): ₹6,20,009 spend · 358 leads · CPL ₹1,732.
   Pages and campaigns each partition those totals exactly.
   ============================================================ */

export type Net = 'google' | 'meta'

export interface Page {
  id: string
  name: string
  group: string
  path: string
  spend: number
  clicks: number
  visits: number
  leads: number
  /** derived cost per lead, or null when the page produced no leads */
  cpl: number | null
  fault?: 'broken_form' | 'closed_intake'
  /** true while a user-created page is still a draft (not published, no traffic) */
  draft?: boolean
}

export interface Leak {
  id: string
  severity: 'confirmed' | 'likely'
  reason: 'broken_form' | 'closed_intake' | 'wrong_page'
  page: string
  amount: number
  detail: string
}

export interface Campaign {
  id: string
  name: string
  net: Net
  pageId: string
  spend: number
  clicks: number
  leads: number
  cpl: number | null
  good: number
}

export type Verdict = 'best' | 'good' | 'low' | 'learning' | 'pending' | 'nodiff'
export interface Arm {
  v: number
  leads: number
  spend: number
}
/* ---- N-variant tests (built in the template builder) — up to 5 variant pages compared on custom variables ---- */
export interface ExpVariant { letter: string; pageId: string; name: string; v: number; spend: number }
export interface ExpVarArm { button: string; count: number; elKey?: string } // the button a variable maps to on a variant (label + element key), and its count
export interface ExpVariable { id: string; name: string; isGoal?: boolean; arms: Record<string, ExpVarArm> } // arms keyed by variant letter
export interface Experiment {
  id: string
  name: string
  group: string
  pageId: string
  status: 'ended' | 'running' | 'stopped' | 'draft'
  verdict: Verdict
  goal: string
  days: number
  estDays?: number // projected days-to-verdict, set at launch so the timing panel reconciles with the review estimate
  variantPageId?: string // quick A/B: the existing page used as Variant B (control = pageId). Lets Result + Behaviour reflect the real second page.
  templateId?: string // the template this test was launched from (stitches Templates ↔ tests)
  templateName?: string
  dashboard?: string[] // panel keys carried from the template, so the test shows the dashboard you built
  origin?: string
  control: Arm
  variant: Arm
  corr: { label: string; c: number; v: number }[]
  variants?: ExpVariant[] // present on N-variant tests — the versions being compared, A/B/C…
  variables?: ExpVariable[] // present on N-variant tests — the custom metrics, each compared across variants
  narrative: { hyp: string; going: string; decide: string }
  decision?: { by: string; date: string; reason: string; learned: string; win?: 'A' | 'B' }
}
export const ecpl = (a: Arm): number | null => (a.leads ? Math.round(a.spend / a.leads) : null)

/* N-variant helpers */
export const isNVar = (e: Experiment): boolean => !!(e.variants && e.variants.length)
export const goalVarOf = (e: Experiment): ExpVariable | undefined => e.variables?.find((v) => v.isGoal) ?? e.variables?.[0]
/** cost per lead for a variant = its spend ÷ the goal variable's count on that variant */
export const variantCpl = (e: Experiment, letter: string): number | null => {
  const vr = e.variants?.find((x) => x.letter === letter)
  const g = goalVarOf(e)
  const leads = g?.arms[letter]?.count ?? 0
  return vr && leads ? Math.round(vr.spend / leads) : null
}

export const ACCOUNT = {
  spend: 620009,
  leads: 358,
  cpl: 1732,
  prevCpl: 2014,
  cplDeltaPct: -14,
}

export const RANGES = {
  '7d': { label: 'Last 7 days', factor: 0.25 },
  '30d': { label: 'Last 30 days', factor: 1 },
  '3m': { label: 'Last 3 months', factor: 3 },
  '6m': { label: 'Last 6 months', factor: 6 },
} as const
export type RangeKey = keyof typeof RANGES

const cpl = (spend: number, leads: number) => (leads > 0 ? Math.round(spend / leads) : null)

export const PAGES: Page[] = [
  { id: 'mba', name: 'Online MBA', group: 'MBA', path: '/online-mba', spend: 100669, clicks: 1240, visits: 1090, leads: 45, cpl: cpl(100669, 45) },
  { id: 'bba', name: 'Online BBA', group: 'BBA', path: '/online-bba', spend: 106000, clicks: 1470, visits: 1300, leads: 90, cpl: cpl(106000, 90) },
  { id: 'mca', name: 'Online MCA', group: 'MCA', path: '/online-mca', spend: 72540, clicks: 900, visits: 800, leads: 31, cpl: cpl(72540, 31) },
  { id: 'bca', name: 'Online BCA', group: 'BCA', path: '/online-bca', spend: 55000, clicks: 830, visits: 740, leads: 47, cpl: cpl(55000, 47) },
  { id: 'bcom', name: 'Online B.Com', group: 'B.Com', path: '/online-bcom', spend: 64300, clicks: 1980, visits: 1840, leads: 0, cpl: null, fault: 'broken_form' },
  { id: 'mbajul', name: 'MBA · July intake', group: 'MBA', path: '/mba-july-intake', spend: 37300, clicks: 560, visits: 520, leads: 0, cpl: null, fault: 'closed_intake' },
  { id: 'home', name: 'Homepage (generic)', group: 'Other', path: '/', spend: 41200, clicks: 980, visits: 900, leads: 30, cpl: cpl(41200, 30) },
  { id: 'mcom', name: 'Online M.Com', group: 'M.Com', path: '/online-mcom', spend: 48000, clicks: 700, visits: 640, leads: 38, cpl: cpl(48000, 38) },
  { id: 'ba', name: 'Online BA', group: 'BA', path: '/online-ba', spend: 44000, clicks: 740, visits: 680, leads: 40, cpl: cpl(44000, 40) },
  { id: 'bsc', name: 'Online B.Sc', group: 'B.Sc', path: '/online-bsc', spend: 51000, clicks: 760, visits: 700, leads: 37, cpl: cpl(51000, 37) },
]

/* ---- user-created pages (drafts → published). Kept in their own store so they never
   distort the seeded, reconciled account totals, and so a page detail can find them. ---- */
export const USER_PAGES: Page[] = []
export function addDraftPage(p: Page) { USER_PAGES.push({ ...p, draft: true }) }
export function publishDraftPage(id: string) { const p = USER_PAGES.find((x) => x.id === id); if (p) p.draft = false }
export function removeDraftPage(id: string) { const i = USER_PAGES.findIndex((x) => x.id === id); if (i >= 0) USER_PAGES.splice(i, 1) }
/** every page the app knows about — the seeded set plus anything the user created */
export const allPages = () => [...PAGES, ...USER_PAGES]
/** find a page by id across both the seeded set and user-created pages */
export const findPage = (id: string) => PAGES.find((p) => p.id === id) ?? USER_PAGES.find((p) => p.id === id)

export const LEAKS: Leak[] = [
  { id: 'l1', severity: 'confirmed', reason: 'broken_form', page: 'bcom', amount: 64300, detail: 'B.Com mobile form has taken 0 leads from 1,840 sessions — it breaks below 380px. Down since 14 Nov.' },
  { id: 'l2', severity: 'confirmed', reason: 'closed_intake', page: 'mbajul', amount: 37300, detail: '/mba-july-intake closed 11 days ago and is still taking Meta spend.' },
  { id: 'l3', severity: 'likely', reason: 'wrong_page', page: 'home', amount: 41200, detail: 'Generic homepage traffic converts at ₹1,373/lead vs ₹1,166 on matched programme pages.' },
]

export const CAMPAIGNS: Campaign[] = [
  { id: 'c1', name: 'MBA · Search · Brand', net: 'google', pageId: 'mba', spend: 100669, clicks: 1240, leads: 45, cpl: cpl(100669, 45), good: 0.58 },
  { id: 'c2', name: 'BBA · Search', net: 'google', pageId: 'bba', spend: 106000, clicks: 1470, leads: 90, cpl: cpl(106000, 90), good: 0.55 },
  { id: 'c3', name: 'B.Com · Meta · Prospecting', net: 'meta', pageId: 'bcom', spend: 64300, clicks: 1980, leads: 0, cpl: null, good: 0 },
  { id: 'c4', name: 'MCA · Search', net: 'google', pageId: 'mca', spend: 72540, clicks: 900, leads: 31, cpl: cpl(72540, 31), good: 0.5 },
  { id: 'c5', name: 'BCA · Search', net: 'google', pageId: 'bca', spend: 55000, clicks: 830, leads: 47, cpl: cpl(55000, 47), good: 0.6 },
  { id: 'c6', name: 'MBA · Meta · July intake', net: 'meta', pageId: 'mbajul', spend: 37300, clicks: 560, leads: 0, cpl: null, good: 0 },
  { id: 'c7', name: 'Generic · Search', net: 'google', pageId: 'home', spend: 41200, clicks: 980, leads: 30, cpl: cpl(41200, 30), good: 0.4 },
  { id: 'c8', name: 'M.Com · Search', net: 'google', pageId: 'mcom', spend: 48000, clicks: 700, leads: 38, cpl: cpl(48000, 38), good: 0.57 },
  { id: 'c9', name: 'BA · Meta', net: 'meta', pageId: 'ba', spend: 44000, clicks: 740, leads: 40, cpl: cpl(44000, 40), good: 0.52 },
  { id: 'c10', name: 'B.Sc · Search', net: 'google', pageId: 'bsc', spend: 51000, clicks: 760, leads: 37, cpl: cpl(51000, 37), good: 0.55 },
]

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'e-nvar', name: 'Programme page layout — A vs B vs C', pageId: 'mba', group: 'MBA', status: 'running', verdict: 'good', goal: 'Enquiry', days: 9,
    templateName: 'Fold + fee nudge',
    control: { v: 320, leads: 18, spend: 42000 }, variant: { v: 330, leads: 24, spend: 42000 }, corr: [],
    variants: [
      { letter: 'A', pageId: 'mba', name: 'Online MBA', v: 320, spend: 42000 },
      { letter: 'B', pageId: 'bba', name: 'Online BBA', v: 330, spend: 42000 },
      { letter: 'C', pageId: 'mca', name: 'Online MCA', v: 325, spend: 42000 },
    ],
    variables: [
      { id: 'enquiry', name: 'Enquiry', isGoal: true, arms: { A: { button: 'Enquiry form', count: 18 }, B: { button: 'Enquiry form', count: 24 }, C: { button: 'Enquiry form', count: 20 } } },
      { id: 'primary', name: 'Primary action', arms: { A: { button: 'Apply Now', count: 58 }, B: { button: 'Request a callback', count: 66 }, C: { button: 'Apply Now', count: 61 } } },
      { id: 'brochure', name: 'Prospectus download', arms: { A: { button: 'Download prospectus', count: 22 }, B: { button: 'Download prospectus', count: 19 }, C: { button: 'Download prospectus', count: 15 } } },
    ],
    narrative: { hyp: 'Compare three programme-page layouts on the same variables — Enquiry decides, the rest are tracked alongside.', going: 'Version B (BBA) is cheapest per enquiry so far; the primary action is a different button on each page.', decide: 'Reads once each variant clears the enquiry bar.' },
  },
  {
    id: 'e-mba', name: 'Mobile fold + fee nudge', pageId: 'mba', group: 'MBA', status: 'ended', verdict: 'best', goal: 'Apply-Now click', days: 12,
    origin: 'UNext / Online Manipal ran this exact test — +11.68% CTA clicks in 12 days.',
    control: { v: 280, leads: 12, spend: 28080 }, variant: { v: 278, leads: 16, spend: 28080 },
    corr: [{ label: 'Apply-Now clicks', c: 44, v: 61 }, { label: 'Form starts', c: 70, v: 85 }],
    narrative: {
      hyp: 'Move the form above the fold and add a fee + scholarship nudge, so cost is answered before the ask.',
      going: 'Variant is cheaper per lead and both micro-signals agree.',
      decide: 'Decided on day 12 — the Apply-Now signal cleared the bar.',
    },
    decision: { by: 'Akshay R', date: '14 Nov 2026', reason: 'Cheaper per lead with two corroborating signals.', learned: 'Fee transparency above the fold lifts intent on this programme.' },
  },
  {
    id: 'e-bsc', name: 'Scholarship banner', pageId: 'bsc', group: 'B.Sc', status: 'ended', verdict: 'best', goal: 'Apply-Now click', days: 15,
    control: { v: 210, leads: 9, spend: 14490 }, variant: { v: 208, leads: 11, spend: 14490 },
    corr: [{ label: 'Apply-Now clicks', c: 31, v: 39 }, { label: 'Brochure downloads', c: 22, v: 27 }],
    narrative: { hyp: 'A scholarship banner in the first fold to answer affordability early.', going: 'Cheaper per lead, both secondary signals up.', decide: 'Called on day 15.' },
    decision: { by: 'Akshay R', date: '2 Oct 2026', reason: 'Cheaper per lead, corroborated.', learned: 'Affordability messaging works earliest on B.Sc.' },
  },
  {
    id: 'e-bba', name: 'Form field order', pageId: 'bba', group: 'BBA', status: 'running', verdict: 'good', goal: 'Apply-Now click', days: 8,
    control: { v: 190, leads: 10, spend: 12100 }, variant: { v: 192, leads: 12, spend: 12100 },
    corr: [{ label: 'Apply-Now clicks', c: 52, v: 60 }, { label: 'Form starts', c: 96, v: 104 }],
    narrative: { hyp: 'Ask name and phone first, email last — fewer mid-form drop-offs.', going: 'Ahead so far, not yet certain.', decide: 'At this volume the Apply-Now goal decides around day 12 — about 4 days out.' },
  },
  {
    id: 'e-mca', name: 'Hero headline rewrite', pageId: 'mca', group: 'MCA', status: 'running', verdict: 'low', goal: 'Apply-Now click', days: 22,
    control: { v: 230, leads: 10, spend: 23000 }, variant: { v: 228, leads: 9, spend: 23000 },
    corr: [{ label: 'Apply-Now clicks', c: 58, v: 53 }, { label: 'Form starts', c: 100, v: 92 }],
    narrative: { hyp: 'A benefit-led headline instead of the programme name.', going: 'Behind control and both signals agree — this variant is losing.', decide: 'Enough signal to call it: replace the variant.' },
  },
  {
    id: 'e-mcom', name: 'CTA colour + copy', pageId: 'mcom', group: 'M.Com', status: 'running', verdict: 'good', goal: 'Apply-Now click', days: 19,
    control: { v: 150, leads: 6, spend: 9000 }, variant: { v: 148, leads: 7, spend: 9000 },
    corr: [{ label: 'Apply-Now clicks', c: 40, v: 46 }, { label: 'Form starts', c: 72, v: 80 }],
    narrative: { hyp: 'A higher-contrast CTA with action copy.', going: 'Slightly cheaper per lead and both micro-signals agree so far.', decide: 'At this volume the Apply-Now goal decides around day 24 — a few days out.' },
  },
  {
    id: 'e-home', name: 'Programme redirect', pageId: 'home', group: 'Other', status: 'running', verdict: 'pending', goal: 'Apply-Now click', days: 3,
    control: { v: 120, leads: 3, spend: 5000 }, variant: { v: 118, leads: 4, spend: 5000 }, corr: [],
    narrative: { hyp: 'Route generic homepage traffic to the matching programme page.', going: 'Under the reading threshold — too early.', decide: 'Check back once each arm passes ~120 visitors.' },
  },
  {
    id: 'e-ba', name: 'Testimonial block', pageId: 'ba', group: 'BA', status: 'stopped', verdict: 'nodiff', goal: 'Apply-Now click', days: 21,
    control: { v: 260, leads: 14, spend: 15400 }, variant: { v: 258, leads: 14, spend: 15400 },
    corr: [{ label: 'Apply-Now clicks', c: 70, v: 71 }, { label: 'Form starts', c: 120, v: 119 }],
    narrative: { hyp: 'Add a student testimonial above the form.', going: 'No measurable difference; stopped when the campaign paused.', decide: 'Stopped — the idea is untested, not disproved.' },
  },
]

/** 13-week quarter — weekly spend & leads that sum to the ×3 range totals,
 *  so the blended CPL, the trend line and any drill-down all reconcile. */
export const QUARTER = {
  intake: 'January',
  intakeYear: 2027,
  target: 600,
  enrol: 412,
  pctTarget: 69,
  pctPeriod: 71,
  closeDate: '15 Jan 2027',
  prevCpl: 2014,
  weeks: {
    spend: [150000, 149000, 148000, 147000, 146000, 144000, 143000, 142000, 141000, 140000, 139000, 138000, 133027],
    leads: [72, 74, 76, 78, 80, 81, 82, 84, 86, 88, 90, 91, 92],
  },
  /** count of winning variants shipped that week (0-based index) */
  ships: [
    { i: 2, n: 4 },
    { i: 5, n: 6 },
    { i: 8, n: 5 },
    { i: 11, n: 7 },
  ],
}

// ---- derived helpers -------------------------------------------------------
export const leakTotal = () => LEAKS.reduce((a, l) => a + l.amount, 0) // 142800
export const confirmedLeak = () => LEAKS.filter((l) => l.severity === 'confirmed').reduce((a, l) => a + l.amount, 0) // 101600
export const leakPctOfSpend = () => Math.round((leakTotal() / ACCOUNT.spend) * 100) // 23

export const pageName = (id: string) => PAGES.find((p) => p.id === id)?.name ?? id

export const rankablePages = () => PAGES.filter((p) => p.leads > 0)
export const dearestPage = () => [...rankablePages()].sort((a, b) => (b.cpl! - a.cpl!))[0]
export const cheapestPage = () => [...rankablePages()].sort((a, b) => (a.cpl! - b.cpl!))[0]

export function platformStats() {
  const g = { spend: 0, leads: 0 }
  const m = { spend: 0, leads: 0 }
  for (const c of CAMPAIGNS) {
    const t = c.net === 'google' ? g : m
    t.spend += c.spend
    t.leads += c.leads
  }
  const gCpl = Math.round(g.spend / g.leads)
  const mLeads = m.leads || 1
  const mCpl = Math.round(m.spend / mLeads)
  return {
    google: { ...g, cpl: gCpl },
    meta: { ...m, cpl: mCpl, zeroLead: m.leads === 0 },
    ratio: +(mCpl / gCpl).toFixed(1),
    totalSpend: g.spend + m.spend,
  }
}

export function quarterCpl() {
  const s = QUARTER.weeks.spend.reduce((a, b) => a + b, 0)
  const l = QUARTER.weeks.leads.reduce((a, b) => a + b, 0)
  return Math.round(s / l)
}
export const cplTrend = () =>
  QUARTER.weeks.spend.map((s, i) => ({
    week: i + 1,
    cpl: Math.round(s / QUARTER.weeks.leads[i]),
    spend: s,
    leads: QUARTER.weeks.leads[i],
    ships: QUARTER.ships.find((x) => x.i === i)?.n ?? 0,
  }))

export const VERDICT: Record<Verdict, { word: string; tone: 'pos' | 'navy' | 'neg' | 'warn' | 'neutral'; call: string; sub: string }> = {
  best: { word: 'Best', tone: 'pos', call: 'Ship it', sub: 'Cheapest per lead — the gap clears the bar' },
  good: { word: 'Good', tone: 'navy', call: 'Keep running', sub: 'Ahead of control, not yet certain' },
  low: { word: 'Low', tone: 'neg', call: 'Replace it', sub: 'Behind control' },
  learning: { word: 'Learning', tone: 'warn', call: 'Keep running', sub: 'Not enough events to rank' },
  pending: { word: 'Pending', tone: 'neutral', call: 'Too early', sub: 'Under the reading threshold' },
  nodiff: { word: 'No difference', tone: 'neutral', call: 'No difference found', sub: 'No measurable gap' },
}
export const ESTATUS: Record<string, string> = { ended: 'Ended', running: 'Running', stopped: 'Stopped', draft: 'Draft' }
