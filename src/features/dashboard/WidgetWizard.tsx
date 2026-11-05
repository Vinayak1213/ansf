import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, ArrowRight, BarChart3, Check, ChevronDown, ChevronUp, Database, Hash, LineChart, MousePointerClick, PieChart, Wallet, Workflow, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn, inrCompact, num } from '@/lib/utils'
import { useRange } from '@/lib/range'
import { useTenant } from '@/lib/tenant'
import type { Page } from '@/data/samurai'
import {
  FUNNEL_CATALOG, FUNNEL_TEMPLATES, SOURCE_GROUP, SOURCE_LABEL,
  resolveFunnel, type FunnelDef, type StepRef, type StepSource,
} from '@/data/funnels'
import { BREAKDOWN_SOURCES, KPI_METRICS, TREND_METRICS, type Metric } from '@/data/metrics'
import { tenantCrmFields, type TenantCrmField } from '@/data/crm'
import type { WidgetCfg, WidgetKind } from '@/data/dashboard'
import { ChartView, chartTitleFor } from './ChartView'
import { FunnelView, connCtx } from './FunnelView'
import { DataPicker, type PickField } from './DataPicker'

type BuildKind = 'funnel' | 'trend' | 'bar' | 'donut' | 'kpi'
const TYPES: { kind: BuildKind; label: string; hint: string; icon: typeof LineChart }[] = [
  { kind: 'funnel', label: 'Funnel', hint: 'Stages from spend to a lead', icon: Workflow },
  { kind: 'trend', label: 'Trend', hint: 'A metric over time', icon: LineChart },
  { kind: 'bar', label: 'Bar chart', hint: 'Compare a metric across ads or devices', icon: BarChart3 },
  { kind: 'donut', label: 'Split', hint: 'Share of a total', icon: PieChart },
  { kind: 'kpi', label: 'Single metric', hint: 'One headline number', icon: Hash },
]
const SRC_ICON: Record<StepSource, typeof Wallet> = { ad: Wallet, tag: MousePointerClick, crm: Database, finance: Database }
const FUNNEL_FIELDS: PickField[] = FUNNEL_CATALOG.map((c) => ({ id: c.id, label: c.label, group: SOURCE_GROUP[c.source], source: c.source, money: c.money }))
// a Split shows a share of a total, which is only meaningful for additive quantities — keep rates out of it
const catalogFor = (k: BuildKind): Metric[] => (k === 'trend' ? TREND_METRICS : k === 'kpi' ? KPI_METRICS : k === 'bar' ? BREAKDOWN_SOURCES : k === 'donut' ? BREAKDOWN_SOURCES.filter((m) => !m.ratio) : [])
const defaultSize = (k: BuildKind): WidgetCfg['size'] => (k === 'funnel' || k === 'trend' ? 'full' : 'half')
const dataLabel = (k: BuildKind) => (k === 'kpi' ? 'Choose a metric' : k === 'bar' || k === 'donut' ? 'Choose what to compare' : 'Choose a metric to trend')

