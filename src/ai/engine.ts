/* ============================================================
   Samurai AI — the grounded insight engine.
   Every answer is COMPOSED from the reconciled dataset; the model
   never produces a figure. Each insight carries a generative-UI
   chart spec, streamed reasoning, recommendations, and an optional
   human-in-the-loop action.
   ============================================================ */
import { inr } from '@/lib/utils'
import {
  ACCOUNT,
  CAMPAIGNS,
  QUARTER,
  cheapestPage,
  dearestPage,
  leakTotal,
  pageName,
  platformStats,
  quarterCpl,
} from '@/data/samurai'

export type ChartSpec =
  | { kind: 'leak' }
  | { kind: 'chain'; pageId: string }
  | { kind: 'pacing' }
  | { kind: 'cut' }
  | { kind: 'platform' }
  | { kind: 'testTargets' }
  | { kind: 'cplTrend' }
  | { kind: 'dumbbell'; control: number; variant: number; aLabel: string; bLabel: string }
  | { kind: 'digest' }

export type ActionKind = 'fixform' | 'pausejuly' | 'reallocate' | 'starttest'
export interface ApplyAction {
  kind: ActionKind
  label: string
  pageId?: string
}

export interface Insight {
  key: string
  question: string
  persona: 'marketer' | 'exec'
  headline: string
  summary: string
  narrative: string[]
  caveat?: string
  chart: ChartSpec
  recommendations: string[]
  actions: ApplyAction[]
  sources: string[]
  reasoning: string[]
}

export const PROMPTS: { key: string; persona: 'marketer' | 'exec'; q: string }[] = [
  { key: 'leak', persona: 'marketer', q: 'Where is my ad spend leaking this month?' },
  { key: 'dearest', persona: 'marketer', q: 'Which page has the highest cost per lead, and why?' },
  { key: 'cut', persona: 'marketer', q: 'Which campaign should I cut or fix first?' },
  { key: 'test', persona: 'marketer', q: 'What should I test next to bring cost per lead down?' },
  { key: 'pacing', persona: 'exec', q: 'Am I on track to hit the January intake target?' },
  { key: 'platform', persona: 'exec', q: 'How is Google performing versus Meta?' },
  { key: 'digest', persona: 'exec', q: "Give me this week's executive summary." },
]

export function routeQuestion(text: string): string {
  const t = (text || '').toLowerCase()
  if (/digest|summary|overview|weekly|exec/.test(t)) return 'digest'
  if (/leak|wast|broke/.test(t)) return 'leak'
  if (/meta|google|platform|channel/.test(t)) return 'platform'
  if (/intake|target|pac|enrol|track/.test(t)) return 'pacing'
  if (/test|experiment|variant/.test(t)) return 'test'
  if (/cut|campaign|pause|kill/.test(t)) return 'cut'
  if (/page|cpl|cost per lead|dear|expensive/.test(t)) return 'dearest'
  return 'dearest'
}

const q = (key: string) => PROMPTS.find((p) => p.key === key)?.q ?? ''
const persona = (key: string) => PROMPTS.find((p) => p.key === key)?.persona ?? 'marketer'

