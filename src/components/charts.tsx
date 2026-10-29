import { motion } from 'motion/react'
import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { C } from '@/lib/tokens'
import { inr, inrCompact, num } from '@/lib/utils'
import {
  ACCOUNT,
  CAMPAIGNS,
  QUARTER,
  confirmedLeak,
  cplTrend,
  leakTotal,
  PAGES,
  platformStats,
  type Page,
} from '@/data/samurai'
import { pageWeekly } from '@/data/pages'

/* ---------------- Sparkline (custom SVG, draws in) ---------------- */
export function Sparkline({ data, tone = 'navy', w = 120, h = 34 }: { data: number[]; tone?: 'navy' | 'pos' | 'neg'; w?: number; h?: number }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const pad = 3
  const x = (i: number) => (i * (w - 2)) / (data.length - 1) + 1
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (h - 2 * pad)
  const d = data.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const col = tone === 'pos' ? C.pos : tone === 'neg' ? C.neg : C.navy
  const id = 'sp' + useId().replace(/:/g, '')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={col} stopOpacity="0.18" />
          <stop offset="1" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${id})`} />
      <motion.path
        d={d}
        fill="none"
        stroke={col}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  )
}

/* ---------------- CPL trend (Recharts area with winner markers) ---------------- */
function TrendTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-panel px-3 py-2 text-[12px] shadow-pop">
      <div className="mb-1 font-semibold text-fg">Week {p.week}</div>
      <div className="flex flex-col gap-0.5 text-fg-muted">
        <span>
          CPL <b className="tnum text-fg">{inr(p.cpl)}</b>
        </span>
        <span>
          Spend <span className="tnum">{inr(p.spend)}</span> · Leads <span className="tnum">{num(p.leads)}</span>
        </span>
        {p.ships > 0 && <span className="text-brand">{p.ships} winners shipped</span>}
      </div>
    </div>
  )
}

export function CplTrendChart({ height = 220 }: { height?: number }) {
  const data = cplTrend()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 16, right: 10, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="cplFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.navy} stopOpacity="0.16" />
            <stop offset="1" stopColor={C.navy} stopOpacity="0" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={C.line} strokeWidth={1} />
        <XAxis dataKey="week" tickFormatter={(w) => `W${w}`} tick={{ fontSize: 11, fill: C.fgSubtle }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v) => inrCompact(v)}
          tick={{ fontSize: 11, fill: C.fgSubtle }}
          axisLine={false}
          tickLine={false}
          width={48}
          domain={['dataMin - 200', 'dataMax + 200']}
        />
        <Tooltip content={<TrendTip />} cursor={{ stroke: C.lineStrong, strokeDasharray: '4 4' }} />
        <Area
          type="monotone"
          dataKey="cpl"
          stroke={C.navy}
          strokeWidth={2.4}
          fill="url(#cplFill)"
          animationDuration={1100}
          animationEasing="ease-out"
          dot={false}
        />
        {data
          .filter((d) => d.ships > 0)
          .map((d) => (
            <ReferenceDot
              key={d.week}
              x={d.week}
              y={d.cpl}
              r={4}
              fill="#fff"
              stroke={C.brand}
              strokeWidth={2}
            />
          ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ---------------- Ring gauge (custom SVG + motion) ---------------- */
export function RingGauge({
  value,
  size = 108,
  label,
  sub,
  color = C.navy,
}: {
  value: number
  size?: number
  label?: string
  sub?: string
  color?: string
}) {
  const r = size / 2 - 9
  const c = 2 * Math.PI * r
  return (
    <div className="flex items-center gap-3.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.sunken} strokeWidth={9} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="tnum" fontSize={size * 0.2} fontWeight={700} fill={C.fg}>
          {value}%
        </text>
      </svg>
      {(label || sub) && (
        <div>
          {label && <div className="text-[13px] font-semibold text-fg">{label}</div>}
          {sub && <div className="text-[12px] text-fg-subtle">{sub}</div>}
        </div>
      )}
    </div>
  )
}

/* ---------------- Spend-split bar (working / likely / confirmed) ---------------- */
export function SpendSplitBar() {
  const total = ACCOUNT.spend
  const confirmed = confirmedLeak()
  const likely = leakTotal() - confirmed
  const working = total - leakTotal()
  const segs = [
    { label: 'Working', value: working, color: C.navy },
    { label: 'Likely leak', value: likely, color: C.warn },
    { label: 'Confirmed leak', value: confirmed, color: C.neg },
  ]
  return (
    <div>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-sunken">
        {segs.map((s, i) => (
          <motion.div
            key={s.label}
            className="h-full"
            style={{ background: s.color }}
            initial={{ width: 0 }}
            animate={{ width: `${(s.value / total) * 100}%` }}
            transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-fg-muted">
        {segs.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
            {s.label} · <b className="tnum text-fg">{inr(s.value)}</b>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Dumbbell (control vs variant CPL) ---------------- */
export function Dumbbell({ control, variant, aLabel = 'Control', bLabel = 'Variant B' }: { control: number; variant: number; aLabel?: string; bLabel?: string }) {
  const better = variant < control
  const lo = Math.min(control, variant)
  const hi = Math.max(control, variant)
  const pad = (hi - lo) * 0.9 + 40
  const min = lo - pad
  const max = hi + pad
  const W = 520
  const padX = 66
  const axis = 46
  const x = (v: number) => padX + ((v - min) / (max - min)) * (W - 2 * padX)
  const col = better ? C.pos : C.neg
  const delta = Math.round(((variant - control) / control) * 100)
  return (
    <div>
      <svg viewBox={`0 0 ${W} 84`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <line x1={padX} y1={axis} x2={W - padX} y2={axis} stroke={C.line} strokeWidth={2} />
        <motion.line
          x1={x(control)} y1={axis} x2={x(control)} y2={axis}
          stroke={col} strokeWidth={3}
          animate={{ x2: x(variant) }}
          initial={{ x2: x(control) }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        <circle cx={x(control)} cy={axis} r={7} fill="#fff" stroke={C.lineStrong} strokeWidth={3} />
        <motion.circle cx={x(control)} cy={axis} r={7} fill={col} animate={{ cx: x(variant) }} initial={{ cx: x(control) }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
        <text x={x(control)} y={axis - 14} textAnchor="middle" fontSize={11} fill={C.fgSubtle}>{aLabel}</text>
        <text x={x(control)} y={axis + 22} textAnchor="middle" fontSize={12.5} fontWeight={700} className="tnum" fill={C.fgMuted}>{inr(control)}</text>
        <text x={x(variant)} y={axis - 14} textAnchor="middle" fontSize={11} fontWeight={600} fill={col}>{bLabel}</text>
        <text x={x(variant)} y={axis + 22} textAnchor="middle" fontSize={12.5} fontWeight={700} className="tnum" fill={col}>{inr(variant)}</text>
      </svg>
      <div className="text-center text-[12px] text-fg-muted">
        <b style={{ color: col }}>{delta > 0 ? '+' : ''}{delta}%</b> cost per lead — left is cheaper
      </div>
    </div>
  )
}

/* ---------------- Platform split (Recharts donut + compare) ---------------- */
export function PlatformSplit() {
  const s = platformStats()
  const data = [
    { name: 'Google', value: s.google.spend, color: C.navy },
    { name: 'Meta', value: s.meta.spend, color: C.brand },
  ]
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <PieChart width={140} height={140}>
          <Pie data={data} dataKey="value" innerRadius={44} outerRadius={64} paddingAngle={2} startAngle={90} endAngle={-270} animationDuration={900} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wide text-fg-subtle">Meta vs Google</span>
          <span className="tnum text-[19px] font-bold text-fg">{s.ratio}×</span>
        </div>
      </div>
      <div className="flex-1 space-y-2.5 text-[13px]">
        <PlatRow label="Google" spend={s.google.spend} leads={s.google.leads} cpl={s.google.cpl} color={C.navy} good />
        <PlatRow label="Meta" spend={s.meta.spend} leads={s.meta.leads} cpl={s.meta.cpl} color={C.brand} />
      </div>
    </div>
  )
}
function PlatRow({ label, spend, leads, cpl, color, good }: { label: string; spend: number; leads: number; cpl: number; color: string; good?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-2 font-medium text-fg" style={{ minWidth: 74 }}>
        <i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="tnum text-fg-muted">{inr(spend)}</span>
      <span className="tnum text-fg-subtle">{num(leads)} leads</span>
      <span className={`ml-auto tnum font-semibold ${good ? 'text-pos' : 'text-neg'}`}>{inr(cpl)}/lead</span>
    </div>
  )
}

/* ---------------- Funnel chain (spend → click → visit → lead → CPL) ---------------- */
export function FunnelChain({ pageId }: { pageId: string }) {
  const p = PAGES.find((x) => x.id === pageId)
  if (!p) return null
  const nodes = [
    { v: inr(p.spend), l: 'Spend' },
    { v: num(p.clicks), l: 'Clicks' },
    { v: num(p.visits), l: 'Visits' },
    { v: num(p.leads), l: 'Leads' },
    { v: p.cpl ? inr(p.cpl) : '—', l: 'CPL', final: true },
  ]
  return (
    <div className="flex items-stretch gap-1.5 overflow-x-auto">
      {nodes.map((n, i) => (
        <div key={n.l} className="flex items-center gap-1.5">
          <motion.div
            className={`min-w-[84px] rounded-[10px] border px-3 py-2.5 text-center ${n.final ? 'border-brand/30 bg-brand-tint' : 'border-line bg-sunken'}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
          >
            <div className={`tnum text-[15px] font-bold ${n.final ? 'text-brand' : 'text-fg'}`}>{n.v}</div>
            <div className="mt-0.5 text-[11px] text-fg-subtle">{n.l}</div>
          </motion.div>
          {i < nodes.length - 1 && <span className="text-fg-subtle">→</span>}
        </div>
      ))}
    </div>
  )
}

