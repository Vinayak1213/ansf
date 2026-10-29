import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/* Multi-tenant: Samurai is one product served to many clients across ANY industry.
   The Samurai brand stays constant; only the *client* (tenant) whose data & config you
   view changes. Each tenant carries a small lexicon so the product speaks that client's
   language — a university markets "programmes" against an "intake"; a SaaS company markets
   "products" against a "quarterly target". The core metric (cost per lead / CPL) is a
   cross-industry standard and stays constant. */

export interface Lexicon {
  conversion: { one: string; many: string } // what a lead is called (lead/leads across industries)
  offering: { one: string; many: string }    // what they market: programme, product, collection, service, project
  goalNoun: string                            // the pacing goal concept: intake, quarterly target, sales target
  goalUnit: string                            // what's counted toward it: enrolments, sign-ups, orders, bookings
  period: string                              // default goal-period label used during onboarding
}

/* ── Operator / provisioning model ────────────────────────────────────────────
   These describe a client as the Samurai *operator* (us) provisions it from the
   Console. They're all optional on Tenant so the product's existing workspaces
   (which have none of this) keep working unchanged. */
export type PlanId = 'trial' | 'growth' | 'scale'
export const PLANS: { id: PlanId; name: string; blurb: string }[] = [
  { id: 'trial', name: 'Trial', blurb: '14-day evaluation — full product' },
  { id: 'growth', name: 'Growth', blurb: 'Core console · up to 3 connections' },
  { id: 'scale', name: 'Scale', blurb: 'Unlimited connections · experiments' },
]
export const planName = (id?: PlanId): string => PLANS.find((p) => p.id === id)?.name ?? '—'

/** Per-plan entitlements — only the two levers that map to REAL state: the experiments
    capability (a boolean gate) and a connection cap (conns.length is genuine usage;
    null = unlimited). Seats and per-tenant experiment-runs are NOT tracked, so they're
    never surfaced as a number. An operator can grant a one-off override per tenant
    instead of inventing a 4th plan. */
export interface Entitlements { experiments: boolean; connectionCap: number | null }
export const ENTITLEMENTS: Record<PlanId, Entitlements> = {
  trial: { experiments: true, connectionCap: null }, // full-product evaluation, time-boxed
  growth: { experiments: false, connectionCap: 3 },
  scale: { experiments: true, connectionCap: null },
}
export const entitlementsOf = (t: Tenant): Entitlements => ({ ...ENTITLEMENTS[t.plan ?? 'trial'], ...t.overrides })

/** Lifecycle of a client from our side. Seed/legacy tenants carry none and read as active.
    archived = relationship closed, record kept read-only; deleted = soft-deleted (restorable). */
export type TenantStatus = 'provisioning' | 'invited' | 'active' | 'suspended' | 'archived' | 'deleted'

/** A structured reason for taking a client offline — operators pick one (+ optional note). */
export type OffboardReason = 'non_payment' | 'client_request' | 'churn' | 'abuse' | 'internal'
export const OFFBOARD_REASONS: { id: OffboardReason; label: string }[] = [
  { id: 'client_request', label: 'Client request' },
  { id: 'non_payment', label: 'Non-payment' },
  { id: 'churn', label: 'Churned' },
  { id: 'abuse', label: 'Abuse / policy' },
  { id: 'internal', label: 'Internal / testing' },
]

export interface AdminAccount {
  name: string
  email: string
}

/** How the client's first admin gets in. We never store a plaintext password — the
    one-time secret is shown once at provisioning and not persisted (mirrors the
    "raw token shown once, only its state is kept" pattern). */
export interface Access {
  method: 'invite' | 'credentials'
  username?: string // for the credentials method (derived from the admin email)
  state: 'pending' | 'activated'
  invitedAt?: number
  activatedAt?: number // stamped when the client first signs in — the clock for "signed in N days ago"
  expiresAt?: number // the sign-in handoff expires; we model a 7-day window (both methods)
}

/** One day in ms — the unit for every age/stuck threshold. */
export const DAY_MS = 86_400_000
/** The sign-in handoff window (invite link or one-time credentials). */
export const WEEK_MS = 7 * DAY_MS

export interface Tenant {
  id: string
  name: string
  initials: string
  domain: string
  industry: string // B2B SaaS · E-commerce · Education · Fintech · Healthcare · Real Estate · Other
  region: string
  offerings: string[] // what the client markets (maps to the lexicon's "offering")
  goal?: { name: string; target: number; current?: number; close?: string } // pacing goal
  conns?: string[] // connected sources (Google Ads, Meta Ads, CRM, Clarity)
  fresh?: boolean // just onboarded — no live data yet
  lexicon?: Lexicon // frozen at onboarding; falls back to the industry default

