import { useRef, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, ChevronUp, GripVertical, Maximize2, Minimize2, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import { PageCplChart } from '@/components/charts'
import { TicketRevenue } from '@/components/TicketRevenue'
import { cn, inr } from '@/lib/utils'
import { useRange } from '@/lib/range'
import { useTenant } from '@/lib/tenant'
import type { Page } from '@/data/samurai'
import { campaignBiz, campaignsForPage, pageBiz } from '@/data/business'
import { pageWeekly } from '@/data/pages'
import type { FunnelDef } from '@/data/funnels'
import { defaultDashboard, loadDashboard, newFunnelId, resetDashboard, saveDashboard, type WidgetCfg, type WidgetKind, type WidgetSize } from '@/data/dashboard'
import { FunnelView } from './FunnelView'
import { ChartView } from './ChartView'
import { WidgetWizard } from './WidgetWizard'

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
const EDITABLE: WidgetKind[] = ['funnel', 'trend', 'bar', 'donut', 'kpi']

export function PageDashboard({ p }: { p: Page }) {
  const { tenant } = useTenant()
  const [widgets, setWidgets] = useState<WidgetCfg[]>(() => loadDashboard(tenant.id, p.id))
  const [editing, setEditing] = useState<{ mode: 'new' | 'edit'; widget?: WidgetCfg } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const dragId = useRef<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const persist = (w: WidgetCfg[]) => { setWidgets(w); saveDashboard(tenant.id, p.id, w) }
  const patch = (id: string, p2: Partial<WidgetCfg>) => persist(widgets.map((w) => (w.id === id ? { ...w, ...p2 } : w)))
  const remove = (id: string) => persist(widgets.filter((w) => w.id !== id))
  const reset = () => { resetDashboard(tenant.id, p.id); setWidgets(defaultDashboard()) }

  const saveWidget = (cfg: { kind: WidgetKind; title: string; def?: FunnelDef; source?: string; customLabel?: string; customField?: string; size: WidgetSize }) => {
    if (editing?.mode === 'edit' && editing.widget) patch(editing.widget.id, { title: cfg.title, def: cfg.def, source: cfg.source, customLabel: cfg.customLabel, customField: cfg.customField })
    else persist([...widgets, { id: newFunnelId(), kind: cfg.kind, title: cfg.title, def: cfg.def, source: cfg.source, customLabel: cfg.customLabel, customField: cfg.customField, size: cfg.size }])
    setEditing(null)
  }

  const reorder = (from: string | null, to: string) => {
    if (!from || from === to) return
    const arr = [...widgets]
    const fi = arr.findIndex((w) => w.id === from); const ti = arr.findIndex((w) => w.id === to)
    if (fi < 0 || ti < 0) return
    const [moved] = arr.splice(fi, 1); arr.splice(ti, 0, moved); persist(arr)
  }
  const endDrag = () => { dragId.current = null; setDraggingId(null); setOverId(null) }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-fg-subtle">Dashboard</h2>
        <span className="text-[11.5px] text-fg-subtle">Drag a card to reorder · resize or collapse from its menu</span>
        <div className="ml-auto flex items-center gap-2">
          {confirmReset ? (
            <span className="flex items-center gap-2">
              <span className="text-[11.5px] text-fg-muted">Restore the default widgets?</span>
              <button onClick={() => { reset(); setConfirmReset(false) }} className="rounded-[9px] px-2.5 py-1.5 text-[12px] font-semibold text-neg transition-colors hover:bg-neg-tint">Reset</button>
              <button onClick={() => setConfirmReset(false)} className="rounded-[9px] px-2.5 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-sunken hover:text-fg">Cancel</button>
            </span>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-sunken hover:text-fg"><RotateCcw className="h-3.5 w-3.5" /> Reset layout</button>
          )}
          <Button variant="navy" size="sm" onClick={() => setEditing({ mode: 'new' })}><Plus className="h-4 w-4" /> Add widget</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {widgets.map((w) => (
          <DashWidget
            key={w.id} p={p} w={w}
            dragging={draggingId === w.id} over={overId === w.id && draggingId !== w.id}
            onDragStart={() => { dragId.current = w.id; setDraggingId(w.id) }}
            onDragOver={() => setOverId(w.id)}
            onDrop={() => { reorder(dragId.current, w.id); endDrag() }}
            onDragEnd={endDrag}
            onEdit={() => setEditing({ mode: 'edit', widget: w })}
            onResize={() => patch(w.id, { size: w.size === 'full' ? 'half' : 'full' })}
            onCollapse={() => patch(w.id, { collapsed: !w.collapsed })}
            onRemove={() => remove(w.id)}
          />
        ))}
      </div>

      {editing && (
        <WidgetWizard
          p={p} mode={editing.mode} initial={editing.widget}
          onClose={() => setEditing(null)} onSave={saveWidget}
        />
      )}
    </div>
  )
}

