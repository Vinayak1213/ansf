import { Bell, CheckCircle2, Layers, Pencil, Plus, Rocket, Save, ShieldCheck, Target, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PAGES } from '@/data/samurai'
import { estDecision } from '@/data/experiments'
import { EL_MULT, GUARDRAILS, elLabel, goalVariable, guardrailDef } from '@/data/templates'
import { PageCanvas } from '../PageCanvas'
import type { StepProps } from './TemplateBuilder'

const SUGGEST_PRESETS = ['MBA', 'MCA', 'BBA', 'B.Com', 'B.Sc', 'any programme']

export function StepReview({ t, update, goTo, onSave, onLaunch }: StepProps & { onSave: () => void; onLaunch: () => void }) {
  const variants = [...t.variants].sort((a, b) => a.letter.localeCompare(b.letter))
  const named = t.variables.filter((v) => v.name.trim())
  const goalVar = goalVariable(named)
  const signals = named.filter((v) => !v.isGoal)
  // estimate off the control variant's own page, not an arbitrary one
  const repPage = PAGES.find((p) => p.id === variants[0]?.pageId) ?? PAGES.find((p) => p.leads > 0)!
  const goalEl = variants[0] ? t.placement[variants[0].pageId]?.[goalVar?.id ?? ''] : undefined
  const est = estDecision(repPage, goalEl ? EL_MULT[goalEl] ?? 1 : 1)
  const alerts = t.guardrails.filter((g) => g.on)
  const [tag, setTag] = useState('')
  const [pv, setPv] = useState(variants[0]?.pageId ?? '')
  const pvVariant = variants.find((v) => v.pageId === pv) ?? variants[0]
  const pageName = (id: string) => PAGES.find((p) => p.id === id)?.name ?? id
  const buttonFor = (pageId: string, varId: string) => { const el = t.placement[pageId]?.[varId]; return el ? elLabel(el) : '' }

  const addTag = (v: string) => { const s = v.trim(); if (s && !t.suggestedFor.includes(s)) update((d) => { d.suggestedFor.push(s) }); setTag('') }
  const removeTag = (v: string) => update((d) => { d.suggestedFor = d.suggestedFor.filter((x) => x !== v) })

  return (
    <div className="mx-auto max-w-[980px] px-6 py-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-pos-tint text-pos"><CheckCircle2 className="h-[18px] w-[18px]" /></span>
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-fg">Review &amp; launch</h1>
          <p className="mt-0.5 max-w-[72ch] text-[13px] leading-relaxed text-fg-subtle">Here’s your multi-variant test. Tweak anything, then launch it — or save it as a reusable template.</p>
        </div>
      </div>

      {/* name + where it fits */}
      <div className="mb-4 rounded-[var(--radius-lg)] border border-line bg-panel p-4 shadow-sm">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Template name</label>
        <input value={t.name} onChange={(e) => update((d) => { d.name = e.target.value })} placeholder="e.g. Fold + fee nudge" className="input text-[14px] font-semibold" />
        <div className="mt-3">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Works well for <span className="font-normal normal-case text-fg-subtle">(a hint only)</span></label>
          <div className="flex flex-wrap items-center gap-1.5">
            {t.suggestedFor.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full border border-line bg-sunken px-2 py-1 text-[12px] text-fg">{s}<button onClick={() => removeTag(s)} className="text-fg-subtle hover:text-neg"><X className="h-3 w-3" /></button></span>
            ))}
            <input value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tag) } }} placeholder="add a programme…" className="h-7 w-[130px] rounded-full border border-dashed border-line-strong bg-transparent px-2.5 text-[12px] text-fg outline-none focus:border-navy" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGEST_PRESETS.filter((p) => !t.suggestedFor.includes(p)).map((p) => (
              <button key={p} onClick={() => addTag(p)} className="inline-flex items-center gap-0.5 rounded-full border border-line px-2 py-0.5 text-[11px] text-fg-subtle transition-colors hover:border-navy/40 hover:text-navy"><Plus className="h-2.5 w-2.5" />{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* variants & variables */}
      <div className="mb-4 rounded-[var(--radius-lg)] border border-line bg-panel p-4 shadow-sm">
        <div className="mb-2.5 flex items-center gap-2">
          <Layers className="h-4 w-4 text-navy" />
          <b className="flex-1 text-[12.5px] font-semibold text-fg">{variants.length} variants · {named.length} variable{named.length !== 1 ? 's' : ''}</b>
          <button onClick={() => goTo(1)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-navy transition-colors hover:bg-navy-tint"><Pencil className="h-3 w-3" /> Edit</button>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {variants.map((v) => <span key={v.pageId} className="inline-flex items-center gap-1 rounded-md border border-line bg-sunken px-2 py-0.5 text-[11.5px] text-fg"><b className="text-navy">{v.letter}</b> {pageName(v.pageId)}</span>)}
        </div>
        <div className="space-y-2">
          {named.map((v) => (
            <div key={v.id} className="rounded-[9px] border border-line px-2.5 py-2">
              <div className="mb-1 flex items-center gap-1.5">
                <b className="text-[12.5px] text-fg">{v.name}</b>
                {v.isGoal ? <span className="rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Goal</span> : <span className="rounded bg-sunken px-1.5 py-0.5 text-[9px] font-bold uppercase text-fg-subtle">Signal</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {variants.map((vr) => { const b = buttonFor(vr.pageId, v.id); return (
                  <span key={vr.pageId} className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px]', b ? 'border-line bg-panel text-fg-muted' : 'border-dashed border-line text-fg-subtle')}><b className="text-fg">{vr.letter}</b> {b || 'not placed'}</span>
                ) })}
              </div>
            </div>
          ))}
          {named.length === 0 && <div className="text-[12.5px] text-neg">No variables yet</div>}
        </div>
        <div className="mt-2.5 border-t border-line pt-2 text-[11.5px] text-fg-muted">Goal: <b className="text-fg">{goalVar?.name ?? '—'}</b> · decides in about <b className="text-navy">~{est.human}</b> at a typical page’s volume.</div>
      </div>

      {/* preview — where variables sit on each version (each page is different) */}
      {variants.length > 0 && pvVariant && (
        <div className="mb-4 rounded-[var(--radius-lg)] border border-line bg-panel p-4 shadow-sm">
          <div className="mb-2.5 flex items-center gap-2">
            <Target className="h-4 w-4 text-brand" />
            <b className="flex-1 text-[12.5px] font-semibold text-fg">Preview — where your variables sit on each version</b>
            <button onClick={() => goTo(1)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-navy transition-colors hover:bg-navy-tint"><Pencil className="h-3 w-3" /> Edit</button>
          </div>
          <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {variants.map((v) => (
              <button key={v.pageId} onClick={() => setPv(v.pageId)} className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors', pvVariant.pageId === v.pageId ? 'border-navy bg-navy-tint text-navy' : 'border-line text-fg-muted hover:border-line-strong')}>
                <b>Version {v.letter}</b><span className="hidden text-fg-subtle sm:inline">· {pageName(v.pageId)}</span>
              </button>
            ))}
          </div>
          <PageCanvas readOnly variables={t.variables} placement={t.placement[pvVariant.pageId] ?? {}} page={PAGES.find((p) => p.id === pvVariant.pageId)} caption={`pages.onlinejain.com${PAGES.find((p) => p.id === pvVariant.pageId)?.path ?? ''} · Version ${pvVariant.letter}`} />
        </div>
      )}

      {/* monitoring + change */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SummaryCard icon={<ShieldCheck className="h-4 w-4 text-navy" />} title={`Monitoring · ${alerts.length} alert${alerts.length !== 1 ? 's' : ''}`} onEdit={() => goTo(3)}>
          {alerts.length ? (
            <div className="space-y-1">
              {alerts.map((g) => { const d = guardrailDef(g.k) ?? GUARDRAILS.find((x) => x.k === g.k)!; return <div key={g.k} className="flex items-center justify-between text-[12px] text-fg"><span>{d.name}</span><b className="text-fg-muted">{g.threshold}{d.unit === '%' ? '%' : 'h'}</b></div> })}
            </div>
          ) : <div className="text-[12px] text-fg-subtle">No guardrails on — Samurai still tracks results.</div>}
          <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2 text-[11.5px] text-fg-muted"><Bell className="h-3.5 w-3.5 text-navy" /> After {t.minVisitors}/variant · via {t.notify}</div>
        </SummaryCard>

        <SummaryCard icon={<Pencil className="h-4 w-4 text-fg-muted" />} title="The change" onEdit={() => goTo(1)}>
          <p className="text-[12.5px] leading-relaxed text-fg">{t.change || <span className="text-fg-subtle">No description yet.</span>}</p>
        </SummaryCard>
      </div>

      {/* final actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-navy/15 bg-navy-tint/40 px-4 py-3.5">
        <div className="text-[12.5px] text-fg-muted">Ready when you are — launch the test now, or save it as a template to reuse.</div>
        <div className="flex items-center gap-2">
          <button onClick={onSave} className="inline-flex items-center gap-1.5 rounded-[9px] border border-line bg-panel px-3 py-2 text-[13px] font-medium text-fg transition-colors hover:border-line-strong"><Save className="h-3.5 w-3.5" /> Save template</button>
          <button onClick={onLaunch} className="inline-flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"><Rocket className="h-4 w-4" /> Launch a test</button>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ icon, title, onEdit, children }: { icon: React.ReactNode; title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-panel p-4 shadow-sm">
      <div className="mb-2.5 flex items-center gap-2">
        {icon}
        <b className="flex-1 text-[12.5px] font-semibold text-fg">{title}</b>
        <button onClick={onEdit} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-navy transition-colors hover:bg-navy-tint"><Pencil className="h-3 w-3" /> Edit</button>
      </div>
      {children}
    </div>
  )
}
