import { Bell, Boxes, Copy, FlaskConical, Layers, Pencil, Plus, Rocket } from 'lucide-react'
import { useExp } from '../ExperimentsProvider'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { goalVariable, type ExperimentTemplate } from '@/data/templates'

/* Step 0 of the single creation flow: start from a proven template (pre-fills the builder, or launch in
   one click) or start from scratch. This replaces the old separate quick-A/B wizard. */
export function StepStart({ onUse, onBlank }: { onUse: (t: ExperimentTemplate) => void; onBlank: () => void }) {
  const { templates, launchFromTemplate, duplicateTemplate } = useExp()
  return (
    <div className="mx-auto max-w-[980px] px-6 py-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-tint text-brand"><Rocket className="h-[18px] w-[18px]" /></span>
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-fg">New experiment</h1>
          <p className="mt-0.5 max-w-[74ch] text-[13px] leading-relaxed text-fg-subtle">Start from a proven template, or build from scratch. Either way you’ll pick the pages to compare (A–E), choose what wins, and launch — or save it as a reusable template.</p>
        </div>
      </div>

      {/* start from scratch */}
      <button onClick={onBlank} className="mb-6 flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-panel p-4 text-left shadow-sm transition-colors hover:border-navy/40 hover:bg-navy-tint/20">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-navy-tint text-navy"><Plus className="h-5 w-5" /></span>
        <div className="flex-1">
          <b className="text-[14px] text-fg">Start from scratch</b>
          <div className="text-[12.5px] text-fg-subtle">Pick the pages to compare and set up your own variables.</div>
        </div>
        <span className="text-[13px] text-fg-subtle">▸</span>
      </button>

      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Or start from a proven template</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <TemplateCard key={t.id} t={t} onUse={() => onUse(t)} onLaunch={() => launchFromTemplate(t)} onDup={() => duplicateTemplate(t)} />
        ))}
      </div>
    </div>
  )
}

function TemplateCard({ t, onUse, onLaunch, onDup }: { t: ExperimentTemplate; onUse: () => void; onLaunch: () => void; onDup: () => void }) {
  const named = t.variables.filter((v) => v.name.trim())
  const goal = goalVariable(named)?.name ?? 'No goal'
  const alerts = t.guardrails.filter((g) => g.on).length
  return (
    <div className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-line bg-panel p-4 shadow-sm transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-navy-tint"><FlaskConical className="h-4 w-4 text-navy" /></span>
        {t.usedBy > 0
          ? <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[10.5px] font-medium text-fg-muted">Used by {t.usedBy}</span>
          : <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[10.5px] font-medium text-fg-subtle">Not used yet</span>}
      </div>
      <div>
        <b className={cn('block text-[14.5px] font-semibold', t.name ? 'text-fg' : 'text-fg-subtle')}>{t.name || 'Untitled template'}</b>
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-fg-subtle">{t.description || t.change || 'No description yet.'}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip icon={<span className="rounded bg-brand px-1 py-0.5 text-[8px] font-bold uppercase text-white">Goal</span>}>{goal}</Chip>
        <Chip icon={<Layers className="h-3 w-3" />}>{t.variants.length} variant{t.variants.length !== 1 ? 's' : ''}</Chip>
        <Chip icon={<Boxes className="h-3 w-3" />}>{named.length} variable{named.length !== 1 ? 's' : ''}</Chip>
        <Chip icon={<Bell className="h-3 w-3" />}>{alerts} · {t.notify}</Chip>
      </div>
      <div className="mt-1 flex items-center gap-2 border-t border-line pt-3">
        <Button variant="primary" size="sm" onClick={onUse}><Pencil className="h-3.5 w-3.5" /> Use template</Button>
        <Button variant="navy" size="sm" onClick={onLaunch}><Rocket className="h-3.5 w-3.5" /> Launch now</Button>
        <button onClick={onDup} className="ml-auto grid h-8 w-8 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-sunken hover:text-fg" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}

function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-md border border-line bg-sunken px-2 py-0.5 text-[11px] font-medium text-fg-muted">{icon}{children}</span>
}
