import { ArrowLeft, ArrowRight, Check, Lock, RefreshCw, Sparkles } from 'lucide-react'
import { Badge, Card, SectionHead } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'
import { lexiconOf, useTenant } from '@/lib/tenant'
import {
  CANONICAL_FIELDS, CRM_PROVIDERS, autoMatch, canonicalUsage, crmConfigOf, emptyCrmConfig,
  fieldOf, mappingProgress, providerOf, statusFor, suggestValues, type CanonicalId, type CrmConfig,
} from '@/data/crm'

/* Self-serve CRM sync. Samurai READS FROM the client's CRM (one-way, read-only): they tell us
   which CRM field to read each Samurai field from, drilling into pipeline values where needed.
   Those fields power the ROI analytics, and every other field flows in for use in widgets.
   Changes apply immediately; an unmapped field is honest ("awaiting"), never a guessed number. */

function ago(ts?: number): string {
  if (!ts) return 'never'
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  return `${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? '' : 's'} ago`
}

export function CrmSync() {
  const { tenant, updateTenant } = useTenant()
  const toast = useToast()
  const lex = lexiconOf(tenant)
  const cfg = crmConfigOf(tenant)
  const provider = providerOf(cfg.provider)

  const save = (next: CrmConfig) => updateTenant(tenant.id, { crm: { ...next, status: statusFor(next) } })
  const connect = (providerId: string) => {
    const fields = providerOf(providerId)?.fields ?? []
    const mappings: CrmConfig['mappings'] = {}
    for (const f of CANONICAL_FIELDS) { const m = autoMatch(f.id, fields); if (m) mappings[f.id] = m }
    save({ provider: providerId, status: 'synced', lastSynced: Date.now(), mappings })
    toast(`Connected to ${providerOf(providerId)?.name}. We’ve suggested matches — review them below.`)
  }

  if (!provider) return <ConnectView onConnect={connect} />

  const prog = mappingProgress(cfg)
  const setField = (id: CanonicalId, fieldId?: string) => {
    if (!fieldId) { const m = { ...cfg.mappings }; delete m[id]; save({ ...cfg, mappings: m }); return }
    const field = fieldOf(provider.id, fieldId)
    const values = field?.options ? suggestValues(id, field) : undefined
    save({ ...cfg, mappings: { ...cfg.mappings, [id]: { field: fieldId, values } } })
  }
  const toggleValue = (id: CanonicalId, value: string) => {
    const m = cfg.mappings[id]; if (!m) return
    const set = new Set(m.values ?? [])
    if (set.has(value)) set.delete(value); else set.add(value)
    save({ ...cfg, mappings: { ...cfg.mappings, [id]: { ...m, values: [...set] } } })
  }

  return (
    <>
      {/* direction: Samurai reads FROM the CRM */}
      <div className="mb-4 flex items-start gap-2.5 rounded-[11px] border border-navy/15 bg-navy-tint/50 px-3.5 py-2.5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
        <p className="text-[12.5px] leading-relaxed text-fg-muted"><b className="text-fg">Samurai reads from {provider.name} — read-only.</b> We pull your deal and revenue data in to power the analytics. Nothing is ever written back to your CRM.</p>
      </div>

      {/* connection status */}
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-navy text-[12px] font-bold text-white">{provider.initials}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><b className="text-[14px] text-fg">{provider.name}</b>{cfg.status === 'synced' ? <Badge tone="pos">Synced</Badge> : <Badge tone="warn">Finish mapping</Badge>}</div>
            <div className="text-[12.5px] text-fg-subtle">{cfg.status === 'synced' ? <>Reading {provider.fields.length} fields · last synced {ago(cfg.lastSynced)}</> : <>{prog.requiredLeft} required field{prog.requiredLeft === 1 ? '' : 's'} left to map before data flows in</>}</div>
          </div>
          <button onClick={() => { save({ ...cfg, lastSynced: Date.now() }); toast(`Re-reading from ${provider.name}…`) }} className="inline-flex items-center gap-1.5 rounded-[9px] border border-line px-2.5 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-sunken hover:text-fg"><RefreshCw className="h-3.5 w-3.5" /> Re-sync</button>
          <button onClick={() => { updateTenant(tenant.id, { crm: emptyCrmConfig() }); toast(`Disconnected ${provider.name}.`) }} className="rounded-[9px] px-2.5 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-neg-tint hover:text-neg">Disconnect</button>
        </div>
      </Card>

      {/* field mapping — each Samurai field is read from a CRM field (CRM → Samurai) */}
      <div className="mb-2 flex items-end justify-between">
        <SectionHead title="Map your fields" hint="tell Samurai which CRM field to read each one from" />
        <span className="pb-2 text-[12px] font-medium">{prog.requiredLeft > 0 ? <span className="text-warn">Required left: {prog.requiredLeft}</span> : <span className="text-pos">All required fields mapped</span>}</span>
      </div>
      <Card className="mb-3 overflow-hidden">
        <div className="grid grid-cols-1 items-center gap-3 border-b border-line bg-sunken/50 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-fg-subtle sm:grid-cols-[1fr_auto_1.3fr]">
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-navy" /> Samurai field</div>
          <div className="hidden text-center text-[9.5px] normal-case text-fg-subtle sm:block">read from</div>
          <div className="flex items-center gap-1.5"><span className="grid h-4 w-4 place-items-center rounded bg-fg-muted text-[8px] font-bold text-white">{provider.initials.slice(0, 2)}</span> Your {provider.name} field</div>
        </div>
        {CANONICAL_FIELDS.map((f) => {
          const m = cfg.mappings[f.id]
          const field = fieldOf(provider.id, m?.field)
          const stage = !!field?.options?.length
          const suggested = autoMatch(f.id, provider.fields)
          return (
            <div key={f.id} className="grid grid-cols-1 items-start gap-x-3 gap-y-2 border-b border-line px-4 py-3.5 last:border-0 sm:grid-cols-[1fr_auto_1.3fr]">
              {/* Samurai side (destination) */}
              <div className="rounded-[9px] border border-navy/20 bg-navy-tint/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <b className="text-[13px] text-fg">{f.label(lex)}</b>
                  {f.required ? <span className="rounded bg-navy/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-navy">Required</span> : <span className="rounded bg-sunken px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-fg-subtle">Optional</span>}
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-fg-subtle">{f.hint}</p>
              </div>
              {/* flows CRM → Samurai, i.e. into the left */}
              <div className="hidden items-center self-center pt-1 sm:flex"><ArrowLeft className="h-4 w-4 text-navy/50" /></div>
              {/* CRM side (source) */}
              <div>
                <div className="flex items-center gap-2">
                  <FieldSelect value={m?.field} fields={provider.fields} placeholder="Not mapped" onChange={(v) => setField(f.id, v)} />
                  {m?.field
                    ? <Check className="h-4 w-4 shrink-0 text-pos" />
                    : suggested
                      ? <button onClick={() => setField(f.id, suggested.field)} className="inline-flex shrink-0 items-center gap-1 rounded-[7px] border border-navy/30 bg-navy-tint/40 px-1.5 py-1 text-[11px] font-medium text-navy transition-colors hover:bg-navy-tint"><Sparkles className="h-3 w-3" /> Suggest</button>
                      : null}
                </div>
                {stage && (
                  <div className="mt-2 rounded-[9px] border border-line bg-sunken/50 p-2">
                    <div className="mb-1.5 text-[10.5px] font-medium text-fg-muted">Count it when <b className="text-fg">{field!.label}</b> is one of:</div>
                    <div className="flex flex-wrap gap-1">
                      {field!.options!.map((o) => {
                        const on = m?.values?.includes(o)
                        return (
                          <button key={o} onClick={() => toggleValue(f.id, o)} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors', on ? 'border-navy/40 bg-navy text-white' : 'border-line bg-panel text-fg-muted hover:border-navy/30 hover:text-navy')}>
                            {o}{on && <Check className="h-2.5 w-2.5" />}
                          </button>
                        )
                      })}
                    </div>
                    {m && (m.values?.length ?? 0) === 0 && <p className="mt-1.5 text-[10.5px] text-warn">Pick at least one value, or this stays empty.</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </Card>
      <p className="mb-5 text-[12px] leading-relaxed text-fg-subtle">Every other field flows in too — search for any of them when you build a widget or funnel. Samurai keeps adding fields it can read as the product grows.</p>

      {/* what the mapped data powers */}
      <SectionHead title="What this powers in Samurai" hint="where each field is used" />
      <Card className="mb-5">
        {CANONICAL_FIELDS.map((f) => {
          const mapped = !!cfg.mappings[f.id]?.field
          return (
            <div key={f.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
              <span className="w-[108px] shrink-0 text-[13px] font-semibold text-fg">{f.label(lex)}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
              <span className="min-w-0 flex-1 text-[12.5px] text-fg-muted">{canonicalUsage(f.id, tenant)}</span>
              <Badge tone={mapped ? 'pos' : f.required ? 'warn' : 'neutral'}>{mapped ? 'Live' : f.required ? 'Awaiting' : 'Not set'}</Badge>
            </div>
          )
        })}
        <p className="px-4 py-2.5 text-[11.5px] leading-relaxed text-fg-subtle">Leave a required field unmapped and the numbers that depend on it wait for sync rather than guess — a broken cost-per-lead is worse than an honest blank.</p>
      </Card>
    </>
  )
}

/* ---- connect step ---- */
function ConnectView({ onConnect }: { onConnect: (id: string) => void }) {
  return (
    <>
      <Card className="mb-5 p-5">
        <b className="text-[14px] text-fg">Connect your CRM</b>
        <p className="mt-1 text-[12.5px] leading-relaxed text-fg-subtle">Samurai follows every lead from the click through to the deal your CRM closes. Connect the CRM where your team records leads, deals and revenue — Samurai reads from it (read-only), every field flows in, and you tell us which fields to read in the next step.</p>
      </Card>
      <SectionHead title="Choose your CRM" hint="pick where your deals and revenue live" />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {CRM_PROVIDERS.map((p) => (
          <button key={p.id} onClick={() => onConnect(p.id)} className="flex items-center gap-3 rounded-[12px] border border-line bg-panel p-3.5 text-left transition-colors hover:border-navy/30 hover:bg-navy-tint/20">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-sunken text-[12px] font-bold text-fg-muted">{p.initials}</span>
            <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-fg">{p.name}</span><span className="block text-[12px] text-fg-subtle">{p.blurb}</span></span>
            <span className="shrink-0 text-[12px] font-medium text-navy">Connect</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-fg-subtle">Don’t see your CRM? Choose <b className="text-fg">Other / CSV upload</b> to map a spreadsheet export — you can switch to a live connection any time.</p>
    </>
  )
}

/* ---- a styled select over the connected CRM's fields ---- */
function FieldSelect({ value, fields, placeholder, onChange }: { value?: string; fields: { id: string; label: string }[]; placeholder: string; onChange: (v: string | undefined) => void }) {
  return (
    <select
      value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}
      className={cn('h-9 w-full min-w-0 rounded-[9px] border bg-panel px-2.5 text-[12.5px] outline-none transition-colors focus:border-navy/40', value ? 'border-line text-fg' : 'border-dashed border-line-strong text-fg-subtle')}
    >
      <option value="">— {placeholder} —</option>
      {fields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
    </select>
  )
}
