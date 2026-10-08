import { motion } from 'motion/react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { C } from '@/lib/tokens'
import { inr, inrCompact, num } from '@/lib/utils'
import { ecpl, VERDICT, goalVarOf, type Experiment } from '@/data/samurai'
import { buildMetricRows, expDaily, expFunnel, nvarDaily, nvarFunnel, type FunnelStage, type MetricRow } from '@/data/experiments'

const VHEX = C.series // per-version line/bar colors: navy, brand, green, amber, violet

const badgeTone: Record<string, string> = {
  pos: 'bg-pos-tint text-pos', navy: 'bg-navy-tint text-navy', neg: 'bg-neg-tint text-neg', warn: 'bg-warn-tint text-warn', neutral: 'bg-sunken text-fg-muted',
}

/* ---------------- verdict hero matchup ---------------- */
export function Matchup({ e }: { e: Experiment }) {
  const cc = ecpl(e.control)!
  const vc = ecpl(e.variant)!
  const better = vc < cc
  const dpct = Math.abs(Math.round(((vc - cc) / cc) * 100))
  const cConv = (e.control.leads / e.control.v) * 100
  const vConv = (e.variant.leads / e.variant.v) * 100
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="rounded-[12px] border border-line bg-sunken/50 p-4 text-center">
        <div className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">Control (A)</div>
        <div className="tnum mt-1 text-[26px] font-bold text-fg">{inr(cc)}</div>
        <div className="text-[11.5px] text-fg-subtle">{e.control.leads} leads · {cConv.toFixed(1)}%</div>
      </div>
      <div className="text-center">
        <div className={`tnum text-[18px] font-bold ${better ? 'text-pos' : 'text-neg'}`}>{better ? '▼' : '▲'} {dpct}%</div>
        <div className="text-[10.5px] text-fg-subtle">cost per lead</div>
      </div>
      <div className={`rounded-[12px] border p-4 text-center ${better ? 'border-pos/30 bg-pos-tint/50' : 'border-line bg-sunken/50'}`}>
        <div className={`text-[11px] font-medium uppercase tracking-wide ${better ? 'text-pos' : 'text-fg-subtle'}`}>Variant B</div>
        <div className={`tnum mt-1 text-[26px] font-bold ${better ? 'text-pos' : 'text-fg'}`}>{inr(vc)}</div>
        <div className="text-[11.5px] text-fg-subtle">{e.variant.leads} leads · {vConv.toFixed(1)}%</div>
      </div>
    </div>
  )
}

