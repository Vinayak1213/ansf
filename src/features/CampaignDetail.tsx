import { AlertTriangle, TrendingUp, Users, Wallet } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { RangePicker, useRange } from '@/lib/range'
import { useNav } from '@/lib/nav'
import { useInvestigate } from '@/components/Investigate'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { Button, Card, InvestigateLink, SectionHead } from '@/components/ui'
import { NetIcon } from './Pages'
import { cn, inr, inrCompact, num } from '@/lib/utils'
import { CAMPAIGNS, PAGES } from '@/data/samurai'
import { campaignBiz } from '@/data/business'
import { TicketRevenue } from '@/components/TicketRevenue'
import { C } from '@/lib/tokens'

function campWeekly(c: (typeof CAMPAIGNS)[number]) {
  const N = 13
  const Sq = c.spend * 3
  const raw = Array.from({ length: N }, (_, i) => 1 - (0.015 * (i - 6)) / 6 + ((i % 3) - 1) * 0.02)
  const rs = raw.reduce((a, b) => a + b, 0)
  const S = raw.map((r) => Math.round((Sq * r) / rs))
  S[N - 1] += Sq - S.reduce((a, b) => a + b, 0)
  if (c.leads === 0) return { spend: S, leads: Array(N).fill(0), cpl: Array(N).fill(null) as (number | null)[] }
  const Lq = c.leads * 3
  const lw = Array.from({ length: N }, (_, i) => 1 + 0.03 * i)
  const ls = lw.reduce((a, b) => a + b, 0)
  const L = lw.map((w) => Math.max(1, Math.round((Lq * w) / ls)))
  L[N - 1] += Lq - L.reduce((a, b) => a + b, 0)
  return { spend: S, leads: L, cpl: S.map((s, i) => Math.round(s / L[i])) as (number | null)[] }
}

