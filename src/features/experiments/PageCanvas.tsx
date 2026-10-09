import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, MousePointerClick } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Variable } from '@/data/templates'
import type { Page } from '@/data/samurai'

/* The interaction map for ONE variant. The variant's own page is shown (its programme name + path), so
   each version looks distinct. Click a button to place one of your VARIABLES on it — "on this version,
   this button is my Enquiry". `placement` is variableId → elementKey for this variant. A variable can
   sit on a different button per variant. Pass `readOnly` to render a static preview (no editing). */
export function PageCanvas({
  variables,
  placement,
  onAssign,
  caption,
  page,
  readOnly,
}: {
  variables: Variable[]
  placement: Record<string, string>
  onAssign?: (el: string, varId: string) => void
  caption?: string
  page?: Page
  readOnly?: boolean
}) {
  const named = variables.filter((v) => v.name.trim())
  const varOnEl = (el: string): Variable | undefined => named.find((v) => placement[v.id] === el)
  const ro = readOnly || !onAssign
  const assign = onAssign ?? (() => {})
  const bar = caption ?? (page ? `pages.onlinejain.com${page.path}` : 'sample landing page')
  const title = page ? (page.group === 'Other' ? 'Online degrees' : page.name) : 'Online programme'

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <span className="inline-flex items-center gap-1 text-[11px] text-fg-subtle"><MousePointerClick className="h-3 w-3" /> {ro ? 'variables placed on this version' : 'click a button to place a variable on it'}</span>
      </div>

      {/* browser frame */}
      <div className="overflow-hidden rounded-[12px] border border-line-strong shadow-sm">
        <div className="flex items-center gap-2 border-b border-line bg-sunken px-3 py-2">
          <span className="flex gap-1"><i className="h-2.5 w-2.5 rounded-full bg-line-strong" /><i className="h-2.5 w-2.5 rounded-full bg-line-strong" /><i className="h-2.5 w-2.5 rounded-full bg-line-strong" /></span>
          <span className="flex-1 truncate rounded-md bg-panel px-2.5 py-1 text-center text-[11px] text-fg-subtle">{bar}</span>
        </div>

        {/* the page */}
        <div className="relative bg-panel">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-fg"><span className="grid h-4 w-4 place-items-center rounded-[4px] bg-brand"><i className="h-1.5 w-1.5 rounded-full bg-white" /></span>JAIN Online</span>
            <span className="hidden gap-4 text-[11px] text-fg-subtle sm:flex"><span>Programmes</span><span>Fees</span><span>About</span></span>
          </div>

          <div className="grid gap-5 px-5 py-6 md:grid-cols-[1.3fr_1fr]">
            <div>
              <span className="inline-block rounded-full bg-pos-tint px-2 py-0.5 text-[10px] font-semibold text-pos">UGC-entitled · NAAC A++</span>
              <h2 className="mt-2 text-[24px] font-bold leading-tight tracking-tight text-fg">{title}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">Learn from India's #1 ranked online university. 100% online, industry-aligned, placement support.</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Hotspot el="apply" assigned={varOnEl('apply')} variables={named} onAssign={assign} readOnly={ro}>
                  <span className="inline-flex items-center rounded-[9px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white">Apply Now →</span>
                </Hotspot>
                <Hotspot el="prospectus" assigned={varOnEl('prospectus')} variables={named} onAssign={assign} readOnly={ro}>
                  <span className="inline-flex items-center rounded-[9px] border border-line-strong px-4 py-2.5 text-[13px] font-semibold text-fg">Download prospectus</span>
                </Hotspot>
              </div>
              <div className="mt-4 flex gap-3 text-[11px] text-fg-subtle"><span>★★★★★ 4.6 / 5</span><span>· 40,000+ learners</span><span>· EMI from ₹6,250/mo</span></div>
            </div>

            <div className={cn('rounded-[12px] border bg-sunken/50 p-4', varOnEl('form') ? (varOnEl('form')!.isGoal ? 'border-brand' : 'border-navy') : 'border-line')}>
              <div className="mb-2.5 flex items-center justify-between">
                <div className="text-[13px] font-semibold text-fg">Get a call back</div>
                <Hotspot el="form" assigned={varOnEl('form')} variables={named} onAssign={assign} readOnly={ro}>
                  <span className="rounded-full border border-line bg-panel px-2 py-0.5 text-[10px] font-medium text-fg-subtle">Enquiry form</span>
                </Hotspot>
              </div>
              <div className="space-y-2">
                <div className="rounded-[8px] border border-line bg-panel px-3 py-2 text-[12px] text-fg-subtle">Full name</div>
                <div className="rounded-[8px] border border-line bg-panel px-3 py-2 text-[12px] text-fg-subtle">Phone number</div>
              </div>
              <Hotspot el="callback" assigned={varOnEl('callback')} variables={named} onAssign={assign} readOnly={ro} block>
                <div className="mt-2.5 rounded-[8px] bg-navy py-2.5 text-center text-[12.5px] font-semibold text-white">Request a callback</div>
              </Hotspot>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
            <Hotspot el="whatsapp" assigned={varOnEl('whatsapp')} variables={named} onAssign={assign} readOnly={ro}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12px] font-medium text-fg-muted">WhatsApp enquiry</span>
            </Hotspot>
            <Hotspot el="call" assigned={varOnEl('call')} variables={named} onAssign={assign} readOnly={ro}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12px] font-medium text-fg-muted">Call 1800-XXX</span>
            </Hotspot>
            <span className="ml-auto text-[10.5px] text-fg-subtle">6 clickable elements on this page</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Hotspot({ el, assigned, variables, onAssign, children, block, readOnly }: { el: string; assigned?: Variable; variables: Variable[]; onAssign: (el: string, varId: string) => void; children: React.ReactNode; block?: boolean; readOnly?: boolean }) {
  const ringCls = assigned ? (assigned.isGoal ? 'ring-2 ring-brand ring-offset-2' : 'ring-2 ring-navy ring-offset-2') : ''

  // read-only preview: static badge, no dropdown
  if (readOnly) {
    return (
      <div className={cn('relative rounded-[10px]', block && 'w-full', ringCls)}>
        {children}
        {assigned && <span className={cn('absolute -right-1.5 -top-2 max-w-[130px] truncate rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm', assigned.isGoal ? 'bg-brand' : 'bg-navy')}>{assigned.name}</span>}
      </div>
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={cn('group relative rounded-[10px] text-left outline-none transition-all', block && 'w-full', ringCls, !assigned && 'hover:ring-2 hover:ring-brand/30')}>
          {children}
          {assigned ? (
            <span className={cn('absolute -right-1.5 -top-2 max-w-[130px] truncate rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm', assigned.isGoal ? 'bg-brand' : 'bg-navy')}>{assigned.name}</span>
          ) : (
            <span className="absolute -right-1.5 -top-2 hidden rounded-full bg-fg px-1.5 py-0.5 text-[9px] font-semibold text-white group-hover:block">+ place</span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={6} className="z-50 min-w-[200px] rounded-[11px] border border-line bg-panel p-1.5 shadow-pop">
          <div className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-fg-subtle">On this version, this is</div>
          {variables.map((v) => (
            <Item key={v.id} on={assigned?.id === v.id} onSelect={() => onAssign(el, v.id)}>
              <span className="flex items-center gap-1.5"><i className={cn('h-2 w-2 shrink-0 rounded-full', v.isGoal ? 'bg-brand' : 'bg-navy')} /><span className="truncate">{v.name}</span>{v.isGoal && <span className="rounded bg-brand-tint px-1 py-0.5 text-[8px] font-bold uppercase text-brand">Goal</span>}</span>
            </Item>
          ))}
          {variables.length === 0 && <div className="px-2 py-1.5 text-[11.5px] text-fg-subtle">Add a variable first.</div>}
          {assigned && <><div className="my-1 h-px bg-line" /><Item onSelect={() => onAssign(el, '')} danger>Clear this button</Item></>}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
function Item({ on, onSelect, children, danger }: { on?: boolean; onSelect: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <DropdownMenu.Item onSelect={onSelect} className={cn('flex cursor-pointer items-center justify-between gap-2 rounded-[7px] px-2 py-1.5 text-[13px] outline-none data-[highlighted]:bg-sunken', danger ? 'text-neg' : 'text-fg')}>
      <span className="min-w-0 flex-1">{children}</span>{on && <Check className="h-3.5 w-3.5 shrink-0 text-brand" />}
    </DropdownMenu.Item>
  )
}