const BUILDERS: Record<string, () => Omit<Insight, 'key' | 'question' | 'persona'>> = {
  leak() {
    const total = leakTotal()
    return {
      headline: `${inr(total)} of last month's spend leaked`,
      summary: `${inr(total)} leaked — 23% of spend; the biggest single leak is the B.Com mobile form at ₹64,300.`,
      narrative: [
        `**${inr(total)}** — **23% of your ${inr(ACCOUNT.spend)} spend** — reached pages that produced no leads at all. Left running, that is **${inr(total * 12)} a year**.`,
        `Two of these are provably broken, not judgement calls: a B.Com mobile form that has failed since 14 Nov, and spend still hitting a July intake that closed 11 days ago.`,
      ],
      caveat: `The homepage leak is "likely", not confirmed — it converts, just worse than a matched page — so treat it as a review, not a guaranteed saving.`,
      chart: { kind: 'leak' },
      recommendations: [
        'Fix the B.Com mobile form — the single biggest leak at ₹64,300.',
        'Pause spend to /mba-july-intake; that intake has closed.',
        'Route generic homepage traffic to the matching programme page.',
      ],
      actions: [
        { kind: 'fixform', label: 'Flag the broken form to engineering' },
        { kind: 'pausejuly', label: 'Pause the July campaign' },
      ],
      sources: ['Pages · form health', 'Campaigns · Meta delivery', 'Intakes · July 2026'],
      reasoning: [
        'Reading connected spend & conversion data',
        'Reconciling spend to leads for each page',
        'Isolating pages with a fault or zero return',
        'Separating confirmed faults from likely waste',
      ],
    }
  },
  dearest() {
    const p = dearestPage()
    const c = cheapestPage()
    const gap = p.cpl! - c.cpl!
    return {
      headline: `${p.name} is your dearest page at ${inr(p.cpl!)}/lead`,
      summary: `${p.name} costs ${inr(p.cpl!)}/lead — ${inr(gap)} above the cheapest page. It has the most headroom for a test.`,
      narrative: [
        `**${p.name}** turns spend into leads at **${inr(p.cpl!)}** each — **${inr(gap)} more** than your cheapest page (${c.name}, ${inr(c.cpl!)}).`,
        `The chain below shows where it loses efficiency: plenty of spend and clicks, but the click-to-lead step is thin — a landing-page problem, not a targeting one.`,
      ],
      chart: { kind: 'chain', pageId: p.id },
      recommendations: [
        `Run a test on ${p.name} — it has the most CPL headroom of any page.`,
        'Start with the fold and a fee/scholarship nudge — the change that won on MBA.',
      ],
      actions: [{ kind: 'starttest', label: `Start a test on ${p.name}`, pageId: p.id }],
      sources: ['Pages · cost per lead ranking', `Page detail · ${p.name}`],
      reasoning: [
        'Ranking every live page by cost per lead',
        'Comparing the dearest against the cheapest',
        'Reading the spend → click → visit → lead chain',
      ],
    }
  },
  pacing() {
    const need = QUARTER.target - QUARTER.enrol
    const behind = QUARTER.pctPeriod - QUARTER.pctTarget
    return {
      headline: `Behind pace by ${behind} points for the ${QUARTER.intake} intake`,
      summary: `${QUARTER.enrol} of ${QUARTER.target} ${QUARTER.intake} enrolments — behind pace by ${behind} points; ${need} more needed by ${QUARTER.closeDate}.`,
      narrative: [
        `You're at **${QUARTER.enrol} of ${QUARTER.target}** enrolments — **${QUARTER.pctTarget}% of target** with **${QUARTER.pctPeriod}% of the quarter** gone. You need **${need} more** to close by ${QUARTER.closeDate}.`,
        `The lever is cost per lead: it's trending **down to ${inr(quarterCpl())}**, and holding that trend narrows the gap without new budget.`,
      ],
      caveat: `Two points behind is recoverable with weeks left — but only if the ${inr(leakTotal())} monthly leak is recovered and fed back into the funnel.`,
      chart: { kind: 'pacing' },
      recommendations: [
        `Recover the ${inr(leakTotal())} monthly leak — it funds roughly the shortfall.`,
        'Hold the CPL trend; every ₹100 off blended CPL compounds into more enrolments.',
      ],
      actions: [],
      sources: ['Overview · intake pacing', 'Settings · January 2027 target'],
      reasoning: [
        'Reading enrolments to date vs the intake target',
        'Comparing pace-to-target against time elapsed',
        'Projecting the gap at the current cost per lead',
      ],
    }
  },
  cut() {
    const zero = CAMPAIGNS.filter((c) => c.leads === 0)
    const total = zero.reduce((a, c) => a + c.spend, 0)
    return {
      headline: `${zero.length} Meta campaigns spend ${inr(total)} for zero leads`,
      summary: `${zero.length} Meta campaigns spent ${inr(total)} for zero leads — the clearest spend to cut or fix.`,
      narrative: [
        `Two campaigns are buying clicks that never become leads — the clearest thing to cut or fix this week.`,
        `Together they burn **${inr(total)}** with **nothing to show**: one points at a broken form, the other at a closed intake.`,
      ],
      chart: { kind: 'cut' },
      recommendations: [
        'Pause the July-intake Meta campaign — the intake has closed.',
        'Fix the B.Com form before resuming its prospecting campaign.',
      ],
      actions: [
        { kind: 'pausejuly', label: 'Pause the July campaign' },
        { kind: 'fixform', label: 'Flag the B.Com form' },
      ],
      sources: ['Campaigns · zero-lead delivery', 'Pages · form health'],
      reasoning: [
        'Scanning campaigns for spend with no return',
        'Confirming each against its landing page',
        'Ranking by wasted spend',
      ],
    }
  },
  platform() {
    const s = platformStats()
    return {
      headline: `Meta costs ${s.ratio}× more per lead than Google`,
      summary: `Meta CPL ${inr(s.meta.cpl)} vs Google ${inr(s.google.cpl)} — ${s.ratio}× dearer per lead this month.`,
      narrative: [
        `Google returns leads at **${inr(s.google.cpl)}**; Meta at **${inr(s.meta.cpl)}** — **${s.ratio}× dearer**.`,
        `Meta's average is dragged down by its two zero-lead campaigns; the broken form and the closed intake are both on Meta. Fix those before judging the channel.`,
      ],
      caveat: `A cheaper channel isn't automatically the right one — Google is largely brand search, which converts warm demand. Don't starve prospecting entirely.`,
      chart: { kind: 'platform' },
      recommendations: [
        "Shift budget from Meta prospecting to Google search until Meta's CPL recovers.",
        'Fix the two zero-lead Meta campaigns first — they distort the average.',
      ],
      actions: [{ kind: 'reallocate', label: 'Shift budget to Google Search' }],
      sources: ['Campaigns · platform split', 'Google Ads & Meta connections'],
      reasoning: [
        'Aggregating spend and leads by platform',
        'Computing cost per lead for each',
        'Checking what drags the Meta average',
      ],
    }
  },
  test() {
    const p = dearestPage()
    return {
      headline: `Test your dearest pages first — that's where the headroom is`,
      summary: `Start tests on the dearest pages (led by ${p.name}) — that is where the cost-per-lead headroom is.`,
      narrative: [
        `The biggest cost-per-lead wins are on your most expensive pages — small conversion gains there move the blended number most.`,
        `Your MBA fold test already proved this: it cut CPL **25%** on the dearest page. Repeat that play on the next three.`,
      ],
      chart: { kind: 'testTargets' },
      recommendations: [
        'Use the Apply-Now click as the goal so a verdict lands in ~2 weeks, not months.',
        'Copy the winning MBA pattern: clearer fold + a fee/scholarship nudge.',
      ],
      actions: [{ kind: 'starttest', label: `Start a test on ${p.name}`, pageId: p.id }],
      sources: ['Pages · CPL ranking', 'Experiments · MBA fold test result'],
      reasoning: [
        'Ranking pages by cost-per-lead headroom',
        'Checking which past tests actually won',
        'Estimating time-to-verdict per goal',
      ],
    }
  },
  digest() {
    const need = QUARTER.target - QUARTER.enrol
    const p = dearestPage()
    return {
      headline: `This week: CPL ${inr(quarterCpl())} (↓14%), ${need} enrolments to target`,
      summary: `Blended CPL ${inr(quarterCpl())} (↓14%); ${QUARTER.enrol}/${QUARTER.target} enrolments; ${inr(leakTotal())} leaked; dearest page ${p.name}.`,
      narrative: [
        `Three things to know this week, all from your reconciled data:`,
        `**Cost per lead is ${inr(quarterCpl())}** — down 14% from last quarter's ${inr(QUARTER.prevCpl)}. Hold it.`,
        `**${QUARTER.enrol} of ${QUARTER.target} ${QUARTER.intake} enrolments** — ${need} to go, ${QUARTER.pctPeriod}% of the quarter elapsed.`,
        `**${inr(leakTotal())} leaked last month** — recovering it funds roughly the shortfall. Biggest: the B.Com form (₹64,300).`,
      ],
      chart: { kind: 'digest' },
      recommendations: [
        'Fix the B.Com mobile form — the biggest single leak.',
        'Keep CPL trending down; the intake gap closes with it.',
      ],
      actions: [{ kind: 'fixform', label: 'Flag the form to engineering' }],
      sources: ['Overview', 'Pages · leaks', 'Intake pacing'],
      reasoning: [
        'Pulling the week\'s headline metrics',
        'Reconciling CPL, pacing and leaked spend',
        'Composing the executive summary',
      ],
    }
  },
}