export function CampaignDetail({ id }: { id: string }) {
  const { factor: f, label } = useRange()
  const { go } = useNav()
  const investigate = useInvestigate()
  const c = CAMPAIGNS.find((x) => x.id === id)
  if (!c) return <div className="p-10 text-fg-subtle">Campaign not found.</div>
  const p = PAGES.find((x) => x.id === c.pageId)
  const noleads = c.leads === 0
  const cpl = c.cpl
  const wk = campWeekly(c)
  const totSpend = wk.spend.reduce((a, b) => a + b, 0)
  const spendData = wk.spend.map((s, i) => ({ week: i + 1, spend: s }))
  const cplSeries = wk.cpl.filter((x): x is number => x != null)
  const cplData = wk.cpl.map((v, i) => ({ week: i + 1, cpl: v }))
  const sinceDelta = cplSeries.length ? Math.round((1 - cplSeries[cplSeries.length - 1] / cplSeries[0]) * 100) : 0

  const weekDrill = () =>
    investigate({
      title: `Weekly performance — ${c.name}`,
      definition: `Weekly spend sums to ${inr(totSpend)} for the quarter (${inr(c.spend * 3)}). Cost per lead reconciles with the campaign total.`,
      columns: [{ key: 'w', label: 'Week' }, { key: 's', label: 'Spend', align: 'right' }, { key: 'l', label: 'Leads', align: 'right' }, { key: 'c', label: 'CPL', align: 'right' }],
      rows: wk.spend.map((s, i) => ({ w: `W${i + 1}`, s: inr(s), l: num(wk.leads[i]), c: wk.cpl[i] ? inr(wk.cpl[i]!) : '—' })),
      foot: { w: 'Quarter', s: inr(totSpend), l: num(wk.leads.reduce((a, b) => a + b, 0)), c: cpl ? inr(cpl) : '—' },
    })

  const stats = [
    { icon: Wallet, label: 'Spend', value: c.spend * f, kind: 'inr' as const, sub: label },
    { icon: Users, label: 'Page leads', value: c.leads * f, kind: 'num' as const, sub: 'leads from this campaign' },
    { icon: TrendingUp, label: 'Cost per lead', value: cpl ?? 0, kind: 'inr' as const, sub: noleads ? 'no leads yet' : 'spend ÷ leads', dash: noleads },
    { icon: TrendingUp, label: 'Good-lead rate', value: Math.round(c.good * 100), kind: 'pct' as const, sub: 'CRM grade', dash: noleads },
  ]

  return (
    <div className="mx-auto max-w-[960px] px-8 py-7">
      <div className="mb-3 flex items-center gap-2 text-[13px] text-fg-muted">
        <button onClick={() => go('campaigns')} className="font-medium hover:text-fg">Campaigns</button>
        <span className="text-fg-subtle">/</span><span className="text-fg">{c.name}</span>
      </div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-fg"><NetIcon net={c.net} />{c.name}</h1>
          <p className="mt-0.5 text-[13px] text-fg-subtle">{c.net === 'google' ? 'Google' : 'Meta'} Ads{p && <> · lands on {p.name}</>}</p>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker />
          {p && <Button variant="default" size="md" onClick={() => go('pagedetail', p.id)}>Open the page</Button>}
        </div>
      </div>

      {noleads && (
        <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-neg/25 bg-neg-tint px-4 py-3 text-[13px] text-fg">
          <AlertTriangle className="h-4 w-4 shrink-0 text-neg" />
          <span><b>This campaign is spending with zero return.</b> {inr(c.spend * f)} spent, {num(c.clicks * f)} clicks, no leads — part of the confirmed leak on Overview.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((st) => (
          <Card key={st.label} className="p-4">
            <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-[8px] bg-sunken"><st.icon className="h-3.5 w-3.5 text-fg-muted" /></span><span className="text-[12px] font-medium text-fg-muted">{st.label}</span></div>
            <div className={cn('mt-2 text-[24px] font-bold tracking-tight', st.dash ? 'text-warn' : 'text-fg')}>{st.dash ? '—' : <AnimatedNumber value={st.value} kind={st.kind} />}</div>
            <div className="mt-0.5 text-[11px] text-fg-subtle">{st.sub}</div>
          </Card>
        ))}
      </div>

      <TicketRevenue pageId={c.pageId} name={c.name} biz={campaignBiz(c)} f={f} hint="enrolment revenue · this campaign" />

      <div className="mt-5">
        <SectionHead title="Spend over time" hint="weekly · this quarter" right={<InvestigateLink onClick={weekDrill} />} />
        <Card className="p-5">
          <div className="mb-1 flex gap-5 text-[12px] text-fg-muted"><span>Total spend · quarter <b className="tnum text-fg">{inr(totSpend)}</b></span><span>weekly average <b className="tnum text-fg">{inr(Math.round(totSpend / 13))}</b></span></div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={spendData} margin={{ top: 12, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid vertical={false} stroke={C.line} />
              <XAxis dataKey="week" tickFormatter={(w) => `W${w}`} tick={{ fontSize: 11, fill: C.fgSubtle }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => inrCompact(v)} tick={{ fontSize: 11, fill: C.fgSubtle }} axisLine={false} tickLine={false} width={48} />
              <Tooltip cursor={{ fill: C.sunken }} content={({ active, payload, label: l }: any) => active && payload?.length ? <div className="rounded-lg border border-line bg-panel px-3 py-2 text-[12px] shadow-pop"><b className="text-fg">Week {l}</b><div className="text-fg-muted tnum">{inr(payload[0].value)}</div></div> : null} />
              <Bar dataKey="spend" fill={C.navy} radius={[3, 3, 0, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {!noleads && (
        <div className="mt-5">
          <SectionHead title="Cost per lead trend" hint="weekly · this quarter" right={<InvestigateLink onClick={weekDrill} />} />
          <Card className="p-5">
            <div className="mb-1 flex gap-5 text-[12px] text-fg-muted"><span>Latest week <b className="tnum text-fg">{inr(cplSeries[cplSeries.length - 1])}</b></span><span className={sinceDelta >= 0 ? 'text-pos' : 'text-neg'}>{sinceDelta >= 0 ? '↓' : '↑'} {Math.abs(sinceDelta)}% over the quarter</span></div>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={cplData} margin={{ top: 12, right: 8, bottom: 0, left: -8 }}>
                <defs><linearGradient id="ccpl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.navy} stopOpacity="0.16" /><stop offset="1" stopColor={C.navy} stopOpacity="0" /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke={C.line} />
                <XAxis dataKey="week" tickFormatter={(w) => `W${w}`} tick={{ fontSize: 11, fill: C.fgSubtle }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => inrCompact(v)} tick={{ fontSize: 11, fill: C.fgSubtle }} axisLine={false} tickLine={false} width={48} domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip cursor={{ stroke: C.lineStrong, strokeDasharray: '4 4' }} content={({ active, payload, label: l }: any) => active && payload?.length ? <div className="rounded-lg border border-line bg-panel px-3 py-2 text-[12px] shadow-pop"><b className="text-fg">Week {l}</b><div className="text-fg-muted tnum">{inr(payload[0].value)}</div></div> : null} />
                <Area type="monotone" dataKey="cpl" stroke={C.navy} strokeWidth={2.4} fill="url(#ccpl)" animationDuration={1000} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  )
}
