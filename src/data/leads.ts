/* Individual user-level layer — the anonymous per-visitor BEHAVIOURAL store.
   Division of ownership (the architecture): Samurai owns anonymous behaviour (an cookie-level
   visitor handle + everything it did); the CRM owns identity + outcome (name, phone, and
   contacted → qualified → enrolled). They meet at ONE join: at form-submit the anonymous handle is
   stitched to a CRM lead ref. Samurai therefore NEVER stores a name or phone — it shows behaviour,
   references the CRM record, and deep-links out for the contact.

   Modelled on seeded synthetic data (same approach as behavior.ts) so the prototype can demo it
   honestly. It RECONCILES, deterministically, no AI:
   - each page's lead records split into enrolled / qualified / lead EXACTLY by pageBiz() counts,
     so the stories sum back to the page's leads and the account's 66 enrolments.
   - abandoner records come straight from the on-page funnel (started − submitted).
   A Lead Story is a literal, ordered replay of behavioural events plus the joined CRM outcome;
   the worklist is pure recency/stage boolean logic. Nothing is predicted or scored. */
import { PAGES, CAMPAIGNS, type Page, type Campaign } from './samurai'
import { pageBiz, ticketSize, money } from './business'
import { pageBehavior, formAnalysis } from './behavior'
import type { Device } from './behavior'

/** leads idle for this many days with no site activity count as "cooling" — a visible, editable
 *  threshold, NOT a data-derived "median" (we don't fabricate a longitudinal distribution). */
export const COOL_DAYS = 7

/** lead = submitted (identity now in CRM); anonymous = behaviour only, never identified. */
export type LeadStage = 'lead' | 'qualified' | 'enrolled' | 'anonymous'

export interface VisitorEvent {
  session: number // which visit (1-based); same number = same session
  when: string // relative label, e.g. "First visit", "+3 days", "9 days ago"
  label: string
  detail?: string
  tone: 'navy' | 'pos' | 'neg' | 'warn' | 'neutral'
  crm?: boolean // this event came from the synced CRM, not Samurai's behavioural stream
}

export interface Visitor {
  id: string
  handle: string // anonymous display handle (Samurai-owned), e.g. "MBA·7F3A" — never PII
  pageId: string
  pageName: string
  programme: string
  stage: LeadStage
  known: boolean // true once the form was submitted → identity synced to the CRM
  crmRef?: string // the CRM lead reference the behaviour is stitched to (NOT a name/phone)
  firstSource: string // first-touch campaign/source label
  firstNet: Campaign['net']
  firstCostInr: number // that campaign's cost per lead — "what it cost to bring them in"
  device: Device
  sessions: number
  signals: string[] // behavioural signals exhibited (the thing the CRM can't see)
  daysToLead?: number // first touch → became a lead
  daysSinceActive: number // for the cooling check
  cooling: boolean
  revenue?: number // if enrolled (from CRM)
  droppedField?: string // for abandoners: the field they left on
  events: VisitorEvent[]
}

/* deterministic 0..1 generator seeded by a string — identical to behavior.ts, so stories are
   stable across renders (no Math.random at render). */
function rng(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h >>> 0) % 100000) / 100000 }
}
const hex4 = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0).toString(16).toUpperCase().slice(0, 4).padStart(4, '0') }
const pick = <T,>(arr: T[], r: number): T => arr[Math.min(arr.length - 1, Math.floor(r * arr.length))]

const DEVICES: Device[] = ['desktop', 'mobile', 'mobile', 'tablet'] // mobile-heavy, like the traffic

/** the campaigns that fund a page, with their share of its leads — for the first-touch source */
function sourcesFor(pageId: string): Campaign[] {
  const cs = CAMPAIGNS.filter((c) => c.pageId === pageId)
  return cs.length ? cs : CAMPAIGNS.filter((c) => c.leads > 0)
}

/** the behavioural signals a converting visitor exhibited — deterministic, used as story chips. */
function leadSignals(r: () => number, sessions: number, device: Device, stage: LeadStage): string[] {
  const s: string[] = []
  if (sessions > 1) s.push('Came back a 2nd+ time')
  if (r() < 0.55) s.push('Viewed the pricing')
  if (r() < 0.4) s.push('Spent 2+ minutes on page')
  if (r() < 0.25 || stage === 'enrolled') s.push('Downloaded a resource')
  if (device === 'mobile') s.push('On mobile')
  return s.length ? s : ['Reached the form']
}