/* ---------------- CPL-by-page bars (diverging from blended) ---------------- */
export function CplBars({ pages }: { pages: Page[] }) {
  const maxCpl = Math.max(...pages.map((p) => p.cpl ?? 0))
  return (
    <div className="space-y-2">
      {pages.map((p, i) => {
        const cpl = p.cpl ?? 0
        const hi = cpl > ACCOUNT.cpl
        return (
          <div key={p.id} className="flex items-center gap-3 text-[12.5px]">
            <span className="w-28 shrink-0 truncate font-medium text-fg">{p.name}</span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-sunken">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-md"
                style={{ background: hi ? C.neg : C.pos, opacity: 0.16 }}
                initial={{ width: 0 }}
                animate={{ width: `${(cpl / maxCpl) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className={`tnum w-16 text-right font-semibold ${hi ? 'text-neg' : 'text-pos'}`}>{inr(cpl)}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- Per-page CPL trend (weekly, with a ship marker) ---------------- */
export function PageCplChart({ pageId, height = 220 }: { pageId: string; height?: number }) {
  const p = PAGES.find((x) => x.id === pageId)
  if (!p) return null
  const wk = pageWeekly(p)
  const data = wk.cpl.map((c, i) => ({ week: i + 1, cpl: c, spend: wk.spend[i], leads: wk.leads[i], ship: i === wk.shipWeek }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 16, right: 10, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id={`pg${pageId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.navy} stopOpacity="0.16" />
            <stop offset="1" stopColor={C.navy} stopOpacity="0" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={C.line} />
        <XAxis dataKey="week" tickFormatter={(w) => `W${w}`} tick={{ fontSize: 11, fill: C.fgSubtle }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => inrCompact(v)} tick={{ fontSize: 11, fill: C.fgSubtle }} axisLine={false} tickLine={false} width={48} domain={['dataMin - 150', 'dataMax + 150']} />
        <Tooltip content={<TrendTip />} cursor={{ stroke: C.lineStrong, strokeDasharray: '4 4' }} />
        <Area type="monotone" dataKey="cpl" stroke={C.navy} strokeWidth={2.4} fill={`url(#pg${pageId})`} animationDuration={1000} dot={false} />
        {wk.shipWeek >= 0 && <ReferenceDot x={wk.shipWeek + 1} y={data[wk.shipWeek].cpl} r={4} fill="#fff" stroke={C.brand} strokeWidth={2} />}
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ---------------- Zero-lead campaign list (for "cut") ---------------- */
export function CutList() {
  const zero = CAMPAIGNS.filter((c) => c.leads === 0)
  return (
    <div className="divide-y divide-line">
      {zero.map((c, i) => (
        <motion.div
          key={c.id}
          className="flex items-center gap-3 py-2.5"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <span className="rounded bg-neg-tint px-1.5 py-0.5 text-[10.5px] font-semibold text-neg">0 leads</span>
          <div className="flex-1">
            <div className="text-[13px] font-medium text-fg">{c.name}</div>
            <div className="text-[11.5px] text-fg-subtle tnum">
              {inr(c.spend)} spent · {num(c.clicks)} clicks · no leads
            </div>
          </div>
          <span className="tnum text-[14px] font-bold text-fg">{inr(c.spend)}</span>
        </motion.div>
      ))}
    </div>
  )
}