  // Operator/provisioning fields — set by the Samurai Console (admin platform).
  plan?: PlanId
  overrides?: Partial<Entitlements> // per-tenant exceptions to the plan's entitlements
  tag?: string // optional free-text label for the operator's own categorisation
  status?: TenantStatus // where this client sits in its lifecycle
  offboardReason?: string // why it was suspended/archived/deleted
  suspendedAt?: number
  archivedAt?: number
  deletedAt?: number // soft-delete stamp — the "restorable until" window is derived from this
  admin?: AdminAccount // the client's first admin, created by us at provisioning
  access?: Access // how they get in (invite link or one-time credentials)
  createdAt?: number
  createdBy?: string // which operator provisioned them
  source?: 'seed' | 'operator' | 'self-serve'
}

export const INDUSTRIES = ['B2B SaaS', 'E-commerce', 'Education', 'Fintech', 'Healthcare', 'Real Estate', 'Other'] as const

const LEX: Record<string, Lexicon> = {
  'B2B SaaS':    { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'product', many: 'products' },       goalNoun: 'quarterly target', goalUnit: 'sign-ups',        period: 'Q1 2027' },
  'E-commerce':  { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'collection', many: 'collections' }, goalNoun: 'sales target',     goalUnit: 'orders',          period: 'Q1 2027' },
  'Education':   { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'programme', many: 'programmes' },   goalNoun: 'intake',           goalUnit: 'enrolments',      period: 'January 2027' },
  'Fintech':     { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'product', many: 'products' },       goalNoun: 'quarterly target', goalUnit: 'approved accounts', period: 'Q1 2027' },
  'Healthcare':  { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'service', many: 'services' },       goalNoun: 'quarterly target', goalUnit: 'appointments',    period: 'this quarter' },
  'Real Estate': { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'project', many: 'projects' },       goalNoun: 'sales target',     goalUnit: 'bookings',        period: 'this quarter' },
  'Other':       { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'product', many: 'products' },       goalNoun: 'target',           goalUnit: 'conversions',     period: 'this quarter' },
}
const DEFAULT_LEX = LEX['Other']
export const lexiconFor = (industry: string): Lexicon => LEX[industry] ?? DEFAULT_LEX
export const lexiconOf = (t: Tenant): Lexicon => t.lexicon ?? lexiconFor(t.industry)

export const initialsOf = (n: string) =>
  n.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'W'

export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** Only this tenant owns the bundled demo dataset (ACCOUNT / PAGES / LEAKS / EXPERIMENTS …).
    Every other workspace — fresh OR live — has no data of its own yet, so product screens
    must show honest empty states for it and never render these numbers under its name. */
export const ownsSeededData = (t: Tenant): boolean => t.id === 'jain'

/** True when the product was opened as a read-only operator view (?view=operator),
    i.e. impersonation / "view as client". The product shows a banner and suppresses
    client-only mutations (e.g. "Finish setup") in this mode. */
export const isOperatorView = (): boolean => {
  try { return new URLSearchParams(window.location.search).get('view') === 'operator' } catch { return false }
}

/* Seed workspaces span industries so the switcher shows Samurai is not an edu-only tool,
   and they double as the Console's demo portfolio — each carries a REAL (aged) provisioning
   record so the operator funnel and needs-attention queue have honest content to show:
   - JAIN Online — the live flagship (not fresh): fully set up, signed in long ago.
   - Northwind CRM — invited 10 days ago, never signed in → its 7-day invite has expired.
   - Marlowe Living — signed in 6 days ago but hasn't connected any data yet.
   Ages are relative to load time so "N days ago" stays honest; nothing here is a fabricated
   metric — it's genuine provisioning state the Console computes from. */
const ago = (days: number) => Date.now() - days * DAY_MS
const SEED: Tenant[] = [
  {
    id: 'jain', name: 'JAIN Online', initials: 'JO', domain: 'pages.onlinejain.com', industry: 'Education', region: 'India',
    offerings: ['MBA', 'BBA', 'B.Com', 'BCA', 'MCA', 'M.Com', 'BA', 'B.Sc'],
    goal: { name: 'January 2027', target: 600, current: 412, close: '15 Jan 2027' },
    conns: ['Google Ads', 'Meta Ads', 'CRM', 'Clarity'], lexicon: lexiconFor('Education'),
    source: 'operator', plan: 'scale', status: 'active', createdAt: ago(62), createdBy: 'Samurai Operations',
    admin: { name: 'Akshay R', email: 'akshay@onlinejain.com' },
    access: { method: 'invite', state: 'activated', invitedAt: ago(62), activatedAt: ago(61) },
  },
  {
    id: 'northwind', name: 'Northwind CRM', initials: 'NC', domain: 'pages.northwind.io', industry: 'B2B SaaS', region: 'United States',
    offerings: [], conns: [], fresh: true, lexicon: lexiconFor('B2B SaaS'),
    source: 'operator', plan: 'growth', status: 'invited', createdAt: ago(10), createdBy: 'Samurai Operations',
    admin: { name: 'Dana Cole', email: 'dana@northwind.io' },
    access: { method: 'invite', state: 'pending', invitedAt: ago(10), expiresAt: ago(3) },
  },
  {
    id: 'marlowe', name: 'Marlowe Living', initials: 'ML', domain: 'pages.marlowe.store', industry: 'E-commerce', region: 'United Kingdom',
    offerings: [], conns: [], fresh: true, lexicon: lexiconFor('E-commerce'),
    source: 'operator', plan: 'growth', status: 'active', createdAt: ago(7), createdBy: 'Samurai Operations',
    admin: { name: 'Sofia Marlowe', email: 'sofia@marlowe.store' },
    access: { method: 'credentials', state: 'activated', username: 'sofia@marlowe.store', invitedAt: ago(7), activatedAt: ago(6) },
  },
]