function leadEvents(
  r: () => number,
  page: Page,
  source: Campaign,
  stage: LeadStage,
  sessions: number,
  daysToLead: number,
  daysSinceActive: number,
  signals: string[],
  device: Device,
): VisitorEvent[] {
  const ev: VisitorEvent[] = []
  const src = `${source.name} (${source.net === 'google' ? 'Google' : 'Meta'})`
  const pricing = signals.includes('Viewed the pricing')
  ev.push({ session: 1, when: 'First visit', label: `Arrived from ${src}`, detail: `${device} · landed on ${page.name}`, tone: 'navy' })
  if (sessions > 1) {
    ev.push({ session: 1, when: 'First visit', label: pricing ? 'Viewed pricing, left without becoming a lead' : 'Read the page, left without becoming a lead', detail: `Scrolled ${55 + Math.floor(r() * 35)}%`, tone: 'neutral' })
    ev.push({ session: 2, when: `+${daysToLead} days`, label: 'Came back', detail: `${device} · returned to ${page.name}`, tone: 'navy' })
    ev.push({ session: 2, when: `+${daysToLead} days`, label: 'Started the form', tone: 'neutral' })
    ev.push({ session: 2, when: `+${daysToLead} days`, label: 'Submitted — identity synced to CRM', detail: 'The anonymous visitor is now a known lead in your CRM', tone: 'pos', crm: true })
  } else {
    ev.push({ session: 1, when: 'First visit', label: 'Started the form', tone: 'neutral' })
    ev.push({ session: 1, when: 'First visit', label: 'Submitted — identity synced to CRM', detail: 'The anonymous visitor is now a known lead in your CRM', tone: 'pos', crm: true })
  }
  if (stage === 'qualified' || stage === 'enrolled') {
    ev.push({ session: sessions, when: `+${daysToLead + 1 + Math.floor(r() * 2)} days`, label: 'Marked qualified', detail: 'From your CRM · a sales-qualified lead', tone: 'navy', crm: true })
  }
  if (stage === 'enrolled') {
    ev.push({ session: sessions, when: `+${daysToLead + 4 + Math.floor(r() * 6)} days`, label: `Paid ~${money(ticketSize(page.id))}`, detail: 'From your CRM · at the average ticket', tone: 'pos', crm: true })
  } else if (daysSinceActive >= COOL_DAYS) {
    ev.push({ session: sessions, when: `${daysSinceActive} days ago`, label: 'Last activity', detail: `No behaviour for ${daysSinceActive} days — worth a nudge before they go cold`, tone: 'warn' })
  } else {
    ev.push({ session: sessions, when: `${daysSinceActive} days ago`, label: 'Last activity', detail: 'Recently active · in the follow-up queue', tone: 'neutral' })
  }
  return ev
}

function abandonerEvents(page: Page, source: Campaign, droppedField: string, device: Device): VisitorEvent[] {
  const src = `${source.name} (${source.net === 'google' ? 'Google' : 'Meta'})`
  return [
    { session: 1, when: 'First visit', label: `Arrived from ${src}`, detail: `${device} · landed on ${page.name}`, tone: 'navy' },
    { session: 1, when: 'First visit', label: 'Reached the form', detail: 'Scrolled to the form', tone: 'neutral' },
    { session: 1, when: 'First visit', label: 'Started filling it in', detail: 'Interacted with the first field', tone: 'neutral' },
    { session: 1, when: 'First visit', label: `Left on the ${droppedField} field`, detail: 'Never submitted — stays anonymous, no CRM record', tone: 'neg' },
  ]
}

/* ---- the lead store: every page's leads as CRM-stitched prospects, split by the reconciled outcome ---- */
const _leadCache: Record<string, Visitor[]> = {}
export function leadsForPage(pageId: string): Visitor[] {
  if (_leadCache[pageId]) return _leadCache[pageId]
  const page = PAGES.find((p) => p.id === pageId)
  if (!page || page.leads <= 0) { _leadCache[pageId] = []; return [] }
  const biz = pageBiz(pageId)
  const enrolled = biz.enrolled
  const qualified = biz.qualified // ≥ enrolled
  const L = page.leads
  const srcs = sourcesFor(pageId)
  const srcTotal = srcs.reduce((a, c) => a + Math.max(c.leads, 1), 0)
  const sourceAt = (r: number) => {
    let acc = r * srcTotal
    for (const c of srcs) { acc -= Math.max(c.leads, 1); if (acc <= 0) return c }
    return srcs[srcs.length - 1]
  }

  const out: Visitor[] = []
  for (let i = 0; i < L; i++) {
    const r = rng(`${pageId}:lead:${i}`)
    const stage: LeadStage = i < enrolled ? 'enrolled' : i < qualified ? 'qualified' : 'lead'
    const source = sourceAt(r())
    const device = pick(DEVICES, r())
    const sessions = r() < 0.58 ? 2 : r() < 0.9 ? 1 : 3
    const daysToLead = sessions > 1 ? 2 + Math.floor(r() * 9) : 0
    // most open leads were worked recently; a minority (~30%) slip past the follow-up window
    const cold = stage !== 'enrolled' && r() < 0.3
    const daysSinceActive = stage === 'enrolled' ? Math.floor(r() * 4) : cold ? COOL_DAYS + Math.floor(r() * 18) : 1 + Math.floor(r() * 5)
    const cooling = stage !== 'enrolled' && daysSinceActive >= COOL_DAYS
    const signals = leadSignals(r, sessions, device, stage)
    out.push({
      id: `${pageId}-L${i}`,
      handle: `${page.group}·${hex4(`${pageId}:lead:${i}`)}`,
      pageId, pageName: page.name, programme: page.group,
      stage, known: true, crmRef: `L-${4000 + ((i * 37 + page.name.length * 13) % 5000)}`,
      firstSource: source.name, firstNet: source.net, firstCostInr: source.cpl ?? page.cpl ?? 0,
      device, sessions, signals, daysToLead, daysSinceActive, cooling,
      revenue: stage === 'enrolled' ? ticketSize(pageId) : undefined,
      events: leadEvents(rng(`${pageId}:ev:${i}`), page, source, stage, sessions, daysToLead, daysSinceActive, signals, device),
    })
  }
  _leadCache[pageId] = out
  return out
}