function DashWidget({ p, w, dragging, over, onDragStart, onDragOver, onDrop, onDragEnd, onEdit, onResize, onCollapse, onRemove }: {
  p: Page; w: WidgetCfg; dragging: boolean; over: boolean
  onDragStart: () => void; onDragOver: () => void; onDrop: () => void; onDragEnd: () => void
  onEdit: () => void; onResize: () => void; onCollapse: () => void; onRemove: () => void
}) {
  const isFunnel = w.kind === 'funnel'
  const editable = EDITABLE.includes(w.kind)
  return (
    <div
      className={cn('col-span-1', w.size === 'full' && 'sm:col-span-2', dragging && 'opacity-50')}
      onDragOver={(e) => { e.preventDefault(); onDragOver() }}
      onDrop={onDrop}
    >
      <Card className={cn('flex h-full flex-col overflow-hidden p-0 transition-shadow', over && 'ring-2 ring-navy/40')}>
        <header
          draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
          className="flex cursor-grab items-center gap-2 border-b border-line px-4 py-2.5 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 shrink-0 text-fg-subtle" />
          <span className="truncate text-[13.5px] font-semibold text-fg">{w.title}</span>
          {isFunnel && w.def && <span className="shrink-0 text-[11px] text-fg-subtle">· {w.def.steps.length} stages</span>}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button aria-label="Widget options" className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-fg-subtle transition-colors hover:bg-sunken hover:text-fg"><MoreHorizontal className="h-4 w-4" /></button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-[172px] rounded-[11px] border border-line bg-panel p-1.5 shadow-pop">
                {editable && <MenuItem icon={<Pencil className="h-3.5 w-3.5" />} label="Edit" onSelect={onEdit} />}
                <MenuItem icon={w.size === 'full' ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />} label={w.size === 'full' ? 'Make compact' : 'Make wide'} onSelect={onResize} />
                <MenuItem icon={w.collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />} label={w.collapsed ? 'Expand' : 'Collapse'} onSelect={onCollapse} />
                {!w.builtin && (
                  <>
                    <div className="my-1 h-px bg-line" />
                    <MenuItem icon={<Trash2 className="h-3.5 w-3.5" />} label="Remove" onSelect={onRemove} danger />
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </header>

        {!w.collapsed && <div className="flex-1 p-4"><WidgetBody p={p} w={w} /></div>}
      </Card>
    </div>
  )
}

function MenuItem({ icon, label, onSelect, danger }: { icon: React.ReactNode; label: string; onSelect: () => void; danger?: boolean }) {
  return (
    <DropdownMenu.Item onSelect={onSelect} className={cn('flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[12.5px] font-medium outline-none', danger ? 'text-neg data-[highlighted]:bg-neg-tint' : 'text-fg-muted data-[highlighted]:bg-sunken data-[highlighted]:text-fg')}>
      {icon}{label}
    </DropdownMenu.Item>
  )
}

function WidgetBody({ p, w }: { p: Page; w: WidgetCfg }) {
  if (w.kind === 'funnel' && w.def) return (
    <>
      <FunnelView p={p} def={w.def} />
      <p className="mt-3 text-[11px] leading-relaxed text-fg-subtle">Every stage is measured from your connected sources and reconciles to this page’s totals.</p>
    </>
  )
  if (w.kind === 'trend' || w.kind === 'bar' || w.kind === 'donut' || w.kind === 'kpi') return <ChartView p={p} kind={w.kind} source={w.source} customField={w.customField} customLabel={w.customLabel} />
  if (w.kind === 'cpl-trend') return <CplTrendBody p={p} />
  if (w.kind === 'revenue') return <RevenueBody p={p} />
  return null
}

function CplTrendBody({ p }: { p: Page }) {
  const wk = pageWeekly(p)
  const series = wk.cpl
  const recent = avg(series.slice(-3)); const prior = avg(series.slice(-6, -3))
  const reg = recent > prior * 1.04 ? { tone: 'warn' as const, txt: `Up ${Math.round((recent / prior - 1) * 100)}%` }
    : recent < prior * 0.96 ? { tone: 'pos' as const, txt: `Down ${Math.round((1 - recent / prior) * 100)}%` }
    : { tone: 'neutral' as const, txt: 'Stable' }
  const sinceDelta = Math.round((1 - series[series.length - 1] / series[0]) * 100)
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2"><span className="tnum text-[18px] font-bold text-fg">{inr(series[series.length - 1])}</span><span className="text-[11.5px] text-fg-subtle">latest week</span></div>
        <span className={cn('text-[12px] font-semibold', sinceDelta >= 0 ? 'text-pos' : 'text-neg')}>{sinceDelta >= 0 ? '↓' : '↑'} {Math.abs(sinceDelta)}% since the quarter began</span>
        <Badge tone={reg.tone} className="ml-auto">{reg.txt}</Badge>
      </div>
      <PageCplChart pageId={p.id} height={200} />
    </>
  )
}

function RevenueBody({ p }: { p: Page }) {
  const { factor: f } = useRange()
  const biz = pageBiz(p.id)
  if (biz.enrolled * f < 1) return <div className="rounded-[10px] bg-sunken px-3 py-5 text-center text-[12.5px] text-fg-subtle">Revenue appears once leads start closing in your CRM.</div>
  return <TicketRevenue pageId={p.id} name={p.name} biz={biz} f={f} hint="" campaigns={campaignsForPage(p.id).map((c) => ({ name: c.name, biz: campaignBiz(c) }))} bare />
}
