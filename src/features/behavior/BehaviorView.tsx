import { motion } from 'motion/react'
import { Activity, ArrowUpRight, Gauge, MousePointerClick, MousePointer2, Play, ScrollText, Timer, TriangleAlert, Zap } from 'lucide-react'
import { useState } from 'react'
import { useNav } from '@/lib/nav'
import { Card, SectionHead } from '@/components/ui'
import { cn, num } from '@/lib/utils'
import { C } from '@/lib/tokens'
import { PAGES, goalVarOf, isNVar, type Experiment, type ExpVariant, type Page } from '@/data/samurai'
import { expBehavior, openBehavior, pageBehavior, type BehMetric, type BehSession, type Device, type ElEngagement, type ExpArm, type ExpBehaviorData, type PageBehavior } from '@/data/behavior'
import { expPage } from '@/data/experiments'
import { SessionReplayModal } from './SessionReplay'

const r2 = (n: number) => Math.round(n)
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const fmtSec = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`)

/** blue → teal → amber → red heat ramp */
function heat(t: number) {
  const stops = [[37, 99, 235], [16, 185, 129], [245, 158, 11], [224, 54, 28]]
  const x = clamp(t, 0, 1) * (stops.length - 1)
  const i = Math.floor(x)
  const f = x - i
  const a = stops[i]
  const b = stops[Math.min(i + 1, stops.length - 1)]
  return `rgb(${r2(a[0] + (b[0] - a[0]) * f)},${r2(a[1] + (b[1] - a[1]) * f)},${r2(a[2] + (b[2] - a[2]) * f)})`
}

type Mode = 'clicks' | 'scroll' | 'attention' | 'rage'

export function BehaviorView({ p }: { p: Page }) {
  const beh = pageBehavior(p)
  return (
    <div className="space-y-5">
      {/* summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<MousePointer2 className="h-4 w-4" />} label="Sessions" value={num(beh.sessions)} tone="navy" />
        <Stat icon={<Timer className="h-4 w-4" />} label="Avg active time" value={fmtSec(beh.engagement.activeSec)} tone="navy" />
        <Stat icon={<ScrollText className="h-4 w-4" />} label="Reach the form" value={`${beh.scroll.formReachPct}%`} tone={beh.scroll.formReachPct >= 55 ? 'pos' : 'warn'} />
        <Stat icon={<Zap className="h-4 w-4" />} label="Friction score" value={`${beh.friction.score}`} tone={beh.friction.score >= 60 ? 'neg' : beh.friction.score >= 35 ? 'warn' : 'pos'} sub={beh.friction.score >= 60 ? 'high' : beh.friction.score >= 35 ? 'watch' : 'low'} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
        <InteractionMap p={p} beh={beh} />
        <div className="space-y-5">
          <ScrollDepth beh={beh} />
          <JourneyFunnel beh={beh} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FrictionPanel p={p} beh={beh} />
        <DeviceSplit p={p} beh={beh} />
      </div>

      <SessionList beh={beh} p={p} />
    </div>
  )
}

function Stat({ icon, label, value, tone, sub }: { icon: React.ReactNode; label: string; value: string; tone: 'navy' | 'pos' | 'warn' | 'neg'; sub?: string }) {
  const toneCls = { navy: 'text-navy', pos: 'text-pos', warn: 'text-warn', neg: 'text-neg' }[tone]
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-fg-muted"><span className={toneCls}>{icon}</span>{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5"><span className="tnum text-[20px] font-bold tracking-tight text-fg">{value}</span>{sub && <span className={cn('text-[11px] font-semibold', toneCls)}>{sub}</span>}</div>
    </Card>
  )
}

/* ---------------- Interaction map (heat overlay on the landing render) ---------------- */
const MODES: { k: Mode; label: string; icon: React.ReactNode }[] = [
  { k: 'clicks', label: 'Clicks', icon: <MousePointerClick className="h-3.5 w-3.5" /> },
  { k: 'scroll', label: 'Scroll', icon: <ScrollText className="h-3.5 w-3.5" /> },
  { k: 'attention', label: 'Attention', icon: <Activity className="h-3.5 w-3.5" /> },
  { k: 'rage', label: 'Rage', icon: <Zap className="h-3.5 w-3.5" /> },
]

function InteractionMap({ p, beh }: { p: Page; beh: PageBehavior }) {
  const [mode, setMode] = useState<Mode>('clicks')
  const [device, setDevice] = useState<Device>('desktop')
  const el = (k: string) => beh.elements.find((e) => e.k === k)!
  const maxClicks = Math.max(...beh.elements.map((e) => e.clicks), 1)
  const maxRage = Math.max(...beh.elements.map((e) => e.rage), 1)
  const brokenMobile = p.fault === 'broken_form' && device === 'mobile'

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[13px] font-semibold text-fg">Interaction map</div>
          <div className="text-[11.5px] text-fg-subtle">where {num(beh.sessions)} sessions clicked, scrolled &amp; got stuck</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Seg options={MODES.map((m) => ({ k: m.k, label: m.label, icon: m.icon }))} value={mode} onChange={(v) => setMode(v as Mode)} />
        </div>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <Seg options={[{ k: 'desktop', label: 'Desktop' }, { k: 'mobile', label: 'Mobile' }, { k: 'tablet', label: 'Tablet' }]} value={device} onChange={(v) => setDevice(v as Device)} small />
        <Legend mode={mode} />
      </div>

      {/* browser frame */}
      <div className="overflow-hidden rounded-[12px] border border-line-strong shadow-sm">
        <div className="flex items-center gap-2 border-b border-line bg-sunken px-3 py-2">
          <span className="flex gap-1"><i className="h-2.5 w-2.5 rounded-full bg-line-strong" /><i className="h-2.5 w-2.5 rounded-full bg-line-strong" /><i className="h-2.5 w-2.5 rounded-full bg-line-strong" /></span>
          <span className="flex-1 truncate rounded-md bg-panel px-2.5 py-1 text-center text-[11px] text-fg-subtle">pages.onlinejain.com{p.path}</span>
        </div>
        <div className="relative bg-panel">
          {/* scroll gradient rail */}
          {mode === 'scroll' && <ScrollRail beh={beh} />}
          <div className={cn('relative mx-auto transition-all', device === 'mobile' ? 'max-w-[300px]' : device === 'tablet' ? 'max-w-[520px]' : 'max-w-none', mode === 'attention' && 'grayscale-[0.35]')}>
            {/* nav */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-fg"><span className="grid h-4 w-4 place-items-center rounded-[4px] bg-brand"><i className="h-1.5 w-1.5 rounded-full bg-white" /></span>JAIN Online</span>
              <span className="hidden gap-4 text-[11px] text-fg-subtle sm:flex"><span>Programmes</span><span>Fees</span><span>About</span></span>
            </div>
            {/* hero */}
            <div className={cn('grid gap-5 px-5 py-6', device === 'desktop' && 'md:grid-cols-[1.3fr_1fr]')}>
              <div>
                <span className="inline-block rounded-full bg-pos-tint px-2 py-0.5 text-[10px] font-semibold text-pos">UGC-entitled · NAAC A++</span>
                <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-tight text-fg">{p.group === 'Other' ? 'Online degrees' : p.name}</h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">Learn from India's #1 ranked online university. 100% online, industry-aligned, placement support.</p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <HeatEl e={el('apply')} mode={mode} maxClicks={maxClicks} maxRage={maxRage}>
                    <span className="inline-flex items-center rounded-[9px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white">Apply Now →</span>
                  </HeatEl>
                  <HeatEl e={el('prospectus')} mode={mode} maxClicks={maxClicks} maxRage={maxRage}>
                    <span className="inline-flex items-center rounded-[9px] border border-line-strong px-4 py-2.5 text-[13px] font-semibold text-fg">Download prospectus</span>
                  </HeatEl>
                </div>
              </div>
              {/* form card */}
              <div className={cn('relative rounded-[12px] border bg-sunken/50 p-4', brokenMobile ? 'border-neg' : 'border-line')}>
                <div className="mb-2.5 text-[13px] font-semibold text-fg">Get a call back</div>
                <div className="space-y-2">
                  <div className="rounded-[8px] border border-line bg-panel px-3 py-2 text-[12px] text-fg-subtle">Full name</div>
                  <div className="rounded-[8px] border border-line bg-panel px-3 py-2 text-[12px] text-fg-subtle">Phone number</div>
                </div>
                <HeatEl e={el('form')} mode={mode} maxClicks={maxClicks} maxRage={maxRage} block>
                  <div className="mt-2.5 rounded-[8px] bg-navy py-2.5 text-center text-[12.5px] font-semibold text-white">Submit enquiry</div>
                </HeatEl>
                {brokenMobile && <div className="mt-2 flex items-center gap-1.5 rounded-[8px] bg-neg-tint px-2 py-1.5 text-[11px] font-medium text-neg"><TriangleAlert className="h-3.5 w-3.5" /> Form fails to submit below 380px</div>}
              </div>
            </div>
            {/* footer */}
            <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
              <HeatEl e={el('whatsapp')} mode={mode} maxClicks={maxClicks} maxRage={maxRage}>
                <span className="inline-flex items-center rounded-full border border-line px-3 py-1.5 text-[12px] font-medium text-fg-muted">WhatsApp enquiry</span>
              </HeatEl>
              <HeatEl e={el('call')} mode={mode} maxClicks={maxClicks} maxRage={maxRage}>
                <span className="inline-flex items-center rounded-full border border-line px-3 py-1.5 text-[12px] font-medium text-fg-muted">Call 1800-XXX</span>
              </HeatEl>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-fg-subtle">
        {mode === 'clicks' && 'Boxes show real clicks anchored to each element — hottest in red.'}
        {mode === 'scroll' && `The rail shows how far people scroll: ${beh.scroll.formReachPct}% reach the form, ${beh.scroll.reach.p100}% reach the footer.`}
        {mode === 'attention' && 'Warmer elements held more cursor attention as visitors moved through the page.'}
        {mode === 'rage' && (beh.friction.worstEl ? `Rage clicks concentrate on ${beh.elements.find((e) => e.k === beh.friction.worstEl)?.label} — repeated frustrated clicks.` : 'Little rage clicking — the page responds as people expect.')}
      </p>
    </Card>
  )
}

function HeatEl({ e, mode, maxClicks, maxRage, children, block }: { e: ElEngagement; mode: Mode; maxClicks: number; maxRage: number; children: React.ReactNode; block?: boolean }) {
  if (mode === 'scroll') return <div className={cn('relative', block && 'w-full')}>{children}</div>
  const rageMode = mode === 'rage'
  const t = rageMode ? (maxRage ? e.rage / maxRage : 0) : maxClicks ? e.clicks / maxClicks : 0
  const show = rageMode ? e.rage > 0 : e.clicks > 0
  if (!show) return <div className={cn('relative opacity-60', block && 'w-full')}>{children}</div>
  const color = rageMode ? 'rgb(207,53,32)' : heat(t)
  const label = rageMode ? `${num(e.rage)}⚡` : num(e.clicks)
  return (
    <div className={cn('relative', block && 'w-full')}>
      {mode === 'attention'
        ? <div className="pointer-events-none absolute -inset-2 rounded-[14px] blur-md" style={{ background: color, opacity: 0.16 + t * 0.4 }} />
        : <div className="pointer-events-none absolute -inset-0.5 rounded-[11px]" style={{ boxShadow: `0 0 0 2px ${color}`, background: `${color}1f`, opacity: 0.5 + t * 0.5 }} />}
      <div className="relative">{children}</div>
      {mode !== 'attention' && <span className="absolute -right-2 -top-2 z-10 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold text-white shadow-sm" style={{ background: color }}>{label}</span>}
    </div>
  )
}

function ScrollRail({ beh }: { beh: PageBehavior }) {
  const { reach, formReachPct, foldPct } = beh.scroll
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1.5">
      <div className="h-full w-full" style={{ background: `linear-gradient(to bottom, ${heat(reach.p25 / 100)} 0%, ${heat(reach.p50 / 100)} 40%, ${heat(reach.p75 / 100)} 70%, ${heat(reach.p100 / 100)} 100%)` }} />
      <div className="absolute left-0 w-6 border-t border-dashed border-fg/40" style={{ top: `${foldPct}%` }}><span className="absolute left-7 -top-2 whitespace-nowrap rounded bg-fg px-1 py-0.5 text-[8.5px] font-semibold text-white">fold</span></div>
      <div className="absolute left-0 w-6 border-t border-dashed border-navy/50" style={{ top: `${clamp(formReachPct, 20, 92)}%` }} />
    </div>
  )
}

function Legend({ mode }: { mode: Mode }) {
  if (mode === 'rage') return <span className="text-[10.5px] text-fg-subtle">⚡ = frustrated clicks</span>
  if (mode === 'scroll') return <span className="inline-flex items-center gap-1 text-[10.5px] text-fg-subtle">less<span className="h-2 w-14 rounded-full" style={{ background: 'linear-gradient(90deg,rgb(37,99,235),rgb(16,185,129),rgb(245,158,11),rgb(224,54,28))' }} />more</span>
  return <span className="inline-flex items-center gap-1 text-[10.5px] text-fg-subtle">cold<span className="h-2 w-14 rounded-full" style={{ background: 'linear-gradient(90deg,rgb(37,99,235),rgb(16,185,129),rgb(245,158,11),rgb(224,54,28))' }} />hot</span>
}

/* ---------------- Scroll depth ---------------- */
function ScrollDepth({ beh }: { beh: PageBehavior }) {
  const rows = [
    { label: 'Top of page', pct: 100 },
    { label: 'Below the fold', pct: beh.scroll.reach.p25 },
    { label: 'Mid-page', pct: beh.scroll.reach.p50 },
    { label: 'The form', pct: beh.scroll.formReachPct, mark: true },
    { label: 'Footer', pct: beh.scroll.reach.p100 },
  ]
  return (
    <Card className="p-4">
      <SectionHead title="Scroll depth" hint="how far visitors get" />
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-[12px]">
            <span className={cn('w-24 shrink-0', r.mark ? 'font-semibold text-navy' : 'text-fg-muted')}>{r.label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-sunken">
              <motion.i className="block h-full rounded-full" style={{ background: heat(r.pct / 100) }} initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <b className="tnum w-9 text-right text-fg">{r.pct}%</b>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ---------------- On-page journey funnel ---------------- */
function JourneyFunnel({ beh }: { beh: PageBehavior }) {
  const steps = beh.journey
  return (
    <Card className="p-4">
      <SectionHead title="On-page journey" hint="where the drop-offs are" />
      <div className="space-y-1.5">
        {steps.map((s, i) => {
          const prev = i > 0 ? steps[i - 1].count : s.count
          const dropFromPrev = prev > 0 ? r2(((prev - s.count) / prev) * 100) : 0
          return (
            <div key={s.k}>
              {i > 0 && (
                <div className="flex items-center gap-2 py-0.5 pl-[120px] text-[10.5px] text-fg-subtle">
                  <Timer className="h-3 w-3" /> {s.avgSecFromPrev}s
                  {dropFromPrev > 0 && <span className="font-medium text-neg">▼ {dropFromPrev}% drop</span>}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={cn('w-28 shrink-0 truncate text-[11.5px]', s.k === 'submit' ? 'font-semibold text-pos' : 'font-medium text-fg')}>{s.label}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-sunken">
                  <motion.i className={cn('block h-full rounded', s.k === 'submit' ? 'bg-pos' : 'bg-navy')} initial={{ width: 0 }} animate={{ width: `${clamp(s.pct, 1.5, 100)}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
                </div>
                <div className="w-16 shrink-0 text-right"><b className="tnum text-[12px] text-fg">{num(s.count)}</b><span className="ml-1 text-[10px] text-fg-subtle">{s.pct}%</span></div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
        {beh.branches.map((b) => <span key={b.k} className="inline-flex items-center gap-1 rounded-md border border-line bg-sunken px-1.5 py-0.5 text-[10.5px] text-fg-muted">{b.label} <b className="tnum text-fg">{num(b.count)}</b></span>)}
      </div>
    </Card>
  )
}

