import { useMemo, useState } from 'react'
import { Check, Database, MousePointerClick, Plus, Search, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StepSource } from '@/data/funnels'

/* A searchable, source-grouped field picker — the one data-selection surface shared by every
   widget type, so building a funnel, a trend or a single metric all feel the same. In 'select'
   mode it picks one field (charts); in 'add' mode it adds fields that aren't already in use (funnel
   stages). `footer` hosts the type-specific "add a custom field" affordance. */

export interface PickField { id: string; label: string; group: string; source: StepSource; money?: boolean; pct?: boolean; ratio?: boolean }

const SRC_ICON: Record<StepSource, typeof Wallet> = { ad: Wallet, tag: MousePointerClick, crm: Database, finance: Database }

export function DataPicker({ fields, variant, selectedId, usedIds, onSelect, searchPlaceholder = 'Search your data…', footer, addHint }: {
  fields: PickField[]
  variant: 'add' | 'select'
  selectedId?: string
  usedIds?: Set<string>
  onSelect: (f: PickField) => void
  searchPlaceholder?: string
  footer?: React.ReactNode
  addHint?: string // extra line in the no-match state, only when an add affordance actually exists below
}) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const groups = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, PickField[]>()
    for (const f of fields) {
      if (variant === 'add' && usedIds?.has(f.id)) continue
      if (query && !f.label.toLowerCase().includes(query) && !f.group.toLowerCase().includes(query)) continue
      if (!map.has(f.group)) { map.set(f.group, []); order.push(f.group) }
      map.get(f.group)!.push(f)
    }
    return order.map((g) => ({ group: g, items: map.get(g)! }))
  }, [fields, variant, usedIds, query])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder}
          className="w-full rounded-[9px] border border-line bg-sunken py-2 pl-8 pr-3 text-[12.5px] text-fg outline-none transition-colors focus:border-navy/40"
        />
      </div>
      <div className="mt-2 min-h-[150px] flex-1 space-y-3 overflow-y-auto pr-0.5 md:max-h-none">
        {groups.length === 0 ? (
          <div className="rounded-[9px] border border-dashed border-line-strong bg-surface/40 px-3 py-5 text-center text-[12px] text-fg-subtle">
            {variant === 'add' && !query ? 'Every field is already in your funnel.' : <>No field matches “{q}”.{addHint ? ` ${addHint}` : ''}</>}
          </div>
        ) : groups.map((g) => {
          const Icon = SRC_ICON[g.items[0].source]
          return (
            <div key={g.group}>
              <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-fg-subtle"><Icon className="h-3 w-3" />{g.group}</div>
              <div className="space-y-1">
                {g.items.map((f) => {
                  const on = variant === 'select' && selectedId === f.id
                  return (
                    <button key={f.id} onClick={() => onSelect(f)} className={cn('group flex w-full items-center gap-2.5 rounded-[9px] border px-3 py-2 text-left transition-colors', on ? 'border-navy/30 bg-navy-tint/40' : 'border-line bg-surface/40 hover:border-navy/30 hover:bg-navy-tint/20')}>
                      {variant === 'select'
                        ? <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border', on ? 'border-navy bg-navy text-white' : 'border-line-strong')}>{on && <Check className="h-3 w-3" />}</span>
                        : <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border border-line-strong text-fg-subtle transition-colors group-hover:border-navy group-hover:text-navy"><Plus className="h-3 w-3" /></span>}
                      <span className="flex-1 truncate text-[12.5px] font-medium text-fg">{f.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        {footer}
      </div>
    </div>
  )
}
