import { pageBiz } from './business'
import { pageBehavior, type PageBehavior } from './behavior'
import type { Page } from './samurai'

/* ============================================================================
   Funnel builder — a sandbox for composing ANY funnel on a page.

   The user assembles a funnel, in any order, from a catalog of stages grouped by
   where the data comes from:
     • Page events   — from the behaviour-capture tag (views, scroll, clicks, form steps)
     • Ad spend      — from the ad platforms (spend, clicks)
     • CRM & revenue — from the client's CRM, via a mapped field (qualified, paid, revenue,
                        or any custom stage they map themselves)

   We ship a set of DEFAULT funnels, pre-configured account-wide; from there a user can
   build a custom funnel for a specific page from scratch. Determinism holds: a stage only
   shows a number when its source is connected and the field has data — otherwise it reads
   "connect …" or "awaiting sync", which is exactly what a newly-onboarded client sees until
   they connect their tag / ad accounts / CRM and map their fields.
   ========================================================================== */

export type StepSource = 'ad' | 'tag' | 'crm' | 'finance'
type Ctx = { p: Page; biz: ReturnType<typeof pageBiz>; beh: PageBehavior }

export const SOURCE_GROUP: Record<StepSource, string> = { ad: 'Ad spend', tag: 'Website activity', crm: 'CRM & revenue', finance: 'CRM & revenue' }
export const SOURCE_LABEL: Record<StepSource, string> = { ad: 'Ads', tag: 'Website', crm: 'CRM', finance: 'Finance' }

/** CRM / finance fields the connected CRM exposes, for mapping a stage to. The first four are
 *  populated in the demo workspace; the rest are real stages a client might map that have no data
 *  until their CRM is synced — they demonstrate the honest "awaiting sync" state. */
export const CRM_FIELDS: { key: string; label: string }[] = [
  { key: 'sales_qualified', label: 'Sales-qualified lead' },
  { key: 'registration_paid', label: 'Registration paid' },
  { key: 'fee_paid', label: 'Programme fee paid (enrolled)' },
  { key: 'revenue', label: 'Revenue (₹)' },
  { key: 'application_started', label: 'Application started' },
  { key: 'interview_scheduled', label: 'Interview scheduled' },
  { key: 'offer_accepted', label: 'Offer accepted' },
]

function crmFieldValue(field: string, { biz }: Ctx): number | null {
  switch (field) {
    case 'sales_qualified': return biz.qualified
    case 'registration_paid': return Math.min(biz.qualified, Math.round(biz.enrolled * 1.3))
    case 'fee_paid': return biz.enrolled
    case 'revenue': return biz.revenue
    case 'leads': return biz.leads
    default: return null // a real CRM field, but nothing synced to it in this workspace
  }
}

const depth = (b: PageBehavior, pct: number) => Math.round((b.sessions * pct) / 100)
const jcount = (b: PageBehavior, k: string) => b.journey.find((s) => s.k === k)?.count ?? 0
const elClicks = (b: PageBehavior, k: string) => b.elements.find((e) => e.k === k)?.clicks ?? 0
const branch = (b: PageBehavior, k: string) => b.branches.find((x) => x.k === k)?.count ?? 0

export interface FunnelStepDef {
  id: string
  label: string
  source: StepSource
  money?: boolean
  crmField?: string
  resolve: (ctx: Ctx) => number | null
}

/** The stages a funnel can be built from, in natural spine order. */
export const FUNNEL_CATALOG: FunnelStepDef[] = [
  // ad spend
  { id: 'spend', label: 'Spend', source: 'ad', money: true, resolve: ({ p }) => p.spend },
  { id: 'clicks', label: 'Ad clicks', source: 'ad', resolve: ({ p }) => p.clicks },
  // page events (behaviour tag)
  { id: 'visits', label: 'Visits', source: 'tag', resolve: ({ p }) => p.visits },
  { id: 'scroll25', label: 'Scrolled past the hero', source: 'tag', resolve: ({ beh }) => depth(beh, beh.scroll.reach.p25) },
  { id: 'scroll50', label: 'Reached mid-page', source: 'tag', resolve: ({ beh }) => depth(beh, beh.scroll.reach.p50) },
  { id: 'reachform', label: 'Reached the form', source: 'tag', resolve: ({ beh }) => jcount(beh, 'scroll') },
  { id: 'apply', label: 'Clicked Apply Now', source: 'tag', resolve: ({ beh }) => elClicks(beh, 'apply') },
  { id: 'prospectus', label: 'Downloaded prospectus', source: 'tag', resolve: ({ beh }) => branch(beh, 'prospectus') },
  { id: 'whatsapp', label: 'Opened WhatsApp', source: 'tag', resolve: ({ beh }) => branch(beh, 'whatsapp') },
  { id: 'formstart', label: 'Form started', source: 'tag', resolve: ({ beh }) => jcount(beh, 'start') },
  { id: 'leads', label: 'Leads from ads', source: 'tag', resolve: ({ p }) => p.leads },
  // CRM & revenue
  { id: 'qualified', label: 'Qualified', source: 'crm', crmField: 'sales_qualified', resolve: (c) => crmFieldValue('sales_qualified', c) },
  { id: 'registration', label: 'Registration paid', source: 'crm', crmField: 'registration_paid', resolve: (c) => crmFieldValue('registration_paid', c) },
  { id: 'enrolled', label: 'Programme fee paid', source: 'crm', crmField: 'fee_paid', resolve: (c) => crmFieldValue('fee_paid', c) },
  { id: 'revenue', label: 'Revenue', source: 'finance', money: true, crmField: 'revenue', resolve: (c) => crmFieldValue('revenue', c) },
]
export const stepDef = (id: string) => FUNNEL_CATALOG.find((s) => s.id === id)
export const crmFieldLabel = (key?: string) => CRM_FIELDS.find((f) => f.key === key)?.label ?? key ?? ''

