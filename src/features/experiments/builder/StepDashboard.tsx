import { motion } from 'motion/react'
import { LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PAGES } from '@/data/samurai'
import { elLabel } from '@/data/templates'
import type { StepProps } from './TemplateBuilder'

const VCOLOR = ['bg-navy', 'bg-brand', 'bg-pos', 'bg-warn', 'bg-fg/60']

/* deterministic illustrative count so the preview is stable (real numbers come from the running test) */
function sampleCount(varId: string, letter: string, isGoal: boolean) {
  let h = 0; const s = varId + letter
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return isGoal ? 12 + (h % 18) : 40 + (h % 50)
}

export function StepDashboard({ t }: StepProps) {
  const variants = [...t.variants].sort((a, b) => a.letter.localeCompare(b.letter))
  const named = t.variables.filter((v) => v.name.trim())
  const pageName = (id: string) => PAGES.find((p) => p.id === id)?.name ?? id
  const ready = variants.length >= 2 && named.length >= 1

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-navy-tint text-navy"><LayoutDashboard className="h-[18px] w-[18px]" /></span>
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-fg">Your dashboard — A vs B vs C</h1>
          <p className="mt-0.5 max-w-[80ch] text-[13px] leading-relaxed text-fg-subtle">Every variable you defined becomes one comparison across your variants. Each one shows the button it maps to on that version, so different pages compare like-for-like. The <b className="text-fg">goal</b> decides the winner; the rest are tracked alongside.</p>
        </div>
      </div>

      {!ready ? (
        <div className="grid min-h-[280px] place-items-center rounded-[var(--radius-lg)] border-2 border-dashed border-line-strong bg-sunken/30 text-center">
          <div className="text-fg-subtle">
            <LayoutDashboard className="mx-auto mb-2 h-7 w-7 opacity-60" />
            <b className="text-[13.5px] text-fg-muted">Add variants and variables first</b>
            <p className="mt-0.5 text-[12px]">Pick two or more pages and name at least one variable on the previous step.</p>
          </div>
        </div>
      ) : (
        <>
          {/* variant legend */}
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-[10px] border border-line bg-panel px-3.5 py-2.5">
            <span className="text-[11.5px] font-medium text-fg-muted">Variants:</span>
            {variants.map((v, i) => (
              <span key={v.pageId} className="inline-flex items-center gap-1.5 text-[12px] text-fg"><i className={cn('h-2.5 w-2.5 rounded-full', VCOLOR[i % VCOLOR.length])} /><b>Version {v.letter}</b><span className="text-fg-subtle">· {pageName(v.pageId)}</span></span>
            ))}
          </div>

          <div className="space-y-3">
            {named.map((v) => {
              const rows = variants.map((vr, i) => ({ vr, i, count: sampleCount(v.id, vr.letter, !!v.isGoal), el: t.placement[vr.pageId]?.[v.id] }))
              const max = Math.max(...rows.map((r) => r.count), 1)
              const best = Math.max(...rows.map((r) => r.count))
              return (
                <div key={v.id} className="rounded-[var(--radius-lg)] border border-line bg-panel p-4 shadow-sm">
                  <div className="mb-2.5 flex items-center gap-2">
                    <b className="text-[13.5px] text-fg">{v.name}</b>
                    {v.isGoal ? <span className="rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Goal</span> : <span className="rounded bg-sunken px-1.5 py-0.5 text-[9px] font-bold uppercase text-fg-subtle">Signal</span>}
                  </div>
                  <div className="space-y-1.5">
                    {rows.map(({ vr, i, count, el }) => (
                      <div key={vr.pageId} className="flex items-center gap-2 text-[12px]">
                        <span className="flex w-20 shrink-0 items-center gap-1.5"><i className={cn('h-2 w-2 shrink-0 rounded-full', VCOLOR[i % VCOLOR.length])} /><b className="text-fg">Version {vr.letter}</b></span>
                        <span className="w-32 shrink-0 truncate text-fg-muted" title={el ? elLabel(el) : undefined}>{el ? elLabel(el) : <span className="text-fg-subtle">not placed</span>}</span>
                        <div className="h-3.5 flex-1 overflow-hidden rounded bg-sunken"><motion.i className={cn('block h-full rounded', VCOLOR[i % VCOLOR.length], count === best ? '' : 'opacity-70')} initial={{ width: 0 }} animate={{ width: `${(count / max) * 100}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} /></div>
                        <b className="tnum w-8 shrink-0 text-right text-fg">{count}</b>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] text-fg-subtle">Illustrative — your real counts appear once the test is live and splitting traffic across the versions.</p>
        </>
      )}
    </div>
  )
}