/* ---------------- Friction ---------------- */
function FrictionPanel({ p, beh }: { p: Page; beh: PageBehavior }) {
  const f = beh.friction
  const worst = f.worstEl ? beh.elements.find((e) => e.k === f.worstEl) : undefined
  const tiles = [
    { label: 'Rage clicks', value: f.rageClicks, bad: f.rageClicks > beh.sessions * 0.04 },
    { label: 'Dead clicks', value: f.deadClicks, bad: f.deadClicks > beh.sessions * 0.03 },
    { label: 'Quick-backs', value: f.quickBacks, bad: f.quickBacks > beh.sessions * 0.12 },
    { label: 'JS errors', value: f.jsErrors, bad: f.jsErrors > 10 },
  ]
  return (
    <Card className="p-4">
      <SectionHead title="Friction signals" hint="frustration, the way Clarity & FullStory flag it" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className={cn('rounded-[10px] border px-2.5 py-2', t.bad ? 'border-neg/25 bg-neg-tint/40' : 'border-line')}>
            <div className="tnum text-[18px] font-bold text-fg">{num(t.value)}</div>
            <div className={cn('text-[10.5px] font-medium', t.bad ? 'text-neg' : 'text-fg-subtle')}>{t.label}</div>
          </div>
        ))}
      </div>
      {worst && worst.rage > 0 ? (
        <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-neg-tint/50 px-3 py-2 text-[12px] text-fg">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-neg" />
          <span><b>{worst.label}</b> is the friction hotspot — {num(worst.rage)} rage clicks{p.fault === 'broken_form' ? '. The mobile form fails to submit, so the money leak on this page has a behavioural cause you can watch.' : '. Worth a closer look in session replay.'}</span>
        </div>
      ) : (
        <div className="mt-3 rounded-[10px] bg-pos-tint/40 px-3 py-2 text-[12px] text-fg-muted">No standout friction — visitors interact the way the page expects.</div>
      )}
    </Card>
  )
}

