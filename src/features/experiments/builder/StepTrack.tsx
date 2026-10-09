import { useState } from 'react'
import { Boxes, Check, Layers, MousePointerClick, Plus, X } from 'lucide-react'
import { PageCanvas } from '../PageCanvas'
import { NetIcon } from '@/features/Pages'
import { cn, inr } from '@/lib/utils'
import { PAGES } from '@/data/samurai'
import { pageNet } from '@/data/pages'
import { LETTERS } from '@/data/templates'
import type { StepProps } from './TemplateBuilder'

export function StepTrack({ t, update, addVariant, removeVariant, setVariantLetter, addVariable, renameVariable, setGoalVariable, removeVariable, assign }: StepProps) {
  const variants = [...t.variants].sort((a, b) => a.letter.localeCompare(b.letter))
  const [active, setActive] = useState(variants[0]?.pageId ?? '')
  const activeVariant = variants.find((v) => v.pageId === active) ?? variants[0]
  const named = t.variables.filter((v) => v.name.trim())
  const placedCount = (pageId: string) => { const pm = t.placement[pageId] ?? {}; return named.filter((v) => pm[v.id]).length }
  const [q, setQ] = useState('')
  const eligible = PAGES.filter((p) => p.spend > 0)
  const shown = eligible.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
  const isPicked = (id: string) => t.variants.some((v) => v.pageId === id)
  const pageName = (id: string) => PAGES.find((p) => p.id === id)?.name ?? id

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-tint text-brand"><MousePointerClick className="h-[18px] w-[18px]" /></span>
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-fg">Your variants &amp; variables</h1>
          <p className="mt-0.5 max-w-[86ch] text-[13px] leading-relaxed text-fg-subtle">Pick the pages you want to compare, name the <b className="text-fg">variables</b> you’ll track (one is the <b className="text-fg">goal</b>), then place each variable on every variant’s page. A variable can sit on a <b className="text-fg">different button per page</b> — the dashboard compares them like-for-like, A vs B vs C.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[360px_1fr]">
        {/* left: variants + variables + change */}
        <div className="space-y-3">
          {/* variants */}
          <div className="rounded-[var(--radius-lg)] border border-line bg-panel p-4 shadow-sm">
            <div className="mb-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-fg"><Layers className="h-4 w-4 text-navy" /> Variants <span className="ml-auto rounded-full bg-sunken px-1.5 py-0.5 text-[10.5px] font-medium text-fg-subtle">{t.variants.length}/5</span></div>
            {variants.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {variants.map((v) => (
                  <div key={v.pageId} className="flex items-center gap-2 rounded-[9px] border border-line bg-sunken/40 px-2 py-1.5">
                    <select value={v.letter} onChange={(e) => setVariantLetter(v.pageId, e.target.value)} aria-label="Version letter" className="rounded-md border border-line bg-panel px-1.5 py-1 text-[12px] font-bold text-fg outline-none">
                      {LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <b className="min-w-0 flex-1 truncate text-[12.5px] text-fg">{pageName(v.pageId)}</b>
                    <button onClick={() => removeVariant(v.pageId)} title="Remove variant" className="shrink-0 text-fg-subtle transition-colors hover:text-neg"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
            {t.variants.length < 5 && (
              <div>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a page to compare…" className="input mb-1.5 text-[12.5px]" />
                <div className="max-h-[24vh] space-y-1 overflow-y-auto">
                  {shown.map((p) => {
                    const picked = isPicked(p.id)
                    return (
                      <button key={p.id} disabled={picked} onClick={() => addVariant(p.id)} className={cn('flex w-full items-center justify-between gap-2 rounded-[9px] border px-2.5 py-1.5 text-left transition-colors disabled:opacity-40', picked ? 'border-navy/30 bg-navy-tint/30' : 'border-line hover:border-line-strong')}>
                        <span className="flex min-w-0 items-center gap-2"><NetIcon net={pageNet(p.id)} /><span className="min-w-0"><b className="block truncate text-[12px] text-fg">{p.name}</b><span className="text-[10px] text-fg-subtle">{p.cpl ? inr(p.cpl) + '/lead' : 'Live'}</span></span></span>
                        {picked ? <Check className="h-3.5 w-3.5 shrink-0 text-navy" /> : <Plus className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* variables */}
          <div className="rounded-[var(--radius-lg)] border border-line bg-panel p-4 shadow-sm">
            <div className="mb-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-fg"><Boxes className="h-4 w-4 text-brand" /> Variables</div>
            <div className="space-y-1.5">
              {t.variables.map((v) => (
                <div key={v.id} className={cn('flex items-center gap-2 rounded-[9px] border px-2 py-1.5', v.isGoal ? 'border-brand/40 bg-brand-tint/15' : 'border-line')}>
                  <button onClick={() => setGoalVariable(v.id)} title={v.isGoal ? 'This is the goal' : 'Make this the goal'} className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border', v.isGoal ? 'border-brand bg-brand' : 'border-line-strong hover:border-brand')}>{v.isGoal && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</button>
                  <input value={v.name} onChange={(e) => renameVariable(v.id, e.target.value)} placeholder="Name a variable (e.g. Book a demo)" className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[12.5px] font-medium text-fg outline-none transition-colors placeholder:font-normal placeholder:text-fg-subtle hover:border-line focus:border-navy focus:bg-panel" />
                  <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', v.isGoal ? 'bg-brand text-white' : 'bg-sunken text-fg-subtle')}>{v.isGoal ? 'Goal' : 'Signal'}</span>
                  <button onClick={() => removeVariable(v.id)} disabled={v.isGoal} title={v.isGoal ? 'Make another the goal first' : 'Remove'} className={cn('shrink-0 text-fg-subtle transition-colors hover:text-neg', v.isGoal && 'cursor-not-allowed opacity-30')}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <button onClick={addVariable} className="mt-2 inline-flex items-center gap-1.5 rounded-[8px] border border-dashed border-line-strong px-2.5 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:border-navy/40 hover:text-navy"><Plus className="h-3.5 w-3.5" /> Add variable</button>
          </div>

          {/* what's changing */}
          <div className="rounded-[var(--radius-lg)] border border-line bg-panel p-4 shadow-sm">
            <label className="mb-1.5 block text-[12px] font-semibold text-fg">What are you changing? <span className="font-normal text-fg-subtle">(optional)</span></label>
            <textarea value={t.change} onChange={(e) => update((d) => { d.change = e.target.value })} rows={2} placeholder="e.g. Move the form above the fold and add a fee/scholarship nudge" className="input h-auto py-2 text-[12.5px]" />
          </div>
        </div>

        {/* right: per-variant placement */}
        <div className="space-y-3">
          {variants.length === 0 ? (
            <div className="grid min-h-[320px] place-items-center rounded-[var(--radius-lg)] border-2 border-dashed border-line-strong bg-sunken/30 px-6 text-center">
              <div className="text-fg-subtle">
                <Layers className="mx-auto mb-2 h-7 w-7 opacity-60" />
                <b className="text-[13.5px] text-fg-muted">Pick at least two variants</b>
                <p className="mt-0.5 text-[12px]">Add pages on the left, then place your variables on each one here.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {variants.map((v) => (
                  <button key={v.pageId} onClick={() => setActive(v.pageId)} className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors', activeVariant?.pageId === v.pageId ? 'border-navy bg-navy-tint text-navy' : 'border-line text-fg-muted hover:border-line-strong')}>
                    <b>Version {v.letter}</b><span className="hidden text-fg-subtle sm:inline">· {pageName(v.pageId)}</span>
                    <span className={cn('rounded-full px-1.5 text-[10px]', placedCount(v.pageId) === named.length && named.length > 0 ? 'bg-pos-tint text-pos' : 'bg-sunken text-fg-subtle')}>{placedCount(v.pageId)}/{named.length}</span>
                  </button>
                ))}
              </div>
              {activeVariant && (
                <>
                  <div className="text-[12px] leading-relaxed text-fg-subtle">Placing on <b className="text-fg">Version {activeVariant.letter}</b> — {pageName(activeVariant.pageId)}. Click a button, then pick which variable it is on this page.</div>
                  <PageCanvas
                    variables={t.variables}
                    placement={t.placement[activeVariant.pageId] ?? {}}
                    onAssign={(el, varId) => assign(activeVariant.pageId, el, varId)}
                    page={PAGES.find((p) => p.id === activeVariant.pageId)}
                    caption={`pages.onlinejain.com${PAGES.find((p) => p.id === activeVariant.pageId)?.path ?? ''} · Version ${activeVariant.letter}`}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