const Ctx = createContext<{
  tenant: Tenant
  tenants: Tenant[]
  switchTo: (id: string) => void
  addTenant: (t: Tenant) => void
  updateTenant: (id: string, patch: Partial<Tenant>) => void
}>({
  tenant: SEED[0], tenants: SEED, switchTo: () => {}, addTenant: () => {}, updateTenant: () => {},
})
export const useTenant = () => useContext(Ctx)

export function TenantProvider({ children }: { children: ReactNode }) {
  // Every client (seeds included) lives in one shared store (localStorage) so the
  // product and the Console — two entries on the same origin — never disagree.
  const [tenants, setTenants] = useState<Tenant[]>(loadOperatorTenants)
  const [id, setId] = useState<string>(initialTenantId)

  // When the Console (a separate entry on the same origin) provisions or changes a
  // client, this tab hears it through the storage event and re-reads.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === STORE_KEY) setTenants(loadOperatorTenants()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const tenant = tenants.find((t) => t.id === id) ?? tenants[0] ?? SEED[0]
  const switchTo = (tid: string) => setId(tid)
  const addTenant = (t: Tenant) => { setTenants(addOperatorTenant(t)); setId(t.id) }
  const updateTenant = (tid: string, patch: Partial<Tenant>) => setTenants(updateOperatorTenant(tid, patch))
  return <Ctx.Provider value={{ tenant, tenants, switchTo, addTenant, updateTenant }}>{children}</Ctx.Provider>
}

/* ── Shared tenant store (prototype) ──────────────────────────────────────────
   The product and the operator Console are two separate Vite entries on the same
   origin, so they can only share state through localStorage. The store is the single
   source of truth for ALL clients; SEED is the one-time initializer written on first
   run (so the demo portfolio is fully mutable — the Console can resend/suspend/update
   it like any provisioned client). Bump STORE_KEY to re-seed after changing SEED. */
export const STORE_KEY = 'samurai.clients.v2'

export function loadOperatorTenants(): Tenant[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw == null) { saveOperatorTenants(SEED); return SEED } // first run → seed the store
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? (parsed as Tenant[]) : SEED
  } catch { return SEED }
}
function saveOperatorTenants(ts: Tenant[]) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(ts)) } catch { /* ignore */ }
}
/** The canonical list for any reader (Console, or a product tab at boot). */
export function allTenants(): Tenant[] {
  return loadOperatorTenants()
}
export function addOperatorTenant(t: Tenant): Tenant[] {
  const next = [t, ...loadOperatorTenants().filter((x) => x.id !== t.id)]
  saveOperatorTenants(next)
  return next
}
export function updateOperatorTenant(id: string, patch: Partial<Tenant>): Tenant[] {
  const next = loadOperatorTenants().map((t) => (t.id === id ? { ...t, ...patch } : t))
  saveOperatorTenants(next)
  return next
}
/** The ONE physical removal — a hard purge. Soft-delete/archive are status flips above;
    this is the only path that actually drops the record. */
export function removeOperatorTenant(id: string): Tenant[] {
  const next = loadOperatorTenants().filter((t) => t.id !== id)
  saveOperatorTenants(next)
  return next
}

/** The product can be deep-linked to a client with ?tenant=<id> (the Console's
    "Open their workspace" uses this). Falls back to the flagship. */
function initialTenantId(): string {
  try {
    const q = new URLSearchParams(window.location.search).get('tenant')
    if (q && allTenants().some((t) => t.id === q)) return q
  } catch { /* ignore */ }
  return 'jain'
}

/* ── Provisioning helpers (prototype) ─────────────────────────────────────────
   Deterministic, inspectable generators. The one-time secret (invite token or
   temp password) is shown once at the handoff and never written to the store. */
export const slugify = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24)
export const usernameFromEmail = (email: string): string => email.trim().toLowerCase()

/** URL-safe one-time token for an invite link (no ambiguous chars). */
export function genToken(len = 24): string {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < len; i++) s += abc[Math.floor(Math.random() * abc.length)]
  return s
}
/** Readable, speakable one-time password (operator reads it to the client). */
export function genTempPassword(): string {
  const words = ['river', 'ember', 'quartz', 'harbor', 'maple', 'cobalt', 'lotus', 'cedar', 'onyx', 'vellum', 'slate', 'aspen']
  const a = Math.floor(Math.random() * words.length)
  let b = Math.floor(Math.random() * words.length)
  if (b === a) b = (b + 1) % words.length // two distinct words
  return `${cap(words[a])}-${cap(words[b])}-${100 + Math.floor(Math.random() * 900)}`
}