export function VerdictBadge({ e }: { e: Experiment }) {
  const vd = VERDICT[e.verdict]
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${badgeTone[vd.tone]}`}>{vd.word}</span>
      <span className="text-[13px] font-medium text-fg-muted">{vd.call}</span>
    </span>
  )
}

/* ---------------- funnels ---------------- */
export function MiniFunnels({ e }: { e: Experiment }) {
  const f = expFunnel(e)
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <FunnelCol label="Control (A)" stages={f.ctrl} tone="ctrl" />
      <FunnelCol label="Variant B" stages={f.var} tone="win" />
    </div>
  )
}
function FunnelCol({ label, stages, tone }: { label: string; stages: FunnelStage[]; tone: 'ctrl' | 'win' }) {
  return (
    <div>
      <div className="mb-2 text-[12px] font-semibold text-fg-muted">{label}</div>
      <div className="space-y-2.5">
        {stages.map((s, i) => (
          <div key={s.name}>
            <div className="h-2 overflow-hidden rounded-full bg-sunken">
              <motion.div className="h-full rounded-full" style={{ background: tone === 'win' ? C.pos : C.navy }} initial={{ width: 0 }} animate={{ width: `${Math.max(7, s.pct)}%` }} transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <div className="mt-1 text-[12px] text-fg-muted"><b className="tnum text-fg">{num(s.value)}</b> {s.name} <span className="text-fg-subtle">{s.pct}%</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
export function FunnelTable({ e }: { e: Experiment }) {
  const f = expFunnel(e)
  return (
    <ExpTable head={['Stage', 'Control (A)', 'Variant (B)', 'Lift']} align={['left', 'right', 'right', 'left']}>
      {f.ctrl.map((s, i) => {
        const b = f.var[i] ?? { value: 0, pct: 0 }
        const lift = s.value ? Math.round(((b.value - s.value) / s.value) * 100) : 0
        return (
          <tr key={s.name} className="border-b border-line last:border-0">
            <td className="px-3 py-2 text-left">{s.name}</td>
            <td className="px-3 py-2 text-right tnum">{num(s.value)} <span className="text-fg-subtle">{s.pct}%</span></td>
            <td className="px-3 py-2 text-right tnum"><b>{num(b.value)}</b> <span className="text-fg-subtle">{b.pct}%</span></td>
            <td className="px-3 py-2 text-left">{i === 0 ? '—' : <Upl d={lift} hb />}</td>
          </tr>
        )
      })}
    </ExpTable>
  )
}

/* ---------------- over time ---------------- */
export function ExpOverTimeChart({ e, height = 200 }: { e: Experiment; height?: number }) {
  const d = expDaily(e)
  const data = d.ctrl.map((c, i) => ({ day: i + 1, control: c, variant: d.var[i] }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke={C.line} />
        <XAxis dataKey="day" tickFormatter={(v) => `D${v}`} tick={{ fontSize: 11, fill: C.fgSubtle }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => inrCompact(v)} tick={{ fontSize: 11, fill: C.fgSubtle }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          cursor={{ stroke: C.lineStrong, strokeDasharray: '4 4' }}
          content={({ active, payload, label }: any) =>
            active && payload?.length ? (
              <div className="rounded-lg border border-line bg-panel px-3 py-2 text-[12px] shadow-pop">
                <div className="mb-1 font-semibold text-fg">Day {label}</div>
                <div className="text-fg-muted">Control <b className="tnum text-fg">{inr(payload[0].value)}</b></div>
                <div className="text-pos">Variant <b className="tnum">{inr(payload[1].value)}</b></div>
              </div>
            ) : null
          }
        />
        <Line type="monotone" dataKey="control" stroke={C.lineStrong} strokeWidth={2.2} strokeDasharray="5 4" dot={false} animationDuration={900} />
        <Line type="monotone" dataKey="variant" stroke={C.pos} strokeWidth={2.6} dot={false} animationDuration={1000} />
      </LineChart>
    </ResponsiveContainer>
  )
}
export function OverTimeTable({ e }: { e: Experiment }) {
  const d = expDaily(e)
  return (
    <ExpTable head={['Day', 'Control (A)', 'Variant (B)']} align={['left', 'right', 'right']}>
      {d.ctrl.map((v, i) => (
        <tr key={i} className="border-b border-line last:border-0">
          <td className="px-3 py-2 text-left font-medium">Day {i + 1}</td>
          <td className="px-3 py-2 text-right tnum">{inr(v)}</td>
          <td className="px-3 py-2 text-right tnum font-semibold">{inr(d.var[i])}</td>
        </tr>
      ))}
    </ExpTable>
  )
}

/* ---------------- evidence: diverging bars ---------------- */
const mfmt = (v: number, fmt: MetricRow['fmt']) => (fmt === 'inr' ? inr(v) : fmt === 'pct' ? v.toFixed(1) + '%' : num(v))
export function DivergingBars({ e }: { e: Experiment }) {
  const rows = buildMetricRows(e)
  return (
    <div>
      <div className="mb-3 flex justify-between text-[10.5px] uppercase tracking-wide text-fg-subtle"><span>worse</span><span>better</span></div>
      <div className="space-y-3.5">
        {rows.map((r, i) => {
          const better = r.hb ? r.v >= r.c : r.v <= r.c
          const mag = Math.abs(Math.round(((r.v - r.c) / (r.c || 1)) * 100))
          const phrase = r.hb ? (better ? `${mag}% higher` : `${mag}% lower`) : (better ? `${mag}% cheaper` : `${mag}% dearer`)
          const w = Math.min(48, Math.max(2, mag))
          return (
            <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div>
                <div className="text-[13px] font-medium text-fg">
                  {r.label}
                  {r.goal && <span className="ml-1.5 rounded bg-navy-tint px-1.5 py-0.5 text-[9px] font-bold text-navy">GOAL</span>}
                </div>
                <div className="text-[11.5px] text-fg-subtle tnum">{mfmt(r.c, r.fmt)} → {mfmt(r.v, r.fmt)}</div>
                <div className="relative mt-1.5 h-4 rounded bg-sunken">
                  <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-line-strong" />
                  <motion.i
                    className={`absolute top-0.5 bottom-0.5 rounded ${better ? 'bg-pos' : 'bg-neg'}`}
                    style={better ? { left: '50%' } : { right: '50%' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${w}%` }}
                    transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
              <div className={`text-[12px] font-semibold ${better ? 'text-pos' : 'text-neg'}`}>{better ? '▲' : '▼'} {phrase}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