export function WidgetWizard({ p, mode, initial, onClose, onSave }: {
  p: Page; mode: 'new' | 'edit'; initial?: WidgetCfg
  onClose: () => void
  onSave: (cfg: { kind: WidgetKind; title: string; def?: FunnelDef; source?: string; customLabel?: string; customField?: string; size: WidgetCfg['size'] }) => void
}) {
  const { tenant } = useTenant()
  const { factor: f } = useRange()
  const ctx = useMemo(() => connCtx(p, tenant), [p, tenant])

  const initKind = (initial?.kind as BuildKind) ?? null
  const [step, setStep] = useState<1 | 2>(mode === 'edit' ? 2 : 1)
  const [kind, setKind] = useState<BuildKind | null>(initKind)
  const [source, setSource] = useState<string | undefined>(initial?.source)
  const [steps, setSteps] = useState<StepRef[]>(() => (initial?.def ? initial.def.steps.map((s) => ({ ...s })) : [{ id: 'spend' }, { id: 'clicks' }, { id: 'leads' }]))
  const [name, setName] = useState(initial?.title ?? '')
  const [customLabel, setCustomLabel] = useState(initial?.customLabel ?? '')
  const [customField, setCustomField] = useState(initial?.customField ?? '')
  // The CRM fields a client has brought in (configured in Settings → CRM sync) — usable as
  // custom widget data / funnel stages. Standard pipeline fields are already first-class metrics.
  const crmFields = useMemo(() => tenantCrmFields(tenant).filter((cf) => cf.custom), [tenant])

  const suggest = (k: BuildKind, src?: string) =>
    k === 'funnel' ? 'Untitled funnel' : src === 'custom' ? (customLabel.trim() || 'Custom field') : src ? chartTitleFor(k, src) : TYPES.find((t) => t.kind === k)!.label
  // A default-named widget keeps re-tracking its data; a name the user typed is preserved.
  const initAuto = initial ? (initial.kind === 'funnel' ? 'Untitled funnel' : initial.source === 'custom' ? (initial.customLabel ?? 'Custom field') : initial.source ? chartTitleFor(initial.kind, initial.source) : '') : ''
  const [nameEdited, setNameEdited] = useState(mode === 'edit' && !!initial && initial.title !== initAuto)

  const setName2 = (v: string) => { setName(v); setNameEdited(true) }
  const pickKind = (k: BuildKind) => {
    setKind(k)
    const src = k === 'funnel' ? undefined : catalogFor(k)[0]?.id
    setSource(src)
    if (!nameEdited) setName(suggest(k, src))
  }
  const pickSource = (id: string) => { setSource(id); if (!nameEdited && kind) setName(suggest(kind, id)) }
  const useCustomField = (fld: TenantCrmField) => { setSource('custom'); setCustomLabel(fld.label); setCustomField(fld.resolveKey); if (!nameEdited) setName(fld.label) }
  const clearCustom = () => { const first = kind ? catalogFor(kind)[0]?.id : undefined; setSource(first); if (!nameEdited && kind) setName(suggest(kind, first)) }

  // funnel-stage editing
  const addStep = (id: string) => setSteps((s) => [...s, { id }])
  const addCustomStage = (fld: TenantCrmField) => setSteps((s) => [...s, { id: `cf-${fld.id}-${Math.round(Math.random() * 1e6).toString(36)}`, label: fld.label, crmField: fld.resolveKey }])
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => setSteps((s) => { const j = i + dir; if (j < 0 || j >= s.length) return s; const n = [...s];[n[i], n[j]] = [n[j], n[i]]; return n })
  const loadTemplate = (t: FunnelDef) => { setSteps(t.steps.map((s) => ({ ...s }))); if (!nameEdited) setName(t.name) }
  const resolved = useMemo(() => (kind === 'funnel' ? resolveFunnel({ name, steps }, ctx) : []), [kind, name, steps, ctx])
  const usedIds = useMemo(() => new Set(steps.map((s) => s.id)), [steps])

  const isFunnel = kind === 'funnel'
  const allowCustomChart = kind === 'kpi' || kind === 'trend'
  const canCreate = isFunnel ? steps.length >= 2 : !!source
  const create = () => kind && onSave({
    kind,
    title: name.trim() || suggest(kind, source),
    def: isFunnel ? { name: name.trim() || 'Funnel', steps } : undefined,
    source: isFunnel ? undefined : source,
    customLabel: source === 'custom' ? (customLabel.trim() || 'Custom field') : undefined,
    customField: source === 'custom' ? customField : undefined,
    size: defaultSize(kind),
  })

  const preview = isFunnel
    ? <FunnelView p={p} def={{ name, steps }} />
    : kind ? <ChartView p={p} kind={kind} source={source} customField={source === 'custom' ? customField : undefined} customLabel={source === 'custom' ? customLabel : undefined} /> : null

  // Synced CRM fields become searchable rows ("Your CRM fields") right inside the picker.
  const crmPickFields: PickField[] = useMemo(() => crmFields.map((cf) => ({ id: cf.id, label: cf.label, group: 'Your CRM fields', source: 'crm', money: cf.money })), [crmFields])
  const onPickChart = (fld: PickField) => { if (fld.id.startsWith('crm::')) { const cf = crmFields.find((c) => c.id === fld.id); if (cf) useCustomField(cf) } else pickSource(fld.id) }
  const onPickFunnel = (fld: PickField) => { if (fld.id.startsWith('crm::')) { const cf = crmFields.find((c) => c.id === fld.id); if (cf) addCustomStage(cf) } else addStep(fld.id) }

  const noCrmHint = <p className="text-[11.5px] leading-relaxed text-fg-subtle"><b className="text-fg">Connect your CRM</b> in Settings → CRM sync to search and use your own fields here.</p>
  const chartFooter = !allowCustomChart ? undefined
    : source === 'custom'
      ? (
        <div className="rounded-[10px] border border-navy/30 bg-navy-tint/40 p-2.5">
          <div className="flex items-center gap-2"><Database className="h-3.5 w-3.5 shrink-0 text-navy" /><span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-fg">{customLabel.trim() || 'Custom field'}</span><Check className="h-4 w-4 shrink-0 text-navy" /></div>
          <div className="mt-0.5 text-[10.5px] text-fg-subtle">A field from your CRM</div>
          <button onClick={clearCustom} className="mt-1.5 text-[11px] font-medium text-fg-muted transition-colors hover:text-neg">Remove</button>
        </div>
      )
      : crmFields.length === 0 ? noCrmHint : undefined
  const funnelFooter = crmFields.length === 0 ? noCrmHint : undefined

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild><motion.div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} /></Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] h-[640px] w-[1040px] max-w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[16px] border border-line bg-panel shadow-pop focus:outline-none"
            initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
            <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
              <div className="flex-1">
                <Dialog.Title className="text-[15px] font-semibold text-fg">{mode === 'edit' ? 'Edit widget' : 'Add a widget'}</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-[12px] text-fg-subtle">{mode === 'edit' ? 'Change the data — the preview updates as you go.' : step === 1 ? 'Step 1 of 2 · Choose a visual' : 'Step 2 of 2 · Choose the data'}</Dialog.Description>
              </div>
              {mode === 'new' && <StepDots step={step} />}
              <Dialog.Close className="rounded-md p-1 text-fg-subtle transition-colors hover:bg-sunken hover:text-fg"><X className="h-4 w-4" /></Dialog.Close>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:overflow-hidden">
              {/* left — selection */}
              <div className="min-h-0 border-b border-line px-5 py-4 md:flex md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
                {step === 1 ? (
                  <div className="space-y-1.5 md:min-h-0 md:flex-1 md:overflow-y-auto">
                    {TYPES.map((t) => {
                      const on = kind === t.kind
                      return (
                        <button key={t.kind} onClick={() => pickKind(t.kind)} className={cn('flex w-full items-center gap-3 rounded-[11px] border px-3 py-2.5 text-left transition-colors', on ? 'border-navy/30 bg-navy-tint/40' : 'border-line bg-surface/40 hover:bg-sunken/50')}>
                          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-[10px]', on ? 'bg-navy text-white' : 'bg-sunken text-fg-muted')}><t.icon className="h-[18px] w-[18px]" /></span>
                          <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-fg">{t.label}</span><span className="block text-[11.5px] text-fg-subtle">{t.hint}</span></span>
                          {on && <Check className="h-4 w-4 shrink-0 text-navy" />}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-3 md:flex md:min-h-0 md:flex-1 md:flex-col md:space-y-0">
                    <div className="shrink-0">
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Widget name</label>
                      <input value={name} onChange={(e) => setName2(e.target.value)} className="w-full rounded-[9px] border border-line bg-sunken px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-navy/40" placeholder={kind ? suggest(kind, source) : 'Widget name'} />
                    </div>

                    {isFunnel ? (
                      <div className="space-y-3 md:mt-3 md:flex md:min-h-0 md:flex-1 md:flex-col md:space-y-0 md:gap-3">
                        <div className="shrink-0">
                          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Start from a template</div>
                          <div className="flex flex-wrap gap-1.5">{FUNNEL_TEMPLATES.map((t) => <button key={t.name} onClick={() => loadTemplate(t)} className="rounded-full border border-line bg-sunken px-2.5 py-1 text-[11.5px] font-medium text-fg-muted transition-colors hover:border-navy/30 hover:text-navy">{t.name}</button>)}</div>
                        </div>
                        <div className="shrink-0">
                          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Your stages · {steps.length}</div>
                          {steps.length === 0 ? <div className="rounded-[9px] border border-dashed border-line-strong bg-surface/40 px-3 py-4 text-center text-[12px] text-fg-subtle">Add stages from the fields below.</div> : (
                            <div className="space-y-1 md:max-h-[168px] md:overflow-y-auto">{steps.map((s, i) => { const r = resolved[i]; const Icon = SRC_ICON[r.source]; return (
                              <div key={s.id + i} className="flex items-center gap-2 rounded-[9px] border border-line bg-surface/40 px-2.5 py-1.5">
                                <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-sunken text-fg-subtle"><Icon className="h-3 w-3" /></span>
                                <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium text-fg">{r.label}</span><span className="block truncate text-[10.5px] text-fg-subtle">{SOURCE_LABEL[r.source]}</span></span>
                                <span className="shrink-0 text-[11.5px] tnum text-fg-muted">{r.status === 'ok' ? (r.money ? inrCompact((r.value ?? 0) * f) : num((r.value ?? 0) * f)) : r.status === 'disconnected' ? 'not connected' : 'awaiting'}</span>
                                <div className="flex shrink-0 items-center">
                                  <button onClick={() => move(i, -1)} disabled={i === 0} className="grid h-6 w-6 place-items-center rounded text-fg-subtle transition-colors hover:bg-sunken hover:text-fg disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="grid h-6 w-6 place-items-center rounded text-fg-subtle transition-colors hover:bg-sunken hover:text-fg disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => removeStep(i)} className="grid h-6 w-6 place-items-center rounded text-fg-subtle transition-colors hover:bg-neg-tint hover:text-neg"><X className="h-3.5 w-3.5" /></button>
                                </div>
                              </div>
                            ) })}</div>
                          )}
                        </div>
                        <div className="md:flex md:min-h-0 md:flex-1 md:flex-col">
                          <div className="mb-1.5 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Add a stage</div>
                          <DataPicker fields={[...FUNNEL_FIELDS, ...crmPickFields]} variant="add" usedIds={usedIds} onSelect={onPickFunnel} searchPlaceholder="Search stages & your CRM fields…" footer={funnelFooter} />
                        </div>
                      </div>
                    ) : kind ? (
                      <div className="md:mt-3 md:flex md:min-h-0 md:flex-1 md:flex-col">
                        <div className="mb-1.5 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{dataLabel(kind)}</div>
                        <DataPicker fields={allowCustomChart ? [...catalogFor(kind), ...crmPickFields] : catalogFor(kind)} variant="select" selectedId={source} onSelect={onPickChart} searchPlaceholder="Search your data…" footer={chartFooter} />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* right — preview */}
              <div className="min-h-0 bg-sunken/30 px-5 py-4 md:overflow-y-auto">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Preview · {p.name}</div>
                {kind ? (
                  <div className="rounded-[12px] border border-line bg-panel p-4">
                    <div className="mb-2 truncate text-[13px] font-semibold text-fg">{name || suggest(kind, source)}</div>
                    {preview}
                  </div>
                ) : (
                  <div className="grid min-h-[180px] place-items-center rounded-[12px] border border-dashed border-line-strong bg-panel/60 px-4 text-center text-[12.5px] text-fg-subtle">Choose a visual on the left to preview it here.</div>
                )}
                <p className="mt-3 text-[11px] leading-relaxed text-fg-subtle">Every number reads from this page’s connected sources and reconciles to its totals — nothing estimated.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-line px-5 py-3">
              {step === 2 && mode === 'new' && <button onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-fg-muted transition-colors hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>}
              <div className="ml-auto flex items-center gap-2">
                <Button variant="subtle" size="sm" onClick={onClose}>Cancel</Button>
                {step === 1 && mode === 'new'
                  ? <Button variant="navy" size="sm" disabled={!kind} onClick={() => setStep(2)}>Next <ArrowRight className="h-4 w-4" /></Button>
                  : <Button variant="navy" size="sm" disabled={!canCreate} onClick={create}>{mode === 'new' ? 'Add widget' : 'Save changes'}</Button>}
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function StepDots({ step }: { step: 1 | 2 }) {
  return <div className="flex items-center gap-1.5">{[1, 2].map((s) => <span key={s} className={cn('h-1.5 rounded-full transition-all', s === step ? 'w-5 bg-navy' : 'w-1.5 bg-line-strong')} />)}</div>
}
