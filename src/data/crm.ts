import { cap, lexiconOf, type Tenant } from '@/lib/tenant'

/* ============================================================================
   CRM sync — the generic, industry-agnostic data layer.

   DIRECTION: Samurai READS FROM the client's CRM. It is one-way and read-only —
   we pull their deal/revenue data in to power Samurai's analytics; we never write
   anything back. The client tells us which of THEIR CRM fields each Samurai field
   should be read from.

   Samurai keeps a small canonical pipeline it understands (this list grows as the
   product does):  Lead → Qualified → Opportunity → Closed → Revenue.
   "Closed" is labelled by the tenant's lexicon (enrolments / orders / sign-ups …).
   For a pipeline/status field the client drills into WHICH value(s) count
   (e.g. Closed is read from "Deal stage" when it's "Closed won"; many values can
   roll up to one). Every other field also flows in and is searchable directly in
   the widget / funnel builder.

   Determinism holds: a value appears only when its source is connected, mapped and
   synced — otherwise it reads "awaiting sync" / "connect your CRM". This is the
   config/model layer; nothing here fabricates a number.
   ========================================================================== */

export type FieldType = 'count' | 'currency' | 'stage' | 'date' | 'text'
/** A field read from the client's CRM (a simulated "schema describe").
 *  `options` lists the available values of a pipeline/status/picklist field. */
export interface SourceField { id: string; label: string; type: FieldType; options?: string[] }
export interface CrmProvider { id: string; name: string; initials: string; blurb: string; fields: SourceField[] }

/* Realistic-but-simulated field lists — a real CRM exposes dozens of fields, so the
   dropdowns are generous. The pipeline fields carry their available values for drill-down. */
