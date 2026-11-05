import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { C } from '@/lib/tokens'
import { inr, inrCompact, num } from '@/lib/utils'
import { useRange } from '@/lib/range'
import { useTenant } from '@/lib/tenant'
import type { Page } from '@/data/samurai'
import { KPI_METRICS, breakdownSeries, crmFieldValue, customIsMoney, customTrendSeries, kpiValue, metricMeta, trendSeries, type Metric, type Point } from '@/data/metrics'
import type { WidgetKind } from '@/data/dashboard'
import { connCtx } from './FunnelView'

/* Renders a user-built chart (trend / bar / donut / KPI) from a metric id, or from a custom field
   mapped to the CRM. Deterministic and reconciling — every value traces to the page's own totals;
   a custom field with no connected/synced source reads "connect" / "awaiting" rather than a guess. */

const PALETTE = [C.navy, C.brand, C.pos, '#8b5cf6', '#f59e0b', '#06b6d4']

function fmt(m: Metric | undefined, v: number): string {
  if (!m) return num(v)
  if (m.pct) return `${Math.round(v)}%`
  if (m.id === 'roas') return `${v}×`
  if (m.money) return inr(Math.round(v))
  return num(Math.round(v))
}
const fmtAxis = (m: Metric | undefined, v: number) => (m?.money ? inrCompact(v) : m?.pct ? `${Math.round(v)}%` : num(v))
const moneyMeta = (money: boolean): Metric => ({ id: '_c', label: '', money, group: '', source: 'crm' })

export function ChartView({ p, kind, source, customField, customLabel }: { p: Page; kind: WidgetKind; source?: string; customField?: string; customLabel?: string }) {
  const { factor: f } = useRange()
  const { tenant } = useTenant()
  if (!source) return <Empty>Pick the data for this chart to preview it.</Empty>
  const scale = (pts: Point[], m?: Metric) => (m?.ratio ? pts : pts.map((pt) => ({ ...pt, value: pt.value * f })))
  const custom = source === 'custom'
  const crmConnected = connCtx(p, tenant).crmConnected

  if (kind === 'kpi') {
    if (custom) {
      if (!crmConnected) return <Empty>Connect your CRM to show this field.</Empty>
      const raw = customField ? crmFieldValue(p, customField) : null
      if (raw == null) return <Empty>Awaiting sync — this field fills once your CRM syncs it.</Empty>
      const m = moneyMeta(customIsMoney(customField))
      return <Kpi value={fmt(m, raw * f)} label={customLabel || 'Custom field'} />
    }
    const m = metricMeta('kpi', source) ?? KPI_METRICS.find((x) => x.id === source)
    const raw = kpiValue(p, source)
    if (raw == null) return <Empty>No leads yet — {(m?.label ?? 'this').toLowerCase()} appears once this page has leads.</Empty>
    const v = m?.ratio ? raw : raw * f
    return <Kpi value={fmt(m, v)} label={m?.label ?? source} />
  }

  if (kind === 'trend') {
    const custMoney = customIsMoney(customField)
    const m = custom ? moneyMeta(custMoney) : metricMeta('trend', source)
    if (custom && !crmConnected) return <Empty>Connect your CRM to chart this over time.</Empty>
    const data = scale(custom ? (customField ? customTrendSeries(p, customField) : []) : trendSeries(p, source), m)
    if (data.length === 0) return <Empty>{custom ? 'Awaiting sync — no history for this field yet.' : 'No history yet for this metric.'}</Empty>
    return (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -6 }}>
          <defs><linearGradient id={`g-${source}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.navy} stopOpacity="0.16" /><stop offset="1" stopColor={C.navy} stopOpacity="0" /></linearGradient></defs>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.fgSubtle }} axisLine={false} tickLine={false} interval={1} />
          <YAxis domain={[0, 'auto']} allowDecimals={false} tickFormatter={(v) => fmtAxis(m, v)} tick={{ fontSize: 10, fill: C.fgSubtle }} axisLine={false} tickLine={false} width={46} />
          <Tooltip content={<Tip m={m} />} cursor={{ stroke: C.lineStrong, strokeDasharray: '4 4' }} />
          <Area type="monotone" dataKey="value" stroke={C.navy} strokeWidth={2.2} fill={`url(#g-${source})`} animationDuration={700} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  if (kind === 'bar') {
    const m = metricMeta('breakdown', source)
    const data = scale(breakdownSeries(p, source), m)
    if (data.length === 0) return <Empty>No breakdown available on this page.</Empty>
    return (
      <ResponsiveContainer width="100%" height={Math.max(140, data.length * 42 + 20)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 6 }}>
          <XAxis type="number" tickFormatter={(v) => fmtAxis(m, v)} tick={{ fontSize: 10, fill: C.fgSubtle }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: C.fgMuted }} axisLine={false} tickLine={false} width={96} />
          <Tooltip content={<Tip m={m} />} cursor={{ fill: C.sunken }} />
          <Bar dataKey="value" radius={[0, 5, 5, 0]} animationDuration={700} barSize={18}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (kind === 'donut') {
    const m = metricMeta('breakdown', source)
    if (m?.ratio) return <Empty>A split shows how one total divides up — it isn’t available for a rate like {m.label.toLowerCase()}. Use a bar chart to compare it across ads or devices.</Empty>
    const data = scale(breakdownSeries(p, source), m).filter((d) => d.value > 0)
    if (data.length === 0) return <Empty>No breakdown available on this page.</Empty>
    const total = data.reduce((a, b) => a + b.value, 0)
    return (
      <div className="flex flex-wrap items-center gap-5">
        <PieChart width={150} height={150}>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={46} outerRadius={68} paddingAngle={2} startAngle={90} endAngle={-270} stroke="none" animationDuration={700}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
        </PieChart>
        <div className="min-w-[150px] flex-1 space-y-1.5">
          {data.map((d, i) => (
            <div key={d.label} className="flex items-center gap-2 text-[12.5px]">
              <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="flex-1 truncate text-fg-muted">{d.label}</span>
              <span className="tnum font-semibold text-fg">{fmt(m, d.value)}</span>
              <span className="w-10 shrink-0 text-right text-[11px] text-fg-subtle">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center py-2 text-center">
      <div className="text-[40px] font-bold leading-none tracking-tight text-fg tnum">{value}</div>
      <div className="mt-2 text-[12.5px] text-fg-subtle">{label}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[120px] place-items-center rounded-[10px] bg-sunken px-3 py-8 text-center text-[12.5px] text-fg-subtle">{children}</div>
}

function Tip({ active, payload, m }: { active?: boolean; payload?: { payload: Point }[]; m?: Metric }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-[9px] border border-line bg-panel px-2.5 py-1.5 shadow-pop">
      <div className="text-[11px] text-fg-subtle">{d.label}</div>
      <div className="text-[13px] font-semibold text-fg tnum">{fmt(m, d.value)}</div>
    </div>
  )
}

export const chartTitleFor = (kind: WidgetKind, source: string): string => {
  if (source === 'custom') return 'Custom field'
  if (kind === 'kpi') return KPI_METRICS.find((x) => x.id === source)?.label ?? 'Metric'
  if (kind === 'trend') { const m = metricMeta('trend', source); return `${m?.label ?? 'Metric'} over time` }
  const m = metricMeta('breakdown', source)
  return m ? `${m.label} by ${source.endsWith('_device') ? 'device' : 'ad'}` : 'Breakdown'
}
