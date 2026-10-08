import { motion } from 'motion/react'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { RangePicker, useRange } from '@/lib/range'
import { useNav } from '@/lib/nav'
import { Card, Segmented, SectionHead } from '@/components/ui'
import { NetIcon, band } from './Pages'
import { cn, inr, num } from '@/lib/utils'
import { ACCOUNT, CAMPAIGNS } from '@/data/samurai'
import { C } from '@/lib/tokens'

const bandColor: Record<string, string> = { lo: 'bg-pos', mid: 'bg-warn', hi: 'bg-neg' }

function platStats(f: number) {
  const acc = { google: { spend: 0, leads: 0, good: 0, clicks: 0 }, meta: { spend: 0, leads: 0, good: 0, clicks: 0 } }
  CAMPAIGNS.forEach((c) => {
    const a = acc[c.net]
    a.spend += c.spend * f; a.leads += c.leads * f; a.good += c.leads * c.good * f; a.clicks += c.clicks * f
  })
  const total = acc.google.spend + acc.meta.spend
  const tleads = acc.google.leads + acc.meta.leads
  const fin = (a: typeof acc.google) => ({ ...a, cpl: a.leads ? a.spend / a.leads : null, goodRate: a.leads ? a.good / a.leads : 0, share: total ? a.spend / total : 0, leadShare: tleads ? a.leads / tleads : 0 })
  return { g: fin(acc.google), m: fin(acc.meta), total, tleads, tcpl: tleads ? total / tleads : 0 }
}