/** every CRM-stitched lead across the account (reconciles: length = 358, enrolled = 66). */
export function allLeads(): Visitor[] {
  return PAGES.filter((p) => p.leads > 0).flatMap((p) => leadsForPage(p.id))
}

/* ---- abandoners: started the form but never submitted (from the on-page funnel), stay anonymous ---- */
const ABAND_CAP = 6
const _abandCache: Record<string, { total: number; rows: Visitor[] }> = {}
export function abandonersForPage(pageId: string): { total: number; rows: Visitor[] } {
  if (_abandCache[pageId]) return _abandCache[pageId]
  const page = PAGES.find((p) => p.id === pageId)
  if (!page) return { total: 0, rows: [] }
  const beh = pageBehavior(page)
  const started = beh.journey.find((s) => s.k === 'start')?.count ?? 0
  const submitted = beh.journey.find((s) => s.k === 'submit')?.count ?? page.leads
  const total = Math.max(0, started - submitted)
  if (total === 0) return (_abandCache[pageId] = { total: 0, rows: [] })
  const fa = formAnalysis(page, beh)
  const killer = fa.fields.find((f) => f.k === fa.killerK)
  const droppedField = killer?.label ?? 'Phone number'
  const srcs = sourcesFor(pageId)
  const n = Math.min(ABAND_CAP, total)
  const rows: Visitor[] = []
  for (let i = 0; i < n; i++) {
    const r = rng(`${pageId}:aband:${i}`)
    const source = pick(srcs, r())
    const device = pick(['mobile', 'mobile', 'desktop'] as Device[], r())
    rows.push({
      id: `${pageId}-A${i}`,
      handle: `${page.group}·${hex4(`${pageId}:aband:${i}`)}`,
      pageId, pageName: page.name, programme: page.group,
      stage: 'anonymous', known: false,
      firstSource: source.name, firstNet: source.net, firstCostInr: source.cpl ?? 0,
      device, sessions: 1, signals: ['Reached the form', 'Started, then left'], daysSinceActive: 1 + Math.floor(r() * 6), cooling: false,
      droppedField,
      events: abandonerEvents(page, source, droppedField, device),
    })
  }
  return (_abandCache[pageId] = { total, rows })
}

export interface Worklist {
  coolDays: number
  cooling: Visitor[] // callable leads gone quiet, most-urgent first (capped for display)
  coolingTotal: number
  abandoners: Visitor[] // anonymous form-abandoners (representative rows)
  abandonersTotal: number
}

/** The counsellor worklist — two deterministic, reconciling tiers:
 *  1) cooling leads (CRM-stitched; went quiet behaviourally → open in CRM to call),
 *  2) form abandoners (anonymous; from the funnel → retarget / fix the field).
 *  Pure recency/stage logic — no score, nothing predicted. */
export function counsellorWorklist(showCooling = 7, pageId?: string): Worklist {
  const coolingAll = (pageId ? leadsForPage(pageId) : allLeads())
    .filter((v) => v.cooling)
    .sort((a, b) => b.daysSinceActive - a.daysSinceActive)
  let abandonersTotal = 0
  const abandoners: Visitor[] = []
  for (const p of pageId ? PAGES.filter((x) => x.id === pageId) : PAGES) {
    const a = abandonersForPage(p.id)
    abandonersTotal += a.total
    abandoners.push(...a.rows)
  }
  return {
    coolDays: COOL_DAYS,
    cooling: coolingAll.slice(0, showCooling),
    coolingTotal: coolingAll.length,
    abandoners: abandoners.slice(0, 6),
    abandonersTotal,
  }
}