export function MetricTable({ e }: { e: Experiment }) {
  const rows = buildMetricRows(e)
  return (
    <ExpTable head={['Metric', 'Control (A)', 'Variant (B)', 'Change']} align={['left', 'right', 'right', 'left']}>
      {rows.map((r, i) => {
        const better = r.hb ? r.v >= r.c : r.v <= r.c
        const d = Math.round(((r.v - r.c) / (r.c || 1)) * 100)
        return (
          <tr key={i} className="border-b border-line last:border-0">
            <td className="px-3 py-2 text-left">{r.label}{r.goal && <span className="ml-1.5 rounded bg-navy-tint px-1.5 py-0.5 text-[9px] font-bold text-navy">GOAL</span>}</td>
            <td className="px-3 py-2 text-right tnum">{mfmt(r.c, r.fmt)}</td>
            <td className="px-3 py-2 text-right tnum font-semibold">{mfmt(r.v, r.fmt)}</td>
            <td className="px-3 py-2 text-left"><span className={`text-[12px] font-semibold ${better ? 'text-pos' : 'text-neg'}`}>{d > 0 ? '+' : ''}{d}%</span></td>
          </tr>
        )
      })}
    </ExpTable>
  )
}

/* ---------------- shared ---------------- */
function ExpTable({ head, align, children }: { head: string[]; align: ('left' | 'right')[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-line">
      <table className="w-full text-[12.5px]">
        <thead className="border-b border-line bg-surface/60 text-fg-subtle">
          <tr>{head.map((h, i) => <th key={h} className={`px-3 py-2 font-medium ${align[i] === 'right' ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr>
        </thead>
        <tbody className="text-fg">{children}</tbody>
      </table>
    </div>
  )
}
export function Upl({ d, hb }: { d: number; hb?: boolean }) {
  const good = hb ? d >= 0 : d <= 0
  return <span className={`text-[12px] font-semibold ${good ? 'text-pos' : 'text-neg'}`}>{d > 0 ? '+' : ''}{d}%</span>
}

/* ---------------- N-variant (A vs B vs C…) funnel + over-time ---------------- */
export function NVarFunnels({ e }: { e: Experiment }) {
  const cols = nvarFunnel(e)
  const goalName = goalVarOf(e)?.name
  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cols.map((col, ci) => (
          <div key={col.letter}>
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-fg-muted">
              <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: VHEX[ci % VHEX.length] }} />
              <span className="truncate">Version {col.letter} · {col.name}</span>
            </div>
            <div className="space-y-2.5">
              {col.stages.map((s, i) => (
                <div key={s.name}>
                  <div className="h-2 overflow-hidden rounded-full bg-sunken">
                    <motion.div className="h-full rounded-full" style={{ background: VHEX[ci % VHEX.length], opacity: i === col.stages.length - 1 ? 1 : 0.55 + (i / col.stages.length) * 0.4 }} initial={{ width: 0 }} animate={{ width: `${Math.max(6, s.pct)}%` }} transition={{ duration: 0.7, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                  <div className="mt-1 text-[12px] text-fg-muted"><b className="tnum text-fg">{num(s.value)}</b> {s.name} <span className="text-fg-subtle">{s.pct}%</span></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-fg-subtle">Each version's own visitors down to <b className="text-fg-muted">{goalName ?? 'the goal'}</b> (the last bar). Stages are your signals, ordered by volume, so the columns line up across versions that are otherwise different pages.</p>
    </div>
  )
}

export function NVarOverTimeChart({ e, height = 200 }: { e: Experiment; height?: number }) {
  const d = nvarDaily(e)
  const data = Array.from({ length: d.n }, (_, i) => {
    const row: Record<string, number> = { day: i + 1 }
    d.series.forEach((s) => { row[s.letter] = s.data[i] })
    return row
  })
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke={C.line} />
        <XAxis dataKey="day" tickFormatter={(v) => `D${v}`} tick={{ fontSize: 11, fill: C.fgSubtle }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => inrCompact(v)} tick={{ fontSize: 11, fill: C.fgSubtle }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          cursor={{ stroke: C.lineStrong, strokeDasharray: '4 4' }}
          content={({ active, payload, label }: any) =>
            active && payload?.length ? (
              <div className="rounded-lg border border-line bg-panel px-3 py-2 text-[12px] shadow-pop">
                <div className="mb-1 font-semibold text-fg">Day {label}</div>
                {payload.map((pl: any) => (
                  <div key={pl.dataKey} className="flex items-center gap-1.5 text-fg-muted"><i className="h-2 w-2 rounded-full" style={{ background: pl.color }} /> Version {pl.dataKey} <b className="tnum text-fg">{inr(pl.value)}</b></div>
                ))}
              </div>
            ) : null
          }
        />
        {d.series.map((s, i) => (
          <Line key={s.letter} type="monotone" dataKey={s.letter} stroke={VHEX[i % VHEX.length]} strokeWidth={2.4} dot={false} animationDuration={900} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function TimingBar({ pct, caption }: { pct: number; caption: string }) {
  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
        <motion.div className="h-full rounded-full bg-navy" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <p className="mt-2 text-[12.5px] text-fg-muted">{caption}</p>
    </div>
  )
}