/* ---------------- Device split ---------------- */
function DeviceSplit({ p, beh }: { p: Page; beh: PageBehavior }) {
  return (
    <Card className="p-4">
      <SectionHead title="By device" hint="share of sessions · conversion" />
      <div className="space-y-3">
        {beh.devices.map((d) => {
          const failing = p.fault === 'broken_form' && d.k === 'mobile'
          return (
            <div key={d.k}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="font-medium capitalize text-fg">{d.k}</span>
                <span className="text-fg-subtle">{d.sharePct}% of sessions · <b className={failing ? 'text-neg' : 'text-fg'}>{d.convPct}%</b> convert {failing && '⚠'}</span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-sunken">
                <motion.i className={cn('block h-full', failing ? 'bg-neg' : 'bg-navy')} initial={{ width: 0 }} animate={{ width: `${d.sharePct}%` }} transition={{ duration: 0.7 }} />
              </div>
            </div>
          )
        })}
      </div>
      {p.fault === 'broken_form' && <p className="mt-3 rounded-[10px] bg-neg-tint/40 px-3 py-2 text-[11.5px] text-neg">Mobile is {beh.devices.find((d) => d.k === 'mobile')?.sharePct}% of traffic but converts 0% — the broken form is a mobile-only failure.</p>}
    </Card>
  )
}

