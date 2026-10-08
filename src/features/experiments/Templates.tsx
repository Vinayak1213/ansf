import { motion } from 'motion/react'
import { Bell, Boxes, Copy, FlaskConical, Layers, Pencil, Plus, Rocket } from 'lucide-react'
import { useNav } from '@/lib/nav'
import { useExp } from './ExperimentsProvider'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { goalVariable, type ExperimentTemplate } from '@/data/templates'

export function TemplatesLibrary() {
  const { go } = useNav()
  const { templates, launchFromTemplate, saveTemplate } = useExp()
  return (
    <div>
      <p className="mb-4 max-w-[72ch] text-[12.5px] leading-relaxed text-fg-subtle">
        A template is a multi-variant test setup — the variant pages, your custom variables (one goal + signals) placed on each, and the alerts. Launch it in a click, or build your own in the sandbox — no code, no setup each time.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <TemplateCard key={t.id} t={t} onLaunch={() => launchFromTemplate(t)} onEdit={() => go('sandbox', t.id)} onDup={() => saveTemplate({ ...structuredClone(t), id: 'draft', name: t.name + ' (copy)', usedBy: 0 })} />
        ))}
        <button onClick={() => go('sandbox', 'new')} className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-line-strong bg-panel/50 text-fg-subtle transition-colors hover:border-navy/40 hover:bg-navy-tint/30 hover:text-navy">
          <Plus className="h-6 w-6" /><b className="text-[13.5px]">New template</b><span className="text-[12px]">Build one from scratch in the sandbox</span>
        </button>
      </div>
    </div>
  )
}

function TemplateCard({ t, onLaunch, onEdit, onDup }: { t: ExperimentTemplate; onLaunch: () => void; onEdit: () => void; onDup: () => void }) {
  const named = t.variables.filter((v) => v.name.trim())
  const goal = goalVariable(named)?.name ?? 'No goal'
  const alerts = t.guardrails.filter((g) => g.on).length
  return (
    <motion.div whileHover={{ y: -2 }} className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-panel p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-navy-tint"><FlaskConical className="h-4 w-4 text-navy" /></span>
        {t.usedBy > 0 ? <span className="rounded-md bg-sunken px-2 py-0.5 text-[11px] font-medium text-fg-muted">Used by {t.usedBy} test{t.usedBy !== 1 ? 's' : ''}</span> : <span className="rounded-md bg-sunken px-2 py-0.5 text-[11px] font-medium text-fg-subtle">Not used yet</span>}
      </div>
      <div>
        <b className={cn('text-[15px] font-semibold', t.name ? 'text-fg' : 'text-fg-subtle')}>{t.name || 'Untitled template'}</b>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-subtle">{t.description || t.change || 'No description yet.'}</p>
      </div>
      <div className="text-[11.5px] text-fg-muted"><b className="text-fg">Tests:</b> {t.change || 'your variation'} · <b className="text-fg">works for</b> {t.suggestedFor.length ? t.suggestedFor.join(', ') : 'any page'}</div>
      <div className="flex flex-wrap gap-1.5">
        <Chip icon={<span className="rounded bg-brand px-1 py-0.5 text-[8px] font-bold uppercase text-white">Goal</span>}>{goal}</Chip>
        <Chip icon={<Layers className="h-3 w-3" />}>{t.variants.length} variant{t.variants.length !== 1 ? 's' : ''}</Chip>
        <Chip icon={<Boxes className="h-3 w-3" />}>{named.length} variable{named.length !== 1 ? 's' : ''}</Chip>
        <Chip icon={<Bell className="h-3 w-3" />}>{alerts} · {t.notify}</Chip>
      </div>
      <div className="mt-1 flex items-center gap-2 border-t border-line pt-3">
        <Button variant="navy" size="sm" onClick={onLaunch}><Rocket className="h-3.5 w-3.5" /> Launch a test</Button>
        <Button variant="default" size="sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
        <button onClick={onDup} className="ml-auto grid h-8 w-8 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-sunken hover:text-fg" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
      </div>
    </motion.div>
  )
}

function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-md border border-line bg-sunken px-2 py-0.5 text-[11px] font-medium text-fg-muted')}>{icon}{children}</span>
}
