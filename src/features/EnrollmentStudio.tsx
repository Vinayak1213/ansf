import { Fragment, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronRight, FlaskConical, Shuffle, Sparkles, TriangleAlert, Wrench } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { cn, inr, num } from '@/lib/utils'
import { C } from '@/lib/tokens'
import { EDGES, OUTCOME, STAGES, type Edge, type Stage } from '@/data/outcome'

const money = (v: number) => (v >= 10000000 ? `₹${(v / 10000000).toFixed(2)}Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : inr(v))
const fmt = (s: Stage) => (s.money ? money(s.value) : num(s.value))
const leakColor = (l: Edge['leak']) => (l === 'high' ? C.neg : l === 'watch' ? C.warn : C.lineStrong)
const KIND = {
  test: { icon: FlaskConical, label: 'Stage an experiment' },
  fix: { icon: Wrench, label: 'Ship a fix' },
  reallocate: { icon: Shuffle, label: 'Reallocate spend' },
} as const

export function EnrollmentStudio() {
  const [sel, setSel] = useState<string>('leads-qualified')
  const edge = EDGES.find((e) => e.id === sel)!

  return (
    <div className="mx-auto max-w-[980px] px-8 py-7">
      <div className="mb-1 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-navy text-white"><Sparkles className="h-3.5 w-3.5" /></span>
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">Enrollment Studio</h1>
        <span className="rounded-md bg-navy-tint px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">AI</span>
      </div>
      <p className="mb-5 max-w-[80ch] text-[13px] leading-relaxed text-fg-subtle">
        Your spend → enrolment funnel as a live graph. <b className="text-fg-muted">Click a leaking step</b> — the Studio agent diagnoses it from real behaviour + CRM data, drafts the fix, and stages it as a test judged on <b className="text-fg-muted">qualified leads and enrolled students</b>, not form-fills. You approve before anything goes live.
    </p>

      {/* the outcome graph */}
      <Card className="mb-5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[13px] font-semibold text-fg">The outcome graph</div>
          <div className="text-[11.5px] text-fg-subtle">blended <b className="tnum text-fg-muted">₹{num(Math.round(OUTCOME.spend / OUTCOME.enrolled))}</b> per enrolment · <b className="tnum text-pos">12.6×</b> ROAS</div>
        </div>
        <div className="flex flex-col gap-1">
          {STAGES.map((s, i) => (
            <Fragment key={s.key}>
              <StageRow s={s} />
              {i < STAGES.length - 1 && <EdgeRow edge={EDGES[i]} selected={EDGES[i].id === sel} onClick={() => setSel(EDGES[i].id)} />}
            </Fragment>
          ))}
        </div>
        <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-relaxed text-fg-subtle">
          Every stage is real, joined data (ad platforms + behaviour + CRM) and reconciles with your account. The two assumptions are the <b className="text-fg-muted">programme fee</b> and the <b className="text-fg-muted">close-rate</b>; enrolled is <b className="text-fg-muted">observed so far</b> — the {OUTCOME.pending} still in pipeline are shown separately, never counted as won.
        </p>
      </Card>

      {/* the agent panel */}
      <AnimatePresence mode="wait">
        <motion.div key={edge.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <AgentPanel edge={edge} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function StageRow({ s }: { s: Stage }) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-line bg-surface/50 px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{s.label}</span>
        {s.sub && <span className="ml-2 text-[11px] text-fg-subtle">· {s.sub}</span>}
      </div>
      <span className="tnum shrink-0 text-[19px] font-bold leading-none text-fg">{fmt(s)}</span>
    </div>
  )
}

function EdgeRow({ edge, selected, onClick }: { edge: Edge; selected: boolean; onClick: () => void }) {
  const col = leakColor(edge.leak)
  const isLeak = edge.leak !== 'none'
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group mx-2 flex items-center gap-2.5 rounded-[9px] py-1.5 pl-1.5 pr-3 text-left transition-colors',
        selected ? 'bg-navy-tint ring-1 ring-navy/20' : 'hover:bg-sunken',
      )}
    >
      <span className="h-6 w-[3px] shrink-0 rounded-full" style={{ background: col, opacity: isLeak ? 1 : 0.4 }} />
      <span className={cn('tnum shrink-0 text-[12.5px] font-bold', !isLeak && 'text-fg-muted')} style={isLeak ? { color: col } : undefined}>{edge.stat}</span>
      {isLeak && (
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', edge.leak === 'high' ? 'bg-neg-tint text-neg' : 'bg-warn-tint text-warn')}>
          {edge.leak === 'high' && <TriangleAlert className="h-3 w-3" />}
          {edge.leak === 'high' ? 'leak' : 'watch'}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[11.5px] text-fg-muted">{edge.atStake}</span>
      <ChevronRight className={cn('h-4 w-4 shrink-0 transition-colors', selected ? 'text-navy' : 'text-fg-subtle group-hover:text-fg-muted')} />
    </button>
  )
}

function AgentPanel({ edge }: { edge: Edge }) {
  const [launched, setLaunched] = useState(false)
  const iv = edge.intervention
  const K = KIND[iv.kind]
  const KIcon = K.icon
  const stageLabel = (k: string) => STAGES.find((s) => s.key === k)?.label ?? k

  return (
    <Card className={cn('overflow-hidden p-0', edge.leak === 'high' ? 'border-neg/25' : edge.leak === 'watch' ? 'border-warn/30' : 'border-line')}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-navy-tint/20 px-5 py-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-navy text-white"><Sparkles className="h-3.5 w-3.5" /></span>
        <b className="text-[13px] font-semibold text-fg">Studio agent</b>
        <span className="text-[12px] text-fg-subtle">· {stageLabel(edge.from)} → {stageLabel(edge.to)} · <span className="tnum">{edge.stat}</span></span>
        {edge.leak !== 'none' && <span className={cn('ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold', edge.leak === 'high' ? 'bg-neg-tint text-neg' : 'bg-warn-tint text-warn')}><TriangleAlert className="h-3.5 w-3.5" /> {edge.atStake}</span>}
      </div>

      <div className="space-y-4 px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">What I found</div>
          <p className="mt-1 text-[13px] leading-relaxed text-fg">{edge.diagnosis}</p>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">What I looked at</div>
          <ul className="mt-1.5 space-y-1">
            {edge.evidence.map((e, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12.5px] text-fg-muted"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-navy" />{e}</li>
            ))}
          </ul>
        </div>

        {/* drafted intervention */}
        <div className="rounded-[12px] border border-line bg-surface/50 p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-navy"><KIcon className="h-3.5 w-3.5" /> Drafted — {K.label}</div>
          <b className="mt-1.5 block text-[14px] text-fg">{iv.title}</b>
          <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{iv.rationale}</p>
          <p className="mt-2 rounded-lg bg-panel px-3 py-2 text-[12.5px] text-fg"><b className="text-fg-muted">The change:</b> {iv.variant}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Spec label="Judged on" value={iv.metric} />
            <Spec label="Arms" value={iv.arms.join('  vs  ')} />
            <Spec label="Readout" value={iv.readout} />
          </div>
        </div>

        {/* approval */}
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3.5">
          {launched ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-pos"><Check className="h-4 w-4" /> {iv.kind === 'test' ? 'Staged & launched' : iv.kind === 'fix' ? 'Fix queued' : 'Reallocation drafted'} — reading on {iv.metric.split(' (')[0].toLowerCase()} <button onClick={() => setLaunched(false)} className="ml-1 text-[11.5px] font-normal text-fg-subtle underline hover:text-fg-muted">undo</button></span>
          ) : (
            <>
              <Button variant={edge.leak === 'high' ? 'primary' : 'navy'} size="md" onClick={() => setLaunched(true)}>Approve &amp; launch</Button>
              <Button variant="default" size="md" onClick={() => setLaunched(false)}>Edit draft</Button>
              <span className="text-[11.5px] italic text-fg-subtle">You approve — the agent never ships on its own.</span>
            </>
          )}
        </div>

        <p className="border-t border-line pt-3 text-[11px] leading-relaxed text-fg-subtle">
          This is a <b className="text-fg-muted">hypothesis</b>, not a proven win — the test decides, judged on {iv.metric.split(' (')[0].toLowerCase()}. {iv.kind === 'reallocate' ? 'Spend shifts stay observational until a geo/holdout confirms the lift.' : 'Enrolment is a lagged outcome and is confirmed over the intake window, never claimed early.'}
        </p>
      </div>
    </Card>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel px-2.5 py-2">
      <div className="text-[9.5px] font-semibold uppercase tracking-wide text-fg-subtle">{label}</div>
      <div className="mt-0.5 text-[12px] font-medium leading-snug text-fg">{value}</div>
    </div>
  )
}