/** A reference to a stage in a saved funnel. Catalog stages are just an id; a custom CRM stage
 *  also carries its label and the CRM field it maps to. */
export interface StepRef { id: string; label?: string; crmField?: string }
export interface FunnelDef { name: string; steps: StepRef[] }

/** the seed default — the safe ad/tag spine every workspace can show once its tag + ads are live */
export const DEFAULT_FUNNEL: FunnelDef = { name: 'Spend → lead', steps: [{ id: 'spend' }, { id: 'clicks' }, { id: 'visits' }, { id: 'leads' }] }

export const FUNNEL_TEMPLATES: FunnelDef[] = [
  DEFAULT_FUNNEL,
  { name: 'Spend → enrolment', steps: [{ id: 'spend' }, { id: 'clicks' }, { id: 'leads' }, { id: 'registration' }, { id: 'enrolled' }] },
  { name: 'On-page to lead', steps: [{ id: 'visits' }, { id: 'reachform' }, { id: 'apply' }, { id: 'formstart' }, { id: 'leads' }] },
  { name: 'Lead → revenue', steps: [{ id: 'leads' }, { id: 'qualified' }, { id: 'enrolled' }, { id: 'revenue' }] },
]

export type StepStatus = 'ok' | 'awaiting' | 'disconnected'
export interface ResolvedStep { id: string; label: string; source: StepSource; money: boolean; crmField?: string; value: number | null; status: StepStatus }

export interface FunnelCtx { p: Page; adsConnected: boolean; tagConnected: boolean; crmConnected: boolean }

function connected(source: StepSource, ctx: FunnelCtx) {
  if (source === 'ad') return ctx.adsConnected
  if (source === 'tag') return ctx.tagConnected
  return ctx.crmConnected // crm | finance
}

export function resolveFunnel(def: FunnelDef, ctx: FunnelCtx): ResolvedStep[] {
  const rc: Ctx = { p: ctx.p, biz: pageBiz(ctx.p.id), beh: pageBehavior(ctx.p) }
  return def.steps.map((ref) => {
    const cat = stepDef(ref.id)
    const source: StepSource = cat?.source ?? 'crm'
    const money = cat?.money ?? source === 'finance'
    const label = ref.label ?? cat?.label ?? 'Custom stage'
    const crmField = ref.crmField ?? cat?.crmField
    const base = { id: ref.id, label, source, money, crmField }
    if (!connected(source, ctx)) return { ...base, value: null, status: 'disconnected' as StepStatus }
    const v = cat ? cat.resolve(rc) : (crmField ? crmFieldValue(crmField, rc) : null)
    return { ...base, value: v, status: (v == null ? 'awaiting' : 'ok') as StepStatus }
  })
}

/* ---- per-tenant persistence: one account default + per-page overrides ---- */
interface FunnelStore { default: FunnelDef; overrides: Record<string, FunnelDef> }
const KEY = (tenantId: string) => `samurai.funnels.${tenantId}`

export function loadFunnels(tenantId: string): FunnelStore {
  try {
    const raw = localStorage.getItem(KEY(tenantId))
    if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.default?.steps)) return { default: s.default, overrides: s.overrides ?? {} } }
  } catch { /* ignore — fall back to the seed default */ }
  return { default: { ...DEFAULT_FUNNEL }, overrides: {} }
}
function persist(tenantId: string, store: FunnelStore) {
  try { localStorage.setItem(KEY(tenantId), JSON.stringify(store)) } catch { /* ignore */ }
}
export function funnelForPage(tenantId: string, pageId: string): { def: FunnelDef; scope: 'default' | 'page' } {
  const s = loadFunnels(tenantId)
  return s.overrides[pageId] ? { def: s.overrides[pageId], scope: 'page' } : { def: s.default, scope: 'default' }
}
export function saveDefaultFunnel(tenantId: string, def: FunnelDef) { const s = loadFunnels(tenantId); s.default = def; persist(tenantId, s) }
export function savePageFunnel(tenantId: string, pageId: string, def: FunnelDef) { const s = loadFunnels(tenantId); s.overrides[pageId] = def; persist(tenantId, s) }
export function clearPageFunnel(tenantId: string, pageId: string) { const s = loadFunnels(tenantId); delete s.overrides[pageId]; persist(tenantId, s) }
