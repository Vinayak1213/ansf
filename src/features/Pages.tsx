import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { useMemo, useReducer, useState } from 'react'
import { RangePicker, useRange } from '@/lib/range'
import { useNav } from '@/lib/nav'
import { useToast } from '@/components/Toast'
import { Badge, Button } from '@/components/ui'
import { cn, inr, num } from '@/lib/utils'
import { ACCOUNT, PAGES, USER_PAGES, addDraftPage, type Net, type Page } from '@/data/samurai'
import { ALL_GROUPS, STATUS_OPTS, lifeState, matchStatus, pageEndedTest, pageHealth, pageNet, pageRunningTest } from '@/data/pages'

export const band = (cpl: number) => (cpl < ACCOUNT.cpl * 0.82 ? 'lo' : cpl > ACCOUNT.cpl * 1.12 ? 'hi' : 'mid')
const bandColor: Record<string, string> = { lo: 'bg-pos', mid: 'bg-warn', hi: 'bg-neg' }

export function NetIcon({ net }: { net: Net }) {
  return (
    <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-[4px] text-[9px] font-bold text-white', net === 'google' ? 'bg-[#3b70d6]' : 'bg-[#7a5cf0]')}>
      {net === 'google' ? 'G' : 'M'}
    </span>
  )
}

type SortKey = 'name' | 'visits' | 'leads' | 'spend' | 'cpl'

export function Pages() {
  const { factor: f } = useRange()
  const { go } = useNav()
  const [q, setQ] = useState('')
  const [groups, setGroups] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'cpl', dir: 'desc' })
  const [rev, bump] = useReducer((x) => x + 1, 0)
  const [newOpen, setNewOpen] = useState(false)

  const all = useMemo(() => [...PAGES, ...USER_PAGES], [rev])
  const filtered = all.filter((p) => {
    if (q && !(p.name.toLowerCase().includes(q.toLowerCase()) || p.group.toLowerCase().includes(q.toLowerCase()))) return false
    if (groups.size && !groups.has(p.group)) return false
    if (!matchStatus(p, status)) return false
    return true
  })
  const dir = sort.dir === 'asc' ? 1 : -1
  const rows = [...filtered].sort((a, b) => {
    if (sort.key === 'name') return dir * a.name.localeCompare(b.name)
    if (sort.key === 'cpl') {
      if (a.cpl == null && b.cpl == null) return 0
      if (a.cpl == null) return 1
      if (b.cpl == null) return -1
      return dir * (a.cpl - b.cpl)
    }
    return dir * (((a as any)[sort.key] || 0) - ((b as any)[sort.key] || 0))
  })
  const live = filtered.filter((p) => p.spend > 0)
  const T = live.reduce((t, p) => ({ spend: t.spend + p.spend * f, visits: t.visits + p.visits * f, leads: t.leads + p.leads * f }), { spend: 0, visits: 0, leads: 0 })
  const tcpl = T.leads ? T.spend / T.leads : 0
  const anyFilter = q || groups.size || status !== 'all'

  const toggleGroup = (g: string) => setGroups((s) => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n })
  const onSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))

  const Th = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <th className={cn('cursor-pointer select-none px-3 py-2.5 font-medium text-fg-subtle transition-colors hover:text-fg', right ? 'text-right' : 'text-left', sort.key === k && 'text-fg')} onClick={() => onSort(k)}>
      {label}
      {sort.key === k && <span className="ml-1 text-fg-subtle">{sort.dir === 'desc' ? '↓' : '↑'}</span>}
    </th>
  )

  return (
    <div className="mx-auto max-w-[1120px] px-8 py-7">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">Pages</h1>
          <p className="mt-0.5 text-[13px] text-fg-subtle">Every landing page's cost per lead, health, and whether a test is on it now.</p>
        </div>
        <RangePicker />
      </div>

      {/* filter bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-[9px] border border-line bg-panel px-3">
          <Search className="h-4 w-4 text-fg-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages…" className="flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-subtle" />
        </div>

        <FilterMenu label={groups.size ? `Group · ${groups.size}` : 'Group'} active={groups.size > 0}>
          {ALL_GROUPS.map((g) => (
            <DropdownMenu.Item key={g} onSelect={(e) => { e.preventDefault(); toggleGroup(g) }} className="flex cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-[13px] text-fg outline-none data-[highlighted]:bg-sunken">
              <span className={cn('grid h-4 w-4 place-items-center rounded border', groups.has(g) ? 'border-brand bg-brand text-white' : 'border-line-strong')}>{groups.has(g) && <Check className="h-3 w-3" />}</span>
              <span className="flex-1">{g}</span>
              <span className="text-[11px] text-fg-subtle">{all.filter((p) => p.group === g).length}</span>
            </DropdownMenu.Item>
          ))}
        </FilterMenu>

        <FilterMenu label={status === 'all' ? 'Status' : STATUS_OPTS.find((o) => o.key === status)?.label ?? 'Status'} active={status !== 'all'}>
          {STATUS_OPTS.map((o) => (
            <DropdownMenu.Item key={o.key} onSelect={() => setStatus(o.key)} className="flex cursor-pointer items-center justify-between rounded-[7px] px-2 py-1.5 text-[13px] text-fg outline-none data-[highlighted]:bg-sunken">
              {o.label}
              {status === o.key && <Check className="h-3.5 w-3.5 text-brand" />}
            </DropdownMenu.Item>
          ))}
        </FilterMenu>

        {anyFilter && (
          <button onClick={() => { setQ(''); setGroups(new Set()); setStatus('all') }} className="text-[12.5px] font-medium text-fg-muted hover:text-fg">
            Clear all
          </button>
        )}
        <div className="flex-1" />
        <Button variant="primary" size="md" onClick={() => setNewOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New page
        </Button>
      </div>

      <div className="mb-2 text-[12px] text-fg-subtle">
        {filtered.length} of {all.length} pages{anyFilter ? ' match' : ''}
      </div>

      {/* table */}
      {rows.length ? (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-panel shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b border-line">
                <tr>
                  <Th k="name" label="Page" />
                  <th className="px-3 py-2.5 text-left font-medium text-fg-subtle">Group</th>
                  <th className="px-3 py-2.5 text-left font-medium text-fg-subtle">Status &amp; health</th>
                  <Th k="visits" label="Visits" right />
                  <Th k="leads" label="Leads" right />
                  <Th k="spend" label="Spend" right />
                  <Th k="cpl" label="Cost per lead" right />
                  <th className="px-3 py-2.5 text-left font-medium text-fg-subtle">Test</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const draft = !!p.draft
                  const noData = p.spend === 0
                  const h = draft || noData ? null : pageHealth(p)
                  return (
                    <tr key={p.id} onClick={() => go('pagedetail', p.id)} className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-sunken/60">
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          <NetIcon net={pageNet(p.id)} />
                          <b className="font-semibold text-fg">{p.name}</b>
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><Badge tone="neutral">{p.group}</Badge></td>
                      <td className="px-3 py-2.5">
                        {draft ? (
                          <Badge tone="neutral">Draft</Badge>
                        ) : noData ? (
                          <span className="flex items-center gap-1.5"><Badge tone="pos">Live</Badge><span className="text-[11px] text-fg-subtle">collecting</span></span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <Badge tone="pos">Live</Badge>
                            {h && h.tone !== 'ok' && <Badge tone={h.tone === 'bad' ? 'neg' : 'warn'}>{h.txt}</Badge>}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tnum">{noData ? <Dash /> : num(p.visits * f)}</td>
                      <td className="px-3 py-2.5 text-right tnum">{noData ? <Dash /> : num(p.leads * f)}</td>
                      <td className="px-3 py-2.5 text-right tnum">{noData ? <Dash /> : inr(p.spend * f)}</td>
                      <td className="px-3 py-2.5 text-right">
                        {noData ? <Dash /> : p.cpl ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className={cn('h-2 w-2 rounded-full', bandColor[band(p.cpl)])} />
                            <b className="tnum font-semibold text-fg">{inr(p.cpl)}</b>
                          </span>
                        ) : (
                          <span className="text-[12px] text-fg-subtle">— no leads</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {pageRunningTest(p.id) ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-navy-tint px-2 py-0.5 text-[11px] font-semibold text-navy">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-navy" /> Testing
                          </span>
                        ) : pageEndedTest(p.id) ? (
                          <span className="rounded-md bg-pos-tint px-2 py-0.5 text-[11px] font-semibold text-pos">Winner shipped</span>
                        ) : (
                          <Dash />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-surface/60 font-semibold text-fg">
                  <td className="px-3 py-2.5">{live.length} live</td>
                  <td colSpan={2} />
                  <td className="px-3 py-2.5 text-right tnum">{num(T.visits)}</td>
                  <td className="px-3 py-2.5 text-right tnum">{num(T.leads)}</td>
                  <td className="px-3 py-2.5 text-right tnum">{inr(T.spend)}</td>
                  <td className="px-3 py-2.5 text-right tnum">{inr(tcpl)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="border-t border-line bg-surface/60 px-3 py-2.5 text-[11.5px] text-fg-subtle">
            Cost per lead = spend ÷ leads for that page. Pages with no leads carry spend but no return — they surface in Overview → Where the money leaked.
          </div>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-line bg-panel p-12 text-center">
          <b className="text-[15px] text-fg">No pages match these filters</b>
          <p className="mt-1 text-[13px] text-fg-subtle">Nothing matches the current search and filters.</p>
          <Button variant="default" size="sm" className="mt-3" onClick={() => { setQ(''); setGroups(new Set()); setStatus('all') }}>Clear all filters</Button>
        </div>
      )}

      <NewPageDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onAdd={(p) => { addDraftPage(p); setNewOpen(false); bump() }}
      />
    </div>
  )
}

function Dash() {
  return <span className="text-fg-subtle">—</span>
}

function FilterMenu({ label, active, children }: { label: string; active: boolean; children: React.ReactNode }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={cn('inline-flex h-9 items-center gap-1.5 rounded-[9px] border px-3 text-[13px] font-medium transition-colors', active ? 'border-brand/30 bg-brand-tint text-brand' : 'border-line bg-panel text-fg-muted hover:border-line-strong')}>
          {label}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="z-50 min-w-[190px] rounded-[11px] border border-line bg-panel p-1.5 shadow-pop">
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function NewPageDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (p: Page) => void }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [slug, setSlug] = useState('')
  const submit = () => {
    if (!name.trim()) return
    const id = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).slice(0, 40) + '-' + Math.random().toString(36).slice(2, 5)
    onAdd({ id, name: name.trim(), group: group.trim() || 'Other', path: '/' + (slug || id), spend: 0, clicks: 0, visits: 0, leads: 0, cpl: null })
    toast(`"${name.trim()}" added as a draft.`)
    setName(''); setGroup(''); setSlug('')
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-50 bg-fg/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed left-1/2 top-1/2 z-50 w-[460px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-line bg-panel shadow-lg focus:outline-none"
                initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              >
                <div className="flex items-start justify-between border-b border-line p-4">
                  <div>
                    <Dialog.Title className="text-[15px] font-semibold text-fg">Add a page</Dialog.Title>
                    <Dialog.Description className="mt-0.5 text-[12px] text-fg-subtle">Configure a landing page for Samurai to track.</Dialog.Description>
                  </div>
                  <Dialog.Close className="text-fg-subtle hover:text-fg"><X className="h-4 w-4" /></Dialog.Close>
                </div>
                <div className="space-y-3 p-4">
                  <Field label="Page name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. MBA — Scholarship" className="input" /></Field>
                  <Field label="Programme / group"><input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. MBA" className="input" /></Field>
                  <Field label="URL slug">
                    <div className="flex items-center overflow-hidden rounded-[9px] border border-line">
                      <span className="bg-sunken px-2.5 py-2 text-[12px] text-fg-subtle">pages.onlinejain.com/</span>
                      <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="mba-scholarship" className="flex-1 bg-transparent px-2.5 py-2 text-[13px] text-fg outline-none" />
                    </div>
                  </Field>
                  <p className="rounded-[10px] bg-sunken px-3 py-2 text-[12px] leading-relaxed text-fg-subtle">
                    New pages start as a <b>Draft</b> with no traffic. Metrics appear once the page is published and receiving spend — so drafts never distort your totals.
                  </p>
                </div>
                <div className="flex justify-end gap-2 border-t border-line p-3">
                  <Dialog.Close asChild><Button variant="default" size="sm">Cancel</Button></Dialog.Close>
                  <Button variant="primary" size="sm" onClick={submit}>Add page</Button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  )
}