const META: SourceField[] = [
  { id: 'owner', label: 'Record owner', type: 'text' },
  { id: 'source', label: 'Lead source', type: 'text' },
  { id: 'campaign', label: 'Original campaign', type: 'text' },
  { id: 'created', label: 'Created date', type: 'date' },
  { id: 'lastactivity', label: 'Last activity date', type: 'date' },
  { id: 'closedate', label: 'Close date', type: 'date' },
]
export const CRM_PROVIDERS: CrmProvider[] = [
  {
    id: 'hubspot', name: 'HubSpot', initials: 'HS', blurb: 'Marketing & sales CRM',
    fields: [
      { id: 'lifecyclestage', label: 'Lifecycle stage', type: 'stage', options: ['Subscriber', 'Lead', 'Marketing qualified lead', 'Sales qualified lead', 'Opportunity', 'Customer', 'Evangelist'] },
      { id: 'hs_lead_status', label: 'Lead status', type: 'stage', options: ['New', 'Open', 'In progress', 'Connected', 'Open deal', 'Unqualified'] },
      { id: 'dealstage', label: 'Deal stage', type: 'stage', options: ['Appointment scheduled', 'Qualified to buy', 'Presentation scheduled', 'Decision maker bought-in', 'Contract sent', 'Closed won', 'Closed lost'] },
      { id: 'hs_forecast_category', label: 'Forecast category', type: 'stage', options: ['Pipeline', 'Best case', 'Commit', 'Closed won'] },
      { id: 'amount', label: 'Deal amount', type: 'currency' },
      { id: 'hs_acv', label: 'Annual contract value', type: 'currency' },
      { id: 'hs_arr', label: 'Annual recurring revenue', type: 'currency' },
      { id: 'hs_mrr', label: 'Monthly recurring revenue', type: 'currency' },
      { id: 'hs_tcv', label: 'Total contract value', type: 'currency' },
      { id: 'hs_forecast_amount', label: 'Forecast amount', type: 'currency' },
      { id: 'num_associated_contacts', label: 'Associated contacts', type: 'count' },
      { id: 'num_times_contacted', label: 'Times contacted', type: 'count' },
      { id: 'num_notes', label: 'Number of sales notes', type: 'count' },
      { id: 'hs_deal_stage_probability', label: 'Deal probability', type: 'count' },
      { id: 'days_to_close', label: 'Days to close', type: 'count' },
      { id: 'pipeline', label: 'Pipeline', type: 'text' },
      { id: 'deal_currency_code', label: 'Deal currency', type: 'text' },
      ...META,
    ],
  },
  {
    id: 'salesforce', name: 'Salesforce', initials: 'SF', blurb: 'Enterprise CRM',
    fields: [
      { id: 'StageName', label: 'Opportunity stage', type: 'stage', options: ['Prospecting', 'Qualification', 'Needs Analysis', 'Value Proposition', 'Id. Decision Makers', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won', 'Closed Lost'] },
      { id: 'LeadStatus', label: 'Lead status', type: 'stage', options: ['Open - Not Contacted', 'Working - Contacted', 'Closed - Converted', 'Closed - Not Converted'] },
      { id: 'ForecastCategoryName', label: 'Forecast category', type: 'stage', options: ['Pipeline', 'Best Case', 'Commit', 'Closed', 'Omitted'] },
      { id: 'Type', label: 'Opportunity type', type: 'stage', options: ['New Business', 'Existing Business', 'Renewal'] },
      { id: 'Amount', label: 'Opportunity amount', type: 'currency' },
      { id: 'ExpectedRevenue', label: 'Expected revenue', type: 'currency' },
      { id: 'ACV', label: 'Annual contract value', type: 'currency' },
      { id: 'TCV', label: 'Total contract value', type: 'currency' },
      { id: 'Probability', label: 'Probability (%)', type: 'count' },
      { id: 'NumberOfEmployees', label: 'Company size', type: 'count' },
      { id: 'Number_of_Contacts', label: 'Number of contacts', type: 'count' },
      { id: 'OwnerId', label: 'Opportunity owner', type: 'text' },
      { id: 'LeadSource', label: 'Lead source', type: 'text' },
      { id: 'AccountId', label: 'Account', type: 'text' },
      { id: 'Region', label: 'Region', type: 'text' },
      ...META,
    ],
  },
  {
    id: 'zoho', name: 'Zoho CRM', initials: 'ZO', blurb: 'SMB CRM',
    fields: [
      { id: 'Stage', label: 'Deal stage', type: 'stage', options: ['Qualification', 'Needs Analysis', 'Value Proposition', 'Identify Decision Makers', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won', 'Closed Lost'] },
      { id: 'Lead_Status', label: 'Lead status', type: 'stage', options: ['Not Contacted', 'Attempted to Contact', 'Contacted', 'Qualified', 'Junk Lead', 'Lost Lead'] },
      { id: 'Amount', label: 'Deal amount', type: 'currency' },
      { id: 'Expected_Revenue', label: 'Expected revenue', type: 'currency' },
      { id: 'Probability', label: 'Probability (%)', type: 'count' },
      { id: 'No_of_Employees', label: 'Company size', type: 'count' },
      { id: 'Owner', label: 'Deal owner', type: 'text' },
      { id: 'Lead_Source', label: 'Lead source', type: 'text' },
      { id: 'Account_Name', label: 'Account', type: 'text' },
      ...META,
    ],
  },
  {
    id: 'pipedrive', name: 'Pipedrive', initials: 'PD', blurb: 'Sales pipeline CRM',
    fields: [
      { id: 'stage_id', label: 'Pipeline stage', type: 'stage', options: ['Lead in', 'Contact made', 'Demo scheduled', 'Proposal made', 'Negotiations started', 'Won', 'Lost'] },
      { id: 'status', label: 'Deal status', type: 'stage', options: ['Open', 'Won', 'Lost'] },
      { id: 'value', label: 'Deal value', type: 'currency' },
      { id: 'weighted_value', label: 'Weighted value', type: 'currency' },
      { id: 'mrr', label: 'Recurring revenue', type: 'currency' },
      { id: 'probability', label: 'Probability (%)', type: 'count' },
      { id: 'activities_count', label: 'Activities', type: 'count' },
      { id: 'owner_name', label: 'Deal owner', type: 'text' },
      { id: 'lead_source', label: 'Source channel', type: 'text' },
      ...META,
    ],
  },
  {
    id: 'superleap', name: 'Superleap', initials: 'SL', blurb: 'Admissions & sales CRM',
    fields: [
      { id: 'application_status', label: 'Application status', type: 'stage', options: ['Enquiry', 'Application started', 'Document verification', 'Counselling booked', 'Sales qualified', 'Registration paid', 'Programme fee paid', 'Enrolled', 'Dropped'] },
      { id: 'lead_stage', label: 'Lead stage', type: 'stage', options: ['New', 'Contacted', 'Nurturing', 'Hot', 'Cold'] },
      { id: 'fees_collected', label: 'Fees collected', type: 'currency' },
      { id: 'programme_fee', label: 'Programme fee', type: 'currency' },
      { id: 'scholarship_amount', label: 'Scholarship granted', type: 'currency' },
      { id: 'registration_fee', label: 'Registration fee', type: 'currency' },
      { id: 'counselling', label: 'Counselling sessions', type: 'count' },
      { id: 'documents_submitted', label: 'Documents submitted', type: 'count' },
      { id: 'programme', label: 'Programme', type: 'text' },
      { id: 'intake', label: 'Intake', type: 'text' },
      { id: 'counsellor', label: 'Assigned counsellor', type: 'text' },
      ...META,
    ],
  },
  {
    id: 'csv', name: 'Other / CSV upload', initials: 'CSV', blurb: 'Spreadsheet or any other system',
    fields: [
      { id: 'status', label: 'Status', type: 'stage', options: ['Lead', 'Qualified', 'Opportunity', 'Won', 'Lost'] },
      { id: 'qualified', label: 'Qualified', type: 'count' },
      { id: 'opportunity', label: 'Opportunity', type: 'count' },
      { id: 'closed', label: 'Closed', type: 'count' },
      { id: 'revenue', label: 'Revenue', type: 'currency' },
      { id: 'deal_value', label: 'Deal value', type: 'currency' },
      ...META,
    ],
  },
]
export const providerOf = (id?: string) => CRM_PROVIDERS.find((p) => p.id === id)
export const fieldOf = (providerId: string | undefined, fieldId?: string) => providerOf(providerId)?.fields.find((f) => f.id === fieldId)
export const sourceFieldLabel = (providerId: string | undefined, fieldId?: string) => fieldOf(providerId, fieldId)?.label ?? fieldId ?? ''

/* ── Samurai's canonical pipeline (grows with the product) ──────────────────── */
export type CanonicalId = 'lead' | 'qualified' | 'opportunity' | 'closed' | 'revenue'

export interface CanonicalField {
  id: CanonicalId
  label: (lex: ReturnType<typeof lexiconOf>) => string
  hint: string
  required?: boolean
  money?: boolean
  resolveKey: string // the reconciled-dataset key this canonical resolves through (stable, back-compat)
}
export const CANONICAL_FIELDS: CanonicalField[] = [
  { id: 'lead', label: () => 'Lead', hint: 'A new lead recorded in your CRM.', resolveKey: 'leads' },
  { id: 'qualified', label: () => 'Qualified lead', hint: 'A lead your sales team marks as qualified.', resolveKey: 'sales_qualified' },
  { id: 'opportunity', label: () => 'Opportunity', hint: 'A live deal opened in your pipeline.', resolveKey: 'registration_paid' },
  { id: 'closed', label: (lex) => cap(lex.goalUnit), hint: 'The deal your CRM marks as won.', required: true, resolveKey: 'fee_paid' },
  { id: 'revenue', label: () => 'Revenue', hint: 'The value a closed deal is worth.', required: true, money: true, resolveKey: 'revenue' },
]
export const canonicalLabel = (id: CanonicalId, t: Tenant) => CANONICAL_FIELDS.find((c) => c.id === id)?.label(lexiconOf(t)) ?? id
/** What each mapped field powers inside Samurai — shown in the "what this powers" panel. */
export const canonicalUsage = (id: CanonicalId, t: Tenant): string => {
  const closed = canonicalLabel('closed', t).toLowerCase().replace(/s$/, '')
  return {
    lead: 'Lead volume and blended cost per lead, per page and campaign',
    qualified: 'Qualified-lead rate and lead quality — which spend brings good leads',
    opportunity: `Pipeline conversion — how many leads become live deals`,
    closed: `Cost per ${closed}, lead-to-${closed} conversion, and the money-leak / ROI analytics`,
    revenue: 'Revenue, return on ad spend (ROAS) and cost to acquire a customer (CAC)',
  }[id]
}

/* ── Config stored on the tenant ───────────────────────────────────────────── */
export type CrmStatus = 'disconnected' | 'awaiting' | 'synced' | 'error'
/** A Samurai ← source-field mapping. For a pipeline/status field, `values` says which of
 *  its values count toward this Samurai field (many values can roll up to one). */
export interface FieldMapping { field: string; values?: string[] }
export interface CrmConfig {
  provider?: string
  status: CrmStatus
  lastSynced?: number
  mappings: Partial<Record<CanonicalId, FieldMapping>>
}
export const emptyCrmConfig = (): CrmConfig => ({ status: 'disconnected', mappings: {} })
export const crmConfigOf = (t: Tenant): CrmConfig => t.crm ?? emptyCrmConfig()
export const isCrmConnected = (t: Tenant): boolean => crmConfigOf(t).status !== 'disconnected'

const VAL_RE: Record<CanonicalId, RegExp> = {
  lead: /\blead\b|new|enquir|subscriber|contacted/i,
  qualified: /qualif|sql|mql/i,
  opportunity: /opportun|proposal|negotiat|registration|demo|decision|commit|best case/i,
  closed: /won|closed won|enrol|fee.?paid|customer|convert|\bpaid\b/i,
  revenue: /revenue|amount|value|acv|arr|mrr|tcv|fee/i,
}
/** which of a pipeline field's values look like this canonical (pre-selected on pick) */
export function suggestValues(id: CanonicalId, field?: SourceField): string[] {
  if (!field?.options || id === 'revenue') return []
  return field.options.filter((o) => VAL_RE[id].test(o))
}
/** name/value-based auto-match — proposes a field (and, for a pipeline field, which values). */
export function autoMatch(id: CanonicalId, fields: SourceField[]): FieldMapping | undefined {
  if (id === 'revenue') {
    const f = fields.find((x) => x.type === 'currency' && VAL_RE.revenue.test(`${x.label} ${x.id}`)) ?? fields.find((x) => x.type === 'currency')
    return f ? { field: f.id } : undefined
  }
  for (const sf of fields.filter((x) => x.type === 'stage' && x.options?.length)) {
    const values = sf.options!.filter((o) => VAL_RE[id].test(o))
    if (values.length) return { field: sf.id, values }
  }
  const cf = fields.find((x) => x.type === 'count' && VAL_RE[id].test(`${x.label} ${x.id}`))
  return cf ? { field: cf.id } : undefined
}

export function mappingProgress(cfg: CrmConfig): { mapped: number; total: number; requiredLeft: number } {
  const mapped = CANONICAL_FIELDS.filter((f) => cfg.mappings[f.id]?.field).length
  const requiredLeft = CANONICAL_FIELDS.filter((f) => f.required && !cfg.mappings[f.id]?.field).length
  return { mapped, total: CANONICAL_FIELDS.length, requiredLeft }
}
export function statusFor(cfg: CrmConfig): CrmStatus {
  if (!cfg.provider) return 'disconnected'
  return mappingProgress(cfg).requiredLeft > 0 ? 'awaiting' : 'synced'
}

/* ── Bridge to the widget / funnel builder ─────────────────────────────────────
   Every synced numeric field (count / currency) is usable as widget/funnel data and
   searchable. A field that is the source of a mapped canonical resolves to real
   reconciled data; any other synced field has no data in this workspace yet, so it
   reads the honest "awaiting sync" state. */
const CANON_RESOLVE: Record<CanonicalId, string> = { lead: 'leads', qualified: 'sales_qualified', opportunity: 'registration_paid', closed: 'fee_paid', revenue: 'revenue' }
export interface TenantCrmField { id: string; label: string; money?: boolean; resolveKey: string; custom?: boolean }
export function tenantCrmFields(t: Tenant): TenantCrmField[] {
  const cfg = crmConfigOf(t)
  if (cfg.status === 'disconnected') return []
  const prov = providerOf(cfg.provider)
  if (!prov) return []
  const sourceToCanon: Record<string, CanonicalId> = {}
  for (const f of CANONICAL_FIELDS) { const m = cfg.mappings[f.id]; if (m?.field) sourceToCanon[m.field] = f.id }
  return prov.fields
    .filter((f) => f.type === 'count' || f.type === 'currency')
    .map((f) => {
      const canon = sourceToCanon[f.id]
      return { id: `crm::${f.id}`, label: f.label, money: f.type === 'currency', resolveKey: canon ? CANON_RESOLVE[canon] : `crm:${f.id}`, custom: true }
    })
}
