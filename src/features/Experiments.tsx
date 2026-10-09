import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNav } from '@/lib/nav'
import { useExp } from './experiments/ExperimentsProvider'
import { Button } from '@/components/ui'
import { NetIcon } from './Pages'
import { cn, inr } from '@/lib/utils'
import { EXPERIMENTS, VERDICT, ecpl, isNVar, variantCpl } from '@/data/samurai'
import { expPage } from '@/data/experiments'
import { pageNet } from '@/data/pages'
import { C } from '@/lib/tokens'

const badgeTone: Record<string, string> = {
  pos: 'bg-pos-tint text-pos', navy: 'bg-navy-tint text-navy', neg: 'bg-neg-tint text-neg', warn: 'bg-warn-tint text-warn', neutral: 'bg-sunken text-fg-muted',
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; live?: boolean }> = {
    running: { cls: 'bg-navy-tint text-navy', label: 'Running', live: true },
    ended: { cls: 'bg-pos-tint text-pos', label: 'Ended' },
    stopped: { cls: 'bg-sunken text-fg-muted', label: 'Stopped' },
    draft: { cls: 'bg-sunken text-fg-muted', label: 'Draft' },
  }
  const s = map[status] ?? map.draft
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold', s.cls)}>
      {s.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-navy" />}
      {s.label}
    </span>
  )
}