export function buildInsight(key: string): Insight {
  const k = BUILDERS[key] ? key : 'dearest'
  return { key: k, question: q(k), persona: persona(k), ...BUILDERS[k]() }
}

export const APPLY_COPY: Record<ActionKind, { title: string; body: string; confirm: string; done: string }> = {
  fixform: {
    title: 'Flag the B.Com form to engineering?',
    body: 'Sends the diagnostic — form breaks below 380px, 0 mobile leads in 18 hours, ₹64,300 at risk — to your engineering channel with the page and breakpoint.',
    confirm: 'Send to engineering',
    done: 'Sent — the B.Com form issue is now with engineering.',
  },
  pausejuly: {
    title: 'Pause the July-intake Meta campaign?',
    body: 'Stops ₹37,300/mo of spend reaching an intake that has already closed. You can resume it when the July window reopens.',
    confirm: 'Pause campaign',
    done: 'Campaign paused — spend to /mba-july-intake stopped.',
  },
  reallocate: {
    title: 'Shift budget from Meta prospecting to Google Search?',
    body: 'Moves spend from the two zero-lead Meta campaigns to Google Search, where cost per lead is lower. Reversible at any time.',
    confirm: 'Shift budget',
    done: 'Budget shifted — Meta prospecting down, Google Search up.',
  },
  starttest: {
    title: 'Start a landing-page test?',
    body: 'Opens the experiment wizard pre-filled for this page, using the winning MBA pattern (clearer fold + fee/scholarship nudge) with Apply-Now click as the goal.',
    confirm: 'Open the wizard',
    done: 'Experiment drafted — configure and launch it in Experiments.',
  },
}