export function Campaigns() {
  const { factor: f, label } = useRange()
  const { go } = useNav()
  const [q, setQ] = useState('')
  const [seg, setSeg] = useState('all')
  const [platView, setPlatView] = useState<'graph' | 'table'>('graph')
  const s = platStats(f)

  const list = CAMPAIGNS.filter((c) => {
    if (seg === 'noleads' && c.leads !== 0) return false
    if (seg === 'converting' && c.leads === 0) return false
    if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })
  const cnt = (k: string) => (k === 'all' ? CAMPAIGNS.length : k === 'noleads' ? CAMPAIGNS.filter((c) => c.leads === 0).length : CAMPAIGNS.filter((c) => c.leads > 0).length)
  const T = list.reduce((t, c) => ({ spend: t.spend + c.spend * f, leads: t.leads + c.leads * f, good: t.good + c.leads * c.good * f }), { spend: 0, leads: 0, good: 0 })
  const tcpl = T.leads ? T.spend / T.leads : 0
  const tgood = T.leads ? T.good / T.leads : 0

  return (
    <div className="mx-auto max-w-[1120px] px-8 py-7">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">Campaigns</h1>
          <p className="mt-0.5 text-[13px] text-fg-subtle">Which campaigns turn spend into page leads — and which are spending for nothing.</p>
        </div>
        <RangePicker />
      </div>

      {/* platform */}
      <SectionHead title="By platform" hint={`Google vs Meta · ${label}`} right={<Segmented value={platView} onChange={setPlatView} options={[{ value: 'graph', label: 'Graph' }, { value: 'table', label: 'Table' }]} />} />
      <Card className="p-5">
        {platView === 'graph' ? (
          <div>
            <div className="flex h-3.5 overflow-hidden rounded-full bg-sunken">
              <motion.i className="h-full" style={{ background: C.navy }} initial={{ width: 0 }} animate={{ width: `${Math.round(s.g.share * 100)}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
              <motion.i className="h-full" style={{ background: C.brand }} initial={{ width: 0 }} animate={{ width: `${Math.round(s.m.share * 100)}%` }} transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-4 text-[11.5px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: C.navy }} />Google — {Math.round(s.g.share * 100)}% of spend, {Math.round(s.g.leadShare * 100)}% of leads</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: C.brand }} />Meta — {Math.round(s.m.share * 100)}% of spend, {Math.round(s.m.leadShare * 100)}% of leads</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PlatCard name="Google Ads" net="google" d={s.g} />
              <PlatCard name="Meta Ads" net="meta" d={s.m} />
            </div>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="border-b border-line text-fg-subtle"><tr><th className="px-2 py-2 text-left font-medium">Platform</th><th className="px-2 py-2 text-right font-medium">Spend</th><th className="px-2 py-2 text-right font-medium">Share</th><th className="px-2 py-2 text-right font-medium">Page leads</th><th className="px-2 py-2 text-right font-medium">CPL</th><th className="px-2 py-2 text-right font-medium">Good-lead</th></tr></thead>
            <tbody>
              {[['Google Ads', 'google', s.g], ['Meta Ads', 'meta', s.m]].map(([n, net, d]: any) => (
                <tr key={n} className="border-b border-line last:border-0">
                  <td className="px-2 py-2"><span className="flex items-center gap-2"><NetIcon net={net} />{n}</span></td>
                  <td className="px-2 py-2 text-right tnum">{inr(d.spend)}</td>
                  <td className="px-2 py-2 text-right tnum">{Math.round(d.share * 100)}%</td>
                  <td className="px-2 py-2 text-right tnum">{num(d.leads)}</td>
                  <td className={cn('px-2 py-2 text-right tnum font-semibold', d.cpl && d.cpl > ACCOUNT.cpl ? 'text-neg' : 'text-pos')}>{d.cpl ? inr(d.cpl) : '—'}</td>
                  <td className="px-2 py-2 text-right tnum">{d.leads ? Math.round(d.goodRate * 100) + '%' : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t border-line font-semibold text-fg"><td className="px-2 py-2">All platforms</td><td className="px-2 py-2 text-right tnum">{inr(s.total)}</td><td className="px-2 py-2 text-right">100%</td><td className="px-2 py-2 text-right tnum">{num(s.tleads)}</td><td className="px-2 py-2 text-right tnum">{inr(s.tcpl)}</td><td /></tr></tfoot>
          </table>
        )}
      </Card>

      {/* list */}
      <div className="mt-6">
        <SectionHead title="All campaigns" hint={label} />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-[9px] border border-line bg-panel px-3">
            <Search className="h-4 w-4 text-fg-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns…" className="flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-subtle" />
          </div>
          <div className="inline-flex rounded-[10px] border border-line bg-sunken p-0.5">
            {[['all', 'All'], ['noleads', 'Spending, no leads'], ['converting', 'Converting']].map(([k, l]) => (
              <button key={k} onClick={() => setSeg(k)} className={cn('rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-colors', seg === k ? 'bg-panel text-fg shadow-sm' : 'text-fg-subtle hover:text-fg-muted')}>{l} <span className="tabular-nums text-fg-subtle">{cnt(k)}</span></button>
            ))}
          </div>
        </div>
        <div className="mb-2 text-[12px] text-fg-subtle">{list.length} of {CAMPAIGNS.length} campaigns</div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b border-line text-fg-subtle"><tr><th className="px-3 py-2.5 text-left font-medium">Campaign</th><th className="px-3 py-2.5 text-right font-medium">Spend</th><th className="px-3 py-2.5 text-right font-medium">Page leads</th><th className="px-3 py-2.5 text-right font-medium">Cost per lead</th><th className="px-3 py-2.5 text-right font-medium">Good-lead rate</th></tr></thead>
              <tbody>
                {list.map((c) => {
                  const noleads = c.leads === 0
                  return (
                    <tr key={c.id} onClick={() => go('campaigndetail', c.id)} className={cn('cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-sunken/60', noleads && 'bg-neg-tint/30')}>
                      <td className="px-3 py-2.5"><span className="flex items-center gap-2"><NetIcon net={c.net} /><b className="font-semibold text-fg">{c.name}</b></span></td>
                      <td className="px-3 py-2.5 text-right tnum">{inr(c.spend * f)}</td>
                      <td className="px-3 py-2.5 text-right">{noleads ? <span className="rounded bg-neg-tint px-1.5 py-0.5 text-[11px] font-semibold text-neg">0 leads</span> : <span className="tnum">{num(c.leads * f)}</span>}</td>
                      <td className="px-3 py-2.5 text-right">{c.cpl ? <span className="inline-flex items-center gap-1.5"><span className={cn('h-2 w-2 rounded-full', bandColor[band(c.cpl)])} /><b className="tnum font-semibold text-fg">{inr(c.cpl)}</b></span> : <span className="text-fg-subtle">—</span>}</td>
                      <td className="px-3 py-2.5 text-right tnum">{noleads ? <span className="text-fg-subtle">—</span> : Math.round(c.good * 100) + '%'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot><tr className="border-t border-line bg-surface/60 font-semibold text-fg"><td className="px-3 py-2.5">{list.length} campaigns</td><td className="px-3 py-2.5 text-right tnum">{inr(T.spend)}</td><td className="px-3 py-2.5 text-right tnum">{num(T.leads)}</td><td className="px-3 py-2.5 text-right tnum">{tcpl ? inr(tcpl) : '—'}</td><td className="px-3 py-2.5 text-right tnum">{T.leads ? Math.round(tgood * 100) + '%' : '—'}</td></tr></tfoot>
            </table>
          </div>
          <div className="border-t border-line bg-surface/60 px-3 py-2.5 text-[11.5px] text-fg-subtle">"Spending, no leads" is the single most useful control here — a campaign buying clicks that never become enquiries.</div>
        </Card>
      </div>
    </div>
  )
}

function PlatCard({ name, net, d }: { name: string; net: 'google' | 'meta'; d: any }) {
  return (
    <div className="rounded-[12px] border border-line bg-sunken/40 p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2"><NetIcon net={net} /><b className="text-[13px] text-fg">{name}</b></span>
        <span className="text-[11px] text-fg-subtle">{Math.round(d.share * 100)}% of spend</span>
      </div>
      <div className="tnum mt-2 text-[22px] font-bold text-fg">{inr(d.spend)}</div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[['Page leads', num(d.leads)], ['Cost per lead', d.cpl ? inr(d.cpl) : '—'], ['Good-lead', d.leads ? Math.round(d.goodRate * 100) + '%' : '—']].map(([k, v]) => (
          <div key={k}><div className={cn('tnum text-[14px] font-bold', k === 'Cost per lead' && d.cpl ? (d.cpl > 1732 ? 'text-neg' : 'text-pos') : 'text-fg')}>{v}</div><div className="text-[10.5px] text-fg-subtle">{k}</div></div>
        ))}
      </div>
    </div>
  )
}