export function Experiments() {
  const { go } = useNav()
  const { newExperiment, openDeclare, openStop } = useExp()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')

  const segs = [
    { k: 'all', l: 'All' }, { k: 'running', l: 'Running' }, { k: 'ended', l: 'Ended' }, { k: 'stopped', l: 'Stopped' },
  ]
  const count = (k: string) => (k === 'all' ? EXPERIMENTS.length : EXPERIMENTS.filter((e) => e.status === k).length)
  const list = EXPERIMENTS.filter((e) => {
    if (status !== 'all' && e.status !== status) return false
    if (q) {
      const p = expPage(e)
      if (!(e.name.toLowerCase().includes(q.toLowerCase()) || (p && p.name.toLowerCase().includes(q.toLowerCase())))) return false
    }
    return true
  })

  return (
    <div className="mx-auto max-w-[1120px] px-8 py-7">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">Experiments</h1>
          <p className="mt-0.5 text-[13px] text-fg-subtle">What you're testing, what won — start every test from a proven template or from scratch.</p>
        </div>
        <Button variant="primary" size="md" onClick={() => newExperiment()}><Plus className="h-3.5 w-3.5" /> New experiment</Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search experiments…" className="input max-w-[240px]" />
        <div className="inline-flex rounded-[10px] border border-line bg-sunken p-0.5">
          {segs.map((s) => (
            <button key={s.k} onClick={() => setStatus(s.k)} className={cn('rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-colors', status === s.k ? 'bg-panel text-fg shadow-sm' : 'text-fg-subtle hover:text-fg-muted')}>
              {s.l} <span className="tabular-nums text-fg-subtle">{count(s.k)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2 text-[12px] text-fg-subtle">{list.length} of {EXPERIMENTS.length} experiments</div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-panel shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line text-fg-subtle">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium">Experiment</th>
                <th className="px-3 py-2.5 text-left font-medium">Page</th>
                <th className="px-3 py-2.5 text-left font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Run for</th>
                <th className="px-3 py-2.5 text-left font-medium">Cost per lead</th>
                <th className="px-3 py-2.5 text-left font-medium">Result</th>
                <th className="px-3 py-2.5 text-left font-medium">Uplift</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const p = expPage(e)
                const nvar = isNVar(e)
                const cc = ecpl(e.control)
                const vc = ecpl(e.variant)
                const vd = VERDICT[e.verdict]
                const mx = Math.max(cc || 0, vc || 0) || 1
                const uplift = !nvar && e.status === 'ended' && cc && vc ? Math.round(((vc - cc) / cc) * 100) : null
                const nVars = e.variants ?? []
                const nLead = nvar ? nVars.map((v) => variantCpl(e, v.letter)).filter((x): x is number => x != null).sort((a, b) => a - b)[0] : undefined
                return (
                  <tr key={e.id} onClick={() => go('experimentdetail', e.id)} className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-sunken/60">
                    <td className="px-3 py-2.5"><b className="font-semibold text-fg">{e.name}</b><div className="text-[11px] text-fg-subtle">Goal: {e.goal}</div></td>
                    <td className="px-3 py-2.5">{p ? <span className="flex items-center gap-1.5 text-fg-muted"><NetIcon net={pageNet(p.id)} />{p.name}</span> : '—'}</td>
                    <td className="px-3 py-2.5"><StatusChip status={e.status} /></td>
                    <td className="px-3 py-2.5 text-right tnum text-fg-muted">{e.days}d</td>
                    <td className="px-3 py-2.5">
                      {nvar ? (
                        <div className="min-w-[130px]">
                          <div className="text-[12px] tnum">{nLead != null ? <><b className="text-pos">{inr(nLead)}</b> <span className="text-[10.5px] text-fg-subtle">best · {nVars.length} versions</span></> : <span className="text-fg-subtle">{nVars.length} versions · collecting</span>}</div>
                          <div className="mt-1 flex h-1.5 gap-0.5">
                            {nVars.map((v, i) => <i key={v.letter} className="rounded-full" style={{ width: `${Math.round(60 / Math.max(nVars.length, 1))}%`, background: C.series[i % C.series.length] }} />)}
                          </div>
                        </div>
                      ) : cc && vc ? (
                        <div className="min-w-[130px]">
                          <div className="text-[12px] tnum"><span className="text-fg-subtle">{inr(cc)}</span> → <b className={vc < cc ? 'text-pos' : vc > cc ? 'text-neg' : 'text-fg'}>{inr(vc)}</b></div>
                          <div className="mt-1 flex h-1.5 gap-0.5">
                            <i className="rounded-full" style={{ width: `${Math.round((cc / mx) * 60)}%`, background: C.lineStrong }} />
                            <i className="rounded-full" style={{ width: `${Math.round((vc / mx) * 60)}%`, background: vc < cc ? C.pos : C.neg }} />
                          </div>
                        </div>
                      ) : <span className="text-fg-subtle">—</span>}
                    </td>
                    <td className="px-3 py-2.5"><span className={cn('rounded-md px-2 py-0.5 text-[11.5px] font-semibold', badgeTone[vd.tone])}>{vd.word} · {vd.call}</span></td>
                    <td className="px-3 py-2.5">{uplift != null ? <span className={cn('text-[12.5px] font-semibold', uplift <= 0 ? 'text-pos' : 'text-neg')}>{uplift <= 0 ? '▼' : '▲'} {Math.abs(uplift)}%</span> : <span className="text-fg-subtle">—</span>}</td>
                    <td className="px-2 py-2.5" onClick={(ev) => ev.stopPropagation()}>
                      <RowMenu status={e.status} declarable={!nvar} onDeclare={() => openDeclare(e.id)} onStop={() => openStop(e.id)} onOpenPage={() => go('pagedetail', e.pageId)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line bg-surface/60 px-3 py-2.5 text-[11.5px] text-fg-subtle">
          Cost per lead is per variant. Uplift stays blank until a winner is declared — a running test is not a result.
        </div>
      </div>
    </div>
  )
}

function RowMenu({ status, declarable = true, onDeclare, onStop, onOpenPage }: { status: string; declarable?: boolean; onDeclare: () => void; onStop: () => void; onOpenPage: () => void }) {
  const canAct = status === 'running'
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="grid h-7 w-7 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-sunken hover:text-fg"><MoreHorizontal className="h-4 w-4" /></button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-[180px] rounded-[11px] border border-line bg-panel p-1.5 shadow-pop">
          {canAct && declarable && <DropdownMenu.Item onSelect={onDeclare} className="cursor-pointer rounded-[7px] px-2 py-1.5 text-[13px] text-fg outline-none data-[highlighted]:bg-sunken">🏆 Declare a winner</DropdownMenu.Item>}
          {canAct && <DropdownMenu.Item onSelect={onStop} className="cursor-pointer rounded-[7px] px-2 py-1.5 text-[13px] text-neg outline-none data-[highlighted]:bg-neg-tint">■ Stop test</DropdownMenu.Item>}
          <DropdownMenu.Item onSelect={onOpenPage} className="cursor-pointer rounded-[7px] px-2 py-1.5 text-[13px] text-fg outline-none data-[highlighted]:bg-sunken">▤ Open the page</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