/* ---------------- Session replay list ---------------- */
const TAG_TONE: Record<string, string> = { 'rage click': 'bg-neg-tint text-neg', 'form error': 'bg-neg-tint text-neg', 'dead click': 'bg-warn-tint text-warn', 'quick-back': 'bg-warn-tint text-warn', bounced: 'bg-sunken text-fg-muted', left: 'bg-sunken text-fg-muted', converted: 'bg-pos-tint text-pos' }
function tagTone(t: string) { return TAG_TONE[t] ?? (t.startsWith('scrolled') ? 'bg-navy-tint text-navy' : 'bg-sunken text-fg-muted') }

function SessionList({ beh, p }: { beh: PageBehavior; p: Page }) {
  const [open, setOpen] = useState<BehSession | null>(null)
  return (
    <Card className="p-4">
      <SectionHead title="Session replay" hint={`${beh.sessions.toLocaleString('en-IN')} recorded · the ones behind the number`} right={<span className="text-[11px] text-fg-subtle">via Microsoft Clarity</span>} />
      <div className="divide-y divide-line">
        {beh.sessionList.map((s) => (
          <button key={s.id} onClick={() => setOpen(s)} className="flex w-full items-center gap-3 rounded-[8px] px-1 py-2.5 text-left transition-colors hover:bg-sunken/60">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-panel text-navy transition-colors group-hover:border-navy/40"><Play className="h-3.5 w-3.5" /></span>
            <span className="w-16 shrink-0 text-[11.5px] font-medium capitalize text-fg-muted">{s.device}</span>
            <span className="hidden w-40 shrink-0 truncate text-[11.5px] text-fg-subtle sm:block">{s.source}</span>
            <div className="flex flex-1 flex-wrap gap-1">
              {s.tags.map((t) => <span key={t} className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', tagTone(t))}>{t}</span>)}
            </div>
            <span className="inline-flex items-center gap-1 text-[11.5px] text-fg-subtle tnum"><Gauge className="h-3 w-3" />{fmtSec(s.durSec)}</span>
          </button>
        ))}
      </div>
      <SessionReplayModal session={open} page={p} onClose={() => setOpen(null)} />
    </Card>
  )
}

/* ---------------- experiment behavioral report (control vs variant) ---------------- */
const fmtVal = (unit: BehMetric['unit'], v: number) => (unit === 'pct' ? `${r2(v)}%` : unit === 'sec' ? fmtSec(r2(v)) : num(r2(v)))
const isBetter = (m: BehMetric) => (m.betterUp ? m.deltaPct > 0 : m.deltaPct < 0)

export function ExpBehaviorView({ e }: { e: Experiment }) {
  if (isNVar(e)) return <NVariantBehavior e={e} />
  const d = expBehavior(e)
  const page = expPage(e)
  return (
    <div className="space-y-5">
      <ExpHeadline d={d} />
      <Scorecard d={d} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PrimaryOverTime d={d} />
        <FunnelCompare d={d} />
      </div>
      <HeatmapCompare d={d} />
      <ReplayByArm d={d} page={page} headline={d.headline} />
    </div>
  )
}

/* ---- N-variant behaviour: each version is a different page, so compare the real per-page signals inline (A vs B vs C) and deep-link into each page's full interaction map ---- */
type NVarRow = { v: ExpVariant; i: number; page: Page; beh: PageBehavior }
function NVariantBehavior({ e }: { e: Experiment }) {
  const { go } = useNav()
  const variants = e.variants ?? []
  const goal = goalVarOf(e)
  const goalCount = (letter: string) => goal?.arms[letter]?.count ?? 0
  const rows = variants.map((v, i) => {
    const page = PAGES.find((p) => p.id === v.pageId)
    return { v, i, page, beh: page ? pageBehavior(page) : undefined }
  })
  const withBeh = rows.filter((r): r is NVarRow => !!r.page && !!r.beh)
  const open = (pageId: string) => { openBehavior(pageId); go('pagedetail', pageId) }
  const color = (i: number) => C.series[i % C.series.length]
  const cols = withBeh.length >= 3 ? 'lg:grid-cols-3' : 'sm:grid-cols-2'
  const collecting = withBeh.every((r) => (r.v.v ?? 0) === 0)

  // Volumes come from this test's own arm (visitors + goal count); the on-page shape (scroll %, friction rates, replays) comes from the page. So this tab reconciles with the Result tab, while the full heatmap stays a per-page deep-link.
  const arm = (r: NVarRow) => {
    const sessions = r.v.v ?? 0
    const g = goalCount(r.v.letter)
    const b = r.beh
    const ratio = b.sessions ? sessions / b.sessions : 0
    const scrolled = r2((sessions * b.scroll.formReachPct) / 100)
    const started = sessions ? clamp(g ? r2(g / 0.62) : r2(scrolled * 0.3), g, scrolled) : 0
    return {
      sessions,
      activeSec: b.engagement.activeSec,
      formReachPct: b.scroll.formReachPct,
      score: b.friction.score,
      journey: [
        { k: 'land', label: 'Landed', count: sessions },
        { k: 'scroll', label: 'Scrolled to form', count: scrolled },
        { k: 'start', label: 'Form started', count: started },
        { k: 'submit', label: 'Submitted', count: g },
      ],
      friction: { rage: r2(b.friction.rageClicks * ratio), dead: r2(b.friction.deadClicks * ratio), quick: r2(b.friction.quickBacks * ratio), js: r2(b.friction.jsErrors * ratio), score: b.friction.score },
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-navy-tint text-navy"><Activity className="h-[18px] w-[18px]" /></span>
          <div>
            <div className="text-[14px] font-semibold text-fg">Behaviour — {variants.length} versions compared</div>
            <div className="text-[12px] text-fg-subtle">Volumes are this test's own sessions per version, so they tie to the Result tab; the on-page shape — scroll, journey, friction, replays — comes from each version's page. Open any version for its full interaction map &amp; every recording.</div>
          </div>
        </div>
      </Card>

      {collecting ? (
        <Card className="p-4">
          <SectionHead title="On-page behaviour — A vs B vs C" hint="fills in as the test collects sessions" />
          <div className="divide-y divide-line">
            {withBeh.map(({ v, i, page }) => (
              <div key={v.letter} className="flex items-center gap-2 py-2.5">
                <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: color(i) }} />
                <b className="text-[12.5px] font-medium text-fg">Version {v.letter}</b>
                <span className="flex-1 truncate text-[12px] text-fg-subtle">{page.name}</span>
                <button onClick={() => open(v.pageId)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-line px-2 py-1 text-[11.5px] font-medium text-navy transition-colors hover:border-navy/40 hover:bg-navy-tint/40">Open page <ArrowUpRight className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
          <p className="mt-2.5 border-t border-line pt-2.5 text-[11px] text-fg-subtle">This test hasn't collected sessions yet, so the A-vs-B-vs-C scroll, journey and replay comparisons are empty. Each version's page already has live behaviour — open any to see it now.</p>
        </Card>
      ) : (
        <>
          {/* at-a-glance scorecard + deep-links */}
          <Card className="p-4">
            <SectionHead title="On-page behaviour — A vs B vs C" hint="this test's sessions per version" />
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="text-fg-subtle">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-2 text-left font-medium">Version</th>
                    <th className="px-2 py-2 text-right font-medium">Sessions</th>
                    <th className="px-2 py-2 text-right font-medium">Active time</th>
                    <th className="px-2 py-2 text-right font-medium">Reach form</th>
                    <th className="px-2 py-2 text-right font-medium">Friction</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {withBeh.map((r) => {
                    const a = arm(r)
                    return (
                      <tr key={r.v.letter} className="border-b border-line last:border-0">
                        <td className="py-2.5 pr-2"><span className="flex items-center gap-1.5"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: color(r.i) }} /><b className="font-medium text-fg">Version {r.v.letter}</b> <span className="truncate text-fg-subtle">{r.page.name}</span></span></td>
                        <td className="px-2 py-2.5 text-right tnum text-fg">{num(a.sessions)}</td>
                        <td className="px-2 py-2.5 text-right tnum text-fg">{fmtSec(a.activeSec)}</td>
                        <td className="px-2 py-2.5 text-right tnum"><span className={a.formReachPct >= 55 ? 'text-pos' : 'text-warn'}>{a.formReachPct}%</span></td>
                        <td className="px-2 py-2.5 text-right tnum"><span className={a.score >= 60 ? 'text-neg' : a.score >= 35 ? 'text-warn' : 'text-pos'}>{a.score}</span></td>
                        <td className="px-2 py-2.5 text-right"><button onClick={() => open(r.v.pageId)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-line px-2 py-1 text-[11.5px] font-medium text-navy transition-colors hover:border-navy/40 hover:bg-navy-tint/40">Open <ArrowUpRight className="h-3 w-3" /></button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2.5 border-t border-line pt-2.5 text-[11px] leading-relaxed text-fg-subtle">Sessions are this test's slice of each page (they match the Result tab); active time, reach-form and friction are the page's measured shape. <b className="text-fg-muted">Open</b> a version for its full page behaviour — heatmap &amp; every recording.</p>
          </Card>

          {/* scroll depth A vs B vs C */}
          <Card className="p-4">
            <SectionHead title="Scroll depth — A vs B vs C" hint="how far each version's visitors get" />
            <div className={cn('grid grid-cols-1 gap-5', cols)}>
              {withBeh.map(({ v, i, page, beh }) => {
                const milestones = [
                  { label: 'Top of page', pct: 100 },
                  { label: 'Below the fold', pct: beh.scroll.reach.p25 },
                  { label: 'Mid-page', pct: beh.scroll.reach.p50 },
                  { label: 'The form', pct: beh.scroll.formReachPct, mark: true },
                  { label: 'Footer', pct: beh.scroll.reach.p100 },
                ]
                return (
                  <div key={v.letter}>
                    <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-fg-muted"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: color(i) }} /><span className="truncate">Version {v.letter} · {page.name}</span></div>
                    <div className="space-y-1.5">
                      {milestones.map((m) => (
                        <div key={m.label} className="flex items-center gap-2 text-[11.5px]">
                          <span className={cn('w-24 shrink-0', m.mark ? 'font-semibold text-navy' : 'text-fg-muted')}>{m.label}</span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sunken"><motion.i className="block h-full rounded-full" style={{ background: heat(m.pct / 100) }} initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} /></div>
                          <b className="tnum w-9 text-right text-fg">{m.pct}%</b>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 border-t border-line pt-2.5 text-[11px] text-fg-subtle">The form row (bold) is the one that matters — the share of each version's visitors who reach the enquiry form.</p>
          </Card>

          {/* on-page journey A vs B vs C */}
          <Card className="p-4">
            <SectionHead title="On-page journey — A vs B vs C" hint="where each version keeps or drops people" />
            <div className={cn('grid grid-cols-1 gap-5', cols)}>
              {withBeh.map((r) => {
                const steps = arm(r).journey
                return (
                  <div key={r.v.letter}>
                    <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-fg-muted"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: color(r.i) }} /><span className="truncate">Version {r.v.letter} · {r.page.name}</span></div>
                    <div className="space-y-1">
                      {steps.map((s, si) => {
                        const prev = si > 0 ? steps[si - 1].count : s.count
                        const drop = prev > 0 ? r2(((prev - s.count) / prev) * 100) : 0
                        const pct = r.v.v ? clamp(r2((s.count / r.v.v) * 100), 2, 100) : 0
                        return (
                          <div key={s.k}>
                            {si > 0 && drop > 0 && <div className="pl-[96px] text-[10px] font-medium text-neg">▼ {drop}% drop</div>}
                            <div className="flex items-center gap-2 text-[11.5px]">
                              <span className={cn('w-24 shrink-0 truncate', s.k === 'submit' ? 'font-semibold text-pos' : 'text-fg-muted')}>{s.label}</span>
                              <div className="h-2.5 flex-1 overflow-hidden rounded bg-sunken"><motion.i className="block h-full rounded" style={{ background: s.k === 'submit' ? 'var(--color-pos)' : color(r.i) }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} /></div>
                              <b className="tnum w-9 text-right text-fg">{num(s.count)}</b>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 border-t border-line pt-2.5 text-[11px] text-fg-subtle">Landed = this test's sessions on each version; Submitted = its {goal?.name ?? 'goal'} count — the same numbers as the Result tab. The steps between show where each page loses people.</p>
          </Card>

          {/* friction A vs B vs C */}
          <Card className="p-4">
            <SectionHead title="Friction signals — A vs B vs C" hint="frustration per version, the way Clarity & FullStory flag it" />
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="text-fg-subtle">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-2 text-left font-medium">Version</th>
                    <th className="px-2 py-2 text-right font-medium">Rage clicks</th>
                    <th className="px-2 py-2 text-right font-medium">Dead clicks</th>
                    <th className="px-2 py-2 text-right font-medium">Quick-backs</th>
                    <th className="px-2 py-2 text-right font-medium">JS errors</th>
                    <th className="px-2 py-2 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {withBeh.map((r) => {
                    const f = arm(r).friction
                    return (
                      <tr key={r.v.letter} className="border-b border-line last:border-0">
                        <td className="py-2.5 pr-2"><span className="flex items-center gap-1.5"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: color(r.i) }} /><b className="font-medium text-fg">Version {r.v.letter}</b> <span className="truncate text-fg-subtle">{r.page.name}</span></span></td>
                        <td className="px-2 py-2.5 text-right tnum text-fg">{num(f.rage)}</td>
                        <td className="px-2 py-2.5 text-right tnum text-fg">{num(f.dead)}</td>
                        <td className="px-2 py-2.5 text-right tnum text-fg">{num(f.quick)}</td>
                        <td className="px-2 py-2.5 text-right tnum text-fg">{num(f.js)}</td>
                        <td className="px-2 py-2.5 text-right tnum font-semibold"><span className={f.score >= 60 ? 'text-neg' : f.score >= 35 ? 'text-warn' : 'text-pos'}>{f.score}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2.5 border-t border-line pt-2.5 text-[11px] text-fg-subtle">Counts are scaled to each version's test sessions; the score is a 0–100 index (lower is better). A spike in rage or dead clicks on one version is where to look in its replay.</p>
          </Card>

          <NVarReplay rows={withBeh} />
        </>
      )}
    </div>
  )
}

function NVarReplay({ rows }: { rows: NVarRow[] }) {
  const [active, setActive] = useState(rows[0]?.v.letter ?? 'A')
  const [open, setOpen] = useState<BehSession | null>(null)
  const cur = rows.find((r) => r.v.letter === active) ?? rows[0]
  if (!cur) return null
  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div><div className="text-[13px] font-semibold text-fg">Session replay by version</div><div className="text-[11.5px] text-fg-subtle">watch how each version's page behaved · via Microsoft Clarity</div></div>
        <Seg options={rows.map((r) => ({ k: r.v.letter, label: `Version ${r.v.letter}` }))} value={active} onChange={setActive} small />
      </div>
      <div className="divide-y divide-line">
        {cur.beh.sessionList.map((s) => (
          <button key={s.id} onClick={() => setOpen(s)} className="flex w-full items-center gap-3 rounded-[8px] px-1 py-2.5 text-left transition-colors hover:bg-sunken/60">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-panel text-navy"><Play className="h-3.5 w-3.5" /></span>
            <span className="w-16 shrink-0 text-[11.5px] font-medium capitalize text-fg-muted">{s.device}</span>
            <span className="hidden w-40 shrink-0 truncate text-[11.5px] text-fg-subtle sm:block">{s.source}</span>
            <div className="flex flex-1 flex-wrap gap-1">{s.tags.map((t) => <span key={t} className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', tagTone(t))}>{t}</span>)}</div>
            <span className="inline-flex items-center gap-1 text-[11.5px] text-fg-subtle tnum"><Gauge className="h-3 w-3" />{fmtSec(s.durSec)}</span>
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] text-fg-subtle">Showing <b className="text-fg-muted">Version {cur.v.letter} · {cur.page.name}</b>'s sampled sessions. Switch versions above, or open the page for every recording.</p>
      <SessionReplayModal session={open} page={cur.page} headline={`Version ${cur.v.letter} · ${cur.page.name}`} onClose={() => setOpen(null)} />
    </Card>
  )
}

function ExpHeadline({ d }: { d: ExpBehaviorData }) {
  const good = d.dir > 0
  const tone = d.dir === 0 ? 'navy' : good ? 'pos' : 'neg'
  const cls = { pos: 'bg-pos-tint text-pos', neg: 'bg-neg-tint text-neg', navy: 'bg-navy-tint text-navy' }[tone]
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-[10px]', cls)}><Activity className="h-[18px] w-[18px]" /></span>
          <div>
            <div className="flex items-center gap-2 text-[14px] font-semibold text-fg">{d.headline}{d.sig && <span className="rounded bg-pos-tint px-1.5 py-0.5 text-[10px] font-bold text-pos">SIGNIFICANT</span>}</div>
            <div className="text-[12px] text-fg-subtle">Behavioural read on <b className="text-fg-muted">{d.primary.label}</b> — the leading indicator behind the cost per lead.</div>
          </div>
        </div>
        <div className="flex items-center gap-5 text-right">
          <div><div className="tnum text-[15px] font-bold text-fg">{num(d.sessions.c)} / {num(d.sessions.v)}</div><div className="text-[10.5px] text-fg-subtle">sessions A / B</div></div>
          <div><div className="tnum text-[15px] font-bold text-fg">{d.days}d</div><div className="text-[10.5px] text-fg-subtle">running</div></div>
        </div>
      </div>
    </Card>
  )
}

/* ---- Statsig-style scorecard: lift + confidence interval + significance ---- */
function Scorecard({ d }: { d: ExpBehaviorData }) {
  const dom = clamp(Math.max(...d.metrics.flatMap((m) => [Math.abs(m.ciLow), Math.abs(m.ciHigh)]), 20), 20, 90)
  return (
    <Card className="p-4">
      <SectionHead title="Behavioural scorecard" hint="lift, confidence interval & significance · control vs variant" />
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="text-fg-subtle">
            <tr className="border-b border-line">
              <th className="py-2 pr-2 text-left font-medium">Metric</th>
              <th className="px-2 py-2 text-right font-medium">Control</th>
              <th className="px-2 py-2 text-right font-medium">Variant</th>
              <th className="px-2 py-2 text-right font-medium">Change</th>
              <th className="w-[34%] px-2 py-2 text-left font-medium">95% confidence interval</th>
            </tr>
          </thead>
          <tbody>
            {d.metrics.map((m) => <ScoreRow key={m.key} m={m} dom={dom} />)}
          </tbody>
        </table>
      </div>
      <p className="mt-2.5 border-t border-line pt-2.5 text-[11px] leading-relaxed text-fg-subtle">Green = a real improvement (the interval clears zero); grey = not yet significant — the interval still crosses zero, so it could be noise. Rage clicks is a guardrail: down is good.</p>
    </Card>
  )
}

function ScoreRow({ m, dom }: { m: BehMetric; dom: number }) {
  const better = isBetter(m)
  const tone = !m.sig ? 'grey' : better ? 'pos' : 'neg'
  const numCls = { pos: 'text-pos', neg: 'text-neg', grey: 'text-fg-subtle' }[tone]
  const pos = (x: number) => 50 + clamp(x / dom, -1, 1) * 50
  const barCls = { pos: 'bg-pos', neg: 'bg-neg', grey: 'bg-line-strong' }[tone]
  return (
    <tr className={cn('border-b border-line last:border-0', m.role === 'primary' && 'bg-brand-tint/20')}>
      <td className="py-2 pr-2"><span className="flex items-center gap-1.5"><b className="font-medium text-fg">{m.label}</b>{m.role === 'primary' ? <span className="rounded bg-brand-tint px-1 py-0.5 text-[8.5px] font-bold uppercase text-brand">Goal</span> : m.role === 'guardrail' ? <span className="rounded bg-sunken px-1 py-0.5 text-[8.5px] font-bold uppercase text-fg-muted">Guard</span> : null}</span></td>
      <td className="px-2 py-2 text-right tnum text-fg-muted">{fmtVal(m.unit, m.c)}</td>
      <td className="px-2 py-2 text-right tnum font-semibold text-fg">{fmtVal(m.unit, m.v)}</td>
      <td className={cn('px-2 py-2 text-right tnum font-semibold', numCls)}>{m.deltaPct > 0 ? '+' : ''}{m.deltaPct}%</td>
      <td className="px-2 py-2">
        <div className="relative h-5">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
          <div className="absolute top-0 h-full w-px bg-line-strong" style={{ left: '50%' }} />
          <div className={cn('absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full opacity-60', barCls)} style={{ left: `${Math.min(pos(m.ciLow), pos(m.ciHigh))}%`, width: `${Math.abs(pos(m.ciHigh) - pos(m.ciLow))}%` }} />
          <div className={cn('absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-panel', barCls)} style={{ left: `${pos(m.deltaPct)}%` }} />
        </div>
      </td>
    </tr>
  )
}

function PrimaryOverTime({ d }: { d: ExpBehaviorData }) {
  const s = d.series
  const W = 100, H = 44
  const ys = s.flatMap((p) => [p.c, p.v])
  const min = Math.min(...ys), max = Math.max(...ys), rng = max - min || 1
  const X = (i: number) => (i / (s.length - 1)) * W
  const Y = (v: number) => H - ((v - min) / rng) * (H - 6) - 3
  const pts = (key: 'c' | 'v') => s.map((p, i) => `${X(i).toFixed(1)},${Y(p[key]).toFixed(1)}`).join(' ')
  const vColor = d.dir < 0 ? 'var(--color-neg)' : 'var(--color-pos)'
  const last = s[s.length - 1]
  return (
    <Card className="p-4">
      <SectionHead title={`${d.primary.label} over time`} hint="by day · A vs B" />
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-32 w-full">
        <polyline points={pts('c')} fill="none" stroke="var(--color-line-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <polyline points={pts('v')} fill="none" stroke={vColor} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex items-center justify-between text-[11.5px]">
        <span className="inline-flex items-center gap-1.5 text-fg-subtle"><span className="inline-block h-2 w-2 rounded-full bg-line-strong" />Control {fmtVal(d.primary.unit, last.c)}</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-fg"><span className="inline-block h-2 w-2 rounded-full" style={{ background: vColor }} />Variant {fmtVal(d.primary.unit, last.v)}</span>
      </div>
    </Card>
  )
}

function FunnelCompare({ d }: { d: ExpBehaviorData }) {
  const rows = d.arms.control.funnel.map((c, i) => ({ label: c.label, c, v: d.arms.variant.funnel[i] }))
  return (
    <Card className="p-4">
      <SectionHead title="Journey — A vs B" hint="where each version keeps people" />
      <div className="space-y-2.5">
        {rows.map((r) => {
          const up = r.v.pct >= r.c.pct
          return (
            <div key={r.label}>
              <div className="mb-1 flex items-center justify-between text-[11.5px]"><span className="font-medium text-fg">{r.label}</span><span className={cn('font-semibold', up ? 'text-pos' : 'text-neg')}>{r.v.pct - r.c.pct >= 0 ? '+' : ''}{r.v.pct - r.c.pct}pt</span></div>
              <div className="flex items-center gap-2"><span className="w-4 text-[9px] text-fg-subtle">A</span><div className="h-3 flex-1 overflow-hidden rounded bg-sunken"><motion.i className="block h-full rounded bg-line-strong" initial={{ width: 0 }} animate={{ width: `${r.c.pct}%` }} transition={{ duration: 0.6 }} /></div><b className="tnum w-12 text-right text-[11px] text-fg-muted">{num(r.c.count)}</b></div>
              <div className="mt-0.5 flex items-center gap-2"><span className="w-4 text-[9px] text-fg-subtle">B</span><div className="h-3 flex-1 overflow-hidden rounded bg-sunken"><motion.i className={cn('block h-full rounded', up ? 'bg-pos' : 'bg-navy')} initial={{ width: 0 }} animate={{ width: `${r.v.pct}%` }} transition={{ duration: 0.6 }} /></div><b className="tnum w-12 text-right text-[11px] text-fg">{num(r.v.count)}</b></div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function HeatmapCompare({ d }: { d: ExpBehaviorData }) {
  return (
    <Card className="p-4">
      <SectionHead title="Click map — A vs B" hint="where clicks shifted between the versions" />
      <div className="grid grid-cols-2 gap-4">
        <MiniMap title="Control (A)" arm={d.arms.control} tint="navy" />
        <MiniMap title="Variant (B)" arm={d.arms.variant} tint="brand" />
      </div>
      <p className="mt-2.5 text-[11px] text-fg-subtle">Element-anchored clicks per version — the heat shows where the variant pulled attention differently. Hottest in red.</p>
    </Card>
  )
}

function MiniMap({ title, arm, tint }: { title: string; arm: ExpArm; tint: 'navy' | 'brand' }) {
  const max = Math.max(...arm.elements.map((e) => e.clicks), 1)
  const cell = (k: string, node: React.ReactNode, block?: boolean) => {
    const el = arm.elements.find((e) => e.k === k)
    if (!el) return node
    const t = el.clicks / max
    const color = heat(t)
    return (
      <div className={cn('relative', block && 'w-full')}>
        <div className="pointer-events-none absolute -inset-0.5 rounded-[8px]" style={{ boxShadow: `0 0 0 1.5px ${color}`, background: `${color}18`, opacity: 0.45 + t * 0.55 }} />
        <div className="relative">{node}</div>
        <span className="absolute -right-1.5 -top-1.5 rounded-full px-1 py-0.5 text-[8px] font-bold text-white" style={{ background: color }}>{num(el.clicks)}</span>
      </div>
    )
  }
  return (
    <div>
      <div className="mb-1.5 text-[11.5px] font-semibold"><span className={tint === 'brand' ? 'text-brand' : 'text-navy'}>{title}</span> <span className="text-fg-subtle">· {num(arm.sessions)} sessions</span></div>
      <div className="overflow-hidden rounded-[10px] border border-line-strong">
        <div className="border-b border-line bg-sunken px-2 py-1 text-[9px] text-fg-subtle">pages.onlinejain.com</div>
        <div className="space-y-2 bg-panel p-2.5">
          <div className="text-[11px] font-bold text-fg">Online programme</div>
          <div className="flex flex-wrap gap-1.5">
            {cell('apply', <span className="inline-flex rounded-[7px] bg-brand px-2 py-1 text-[9px] font-semibold text-white">Apply Now</span>)}
            {cell('prospectus', <span className="inline-flex rounded-[7px] border border-line-strong px-2 py-1 text-[9px] font-medium text-fg">Prospectus</span>)}
          </div>
          <div className="rounded-[8px] border border-line p-1.5">
            <div className="mb-1 h-2 rounded bg-sunken" />
            <div className="mb-1.5 h-2 rounded bg-sunken" />
            {cell('form', <div className="rounded-[6px] bg-navy py-1 text-center text-[9px] font-semibold text-white">Submit enquiry</div>, true)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cell('whatsapp', <span className="inline-flex rounded-full border border-line px-2 py-0.5 text-[9px] text-fg-muted">WhatsApp</span>)}
            {cell('call', <span className="inline-flex rounded-full border border-line px-2 py-0.5 text-[9px] text-fg-muted">Call</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReplayByArm({ d, page, headline }: { d: ExpBehaviorData; page?: Page; headline?: string }) {
  const [arm, setArm] = useState<'control' | 'variant'>('variant')
  const [open, setOpen] = useState<BehSession | null>(null)
  const list = arm === 'control' ? d.sessionsByArm.control : d.sessionsByArm.variant
  const armLabel = arm === 'control' ? 'Control (A)' : 'Variant (B)'
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div><div className="text-[13px] font-semibold text-fg">Session replay by version</div><div className="text-[11.5px] text-fg-subtle">watch how each variant behaved · via Microsoft Clarity</div></div>
        <Seg options={[{ k: 'control', label: 'Control (A)' }, { k: 'variant', label: 'Variant (B)' }]} value={arm} onChange={(v) => setArm(v as 'control' | 'variant')} small />
      </div>
      {list.length ? (
        <div className="divide-y divide-line">
          {list.map((s) => (
            <button key={s.id} onClick={() => page && setOpen(s)} className="flex w-full items-center gap-3 rounded-[8px] px-1 py-2.5 text-left transition-colors hover:bg-sunken/60">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-panel text-navy"><Play className="h-3.5 w-3.5" /></span>
              <span className="w-16 shrink-0 text-[11.5px] font-medium capitalize text-fg-muted">{s.device}</span>
              <div className="flex flex-1 flex-wrap gap-1">{s.tags.map((t) => <span key={t} className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', tagTone(t))}>{t}</span>)}</div>
              <span className="inline-flex items-center gap-1 text-[11.5px] text-fg-subtle tnum"><Gauge className="h-3 w-3" />{fmtSec(s.durSec)}</span>
            </button>
          ))}
        </div>
      ) : <div className="py-6 text-center text-[12px] text-fg-subtle">No sampled sessions for this arm yet.</div>}
      {page && <SessionReplayModal session={open} page={page} headline={`${armLabel} · ${headline ?? ''}`.replace(/ · $/, '')} onClose={() => setOpen(null)} />}
    </Card>
  )
}

/* ---------------- shared segmented control ---------------- */
function Seg({ options, value, onChange, small }: { options: { k: string; label: string; icon?: React.ReactNode }[]; value: string; onChange: (v: string) => void; small?: boolean }) {
  return (
    <div className="inline-flex rounded-[9px] border border-line bg-sunken p-0.5">
      {options.map((o) => (
        <button key={o.k} onClick={() => onChange(o.k)} className={cn('inline-flex items-center gap-1 rounded-[7px] font-medium transition-colors', small ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-[12px]', value === o.k ? 'bg-panel text-fg shadow-sm' : 'text-fg-subtle hover:text-fg-muted')}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  )
}
