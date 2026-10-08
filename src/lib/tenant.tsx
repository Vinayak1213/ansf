import { createContext, useContext, useState, type ReactNode } from 'react'

/* Multi-tenant: Samurai is one product served to many clients across ANY industry.
   The Samurai brand stays constant; only the *client* (tenant) whose data & config you
   view changes. Each tenant carries a small lexicon so the product speaks that client's
   language — a university markets "programmes" against an "intake"; a SaaS company markets
   "products" against a "quarterly target". The core metric (cost per lead / CPL) is a
   cross-industry standard and stays constant. */

export interface Lexicon {
  conversion: { one: string; many: string } // what a lead is called: enquiry/enquiries, lead/leads
  offering: { one: string; many: string }    // what they market: programme, product, collection, service, project
  goalNoun: string                            // the pacing goal concept: intake, quarterly target, sales target
  goalUnit: string                            // what's counted toward it: enrolments, sign-ups, orders, bookings
  period: string                              // default goal-period label used during onboarding
}

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
}

export const INDUSTRIES = ['B2B SaaS', 'E-commerce', 'Education', 'Fintech', 'Healthcare', 'Real Estate', 'Other'] as const

const LEX: Record<string, Lexicon> = {
  'B2B SaaS':    { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'product', many: 'products' },       goalNoun: 'quarterly target', goalUnit: 'sign-ups',        period: 'Q1 2027' },
  'E-commerce':  { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'collection', many: 'collections' }, goalNoun: 'sales target',     goalUnit: 'orders',          period: 'Q1 2027' },
  'Education':   { conversion: { one: 'enquiry', many: 'enquiries' }, offering: { one: 'programme', many: 'programmes' },   goalNoun: 'intake',           goalUnit: 'enrolments',      period: 'January 2027' },
  'Fintech':     { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'product', many: 'products' },       goalNoun: 'quarterly target', goalUnit: 'approved accounts', period: 'Q1 2027' },
  'Healthcare':  { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'service', many: 'services' },       goalNoun: 'quarterly target', goalUnit: 'appointments',    period: 'this quarter' },
  'Real Estate': { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'project', many: 'projects' },       goalNoun: 'sales target',     goalUnit: 'bookings',        period: 'this quarter' },
  'Other':       { conversion: { one: 'lead', many: 'leads' },        offering: { one: 'product', many: 'products' },       goalNoun: 'target',           goalUnit: 'conversions',     period: 'this quarter' },
}
const DEFAULT_LEX = LEX['Other']
export const lexiconFor = (industry: string): Lexicon => LEX[industry] ?? DEFAULT_LEX
export const lexiconOf = (t: Tenant): Lexicon => t.lexicon ?? lexiconFor(t.industry)

/* Per-industry suggestions for "what do you market?" during onboarding. */
export const OFFER_SUGGEST: Record<string, string[]> = {
  'B2B SaaS': ['Starter', 'Pro', 'Enterprise', 'Free trial', 'Platform', 'Integrations'],
  'E-commerce': ['Apparel', 'Footwear', 'Electronics', 'Home & Living', 'Beauty', 'Accessories'],
  'Education': ['MBA', 'BBA', 'B.Com', 'BCA', 'MCA', 'M.Com', 'BA', 'B.Sc'],
  'Fintech': ['Savings account', 'Credit card', 'Personal loan', 'Investments', 'Insurance', 'Payments'],
  'Healthcare': ['Consultations', 'Diagnostics', 'Dental', 'Dermatology', 'Health checkups', 'Pharmacy'],
  'Real Estate': ['Apartments', 'Villas', 'Plots', 'Commercial', 'Rentals', 'Luxury'],
  'Other': [],
}
export const offerSuggest = (industry: string): string[] => OFFER_SUGGEST[industry] ?? []

export const initialsOf = (n: string) =>
  n.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'W'

export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/* Seed workspaces span industries so the switcher shows Samurai is not an edu-only tool.
   JAIN Online is the fully-populated flagship (a university); the others are freshly
   onboarded clients in other verticals, each already configured in its own language. */
const SEED: Tenant[] = [
  {
    id: 'jain', name: 'JAIN Online', initials: 'JO', domain: 'pages.onlinejain.com', industry: 'Education', region: 'India',
    offerings: ['MBA', 'BBA', 'B.Com', 'BCA', 'MCA', 'M.Com', 'BA', 'B.Sc'],
    goal: { name: 'January 2027', target: 600, current: 412, close: '15 Jan 2027' },
    conns: ['Google Ads', 'Meta Ads', 'CRM', 'Clarity'], lexicon: lexiconFor('Education'),
  },
  {
    id: 'northwind', name: 'Northwind CRM', initials: 'NC', domain: 'pages.northwind.io', industry: 'B2B SaaS', region: 'United States',
    offerings: ['Starter', 'Pro', 'Enterprise'], goal: { name: 'Q1 2027', target: 1200 },
    conns: ['Google Ads', 'Meta Ads', 'CRM'], fresh: true, lexicon: lexiconFor('B2B SaaS'),
  },
  {
    id: 'marlowe', name: 'Marlowe Living', initials: 'ML', domain: 'pages.marlowe.store', industry: 'E-commerce', region: 'United Kingdom',
    offerings: ['Apparel', 'Home & Living', 'Beauty'], goal: { name: 'Q1 2027', target: 5000 },
    conns: ['Google Ads', 'Meta Ads'], fresh: true, lexicon: lexiconFor('E-commerce'),
  },
]

const Ctx = createContext<{ tenant: Tenant; tenants: Tenant[]; switchTo: (id: string) => void; addTenant: (t: Tenant) => void }>({
  tenant: SEED[0], tenants: SEED, switchTo: () => {}, addTenant: () => {},
})
export const useTenant = () => useContext(Ctx)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>(SEED)
  const [id, setId] = useState('jain')
  const tenant = tenants.find((t) => t.id === id) ?? SEED[0]
  const switchTo = (tid: string) => setId(tid)
  const addTenant = (t: Tenant) => { setTenants((ts) => [t, ...ts.filter((x) => x.id !== t.id)]); setId(t.id) }
  return <Ctx.Provider value={{ tenant, tenants, switchTo, addTenant }}>{children}</Ctx.Provider>
}
