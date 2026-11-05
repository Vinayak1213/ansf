import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, ChevronRight, ClipboardList, FlaskConical, Info, Lightbulb, Monitor, Play, Route, Smartphone, TrendingDown, TrendingUp, X } from 'lucide-react'
import { Badge, Card, SectionHead, Segmented } from '@/components/ui'
import { cn, num } from '@/lib/utils'
import type { Page } from '@/data/samurai'
import { pageBehavior, type BehSession } from '@/data/behavior'
import { conversionDrivers, visitorIntel, type Confidence, type Driver, type DriverGroup, type PatternKind, type VPattern } from '@/data/visitorIntel'
import { SessionReplayModal, type ReplayOutcome, type Scenario } from './SessionReplay'

/* Visitor Intelligence — pattern-first. Journey Patterns (how visitors decide) + Conversion
   Drivers (which behaviours separate converters). Every card carries a confidence level and a
   comparison to the page average; friction is only labelled friction when evidence backs it.
   Minimal copy — the chips carry the meaning. */

const KIND: Record<PatternKind, { label: string; tone: 'pos' | 'navy' | 'neg' | 'neutral' }> = {
  converting: { label: 'Converting', tone: 'pos' },
  opportunity: { label: 'Opportunity', tone: 'navy' },
  comparison: { label: 'Repeated comparison', tone: 'neutral' },
  friction: { label: 'Friction', tone: 'neg' },
}
const CONF: Record<Confidence, { label: string; cls: string }> = {
  strong: { label: 'Strong', cls: 'bg-pos' },
  emerging: { label: 'Emerging', cls: 'bg-warn' },
  hypothesis: { label: 'Hypothesis', cls: 'bg-line-strong' },
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const lcFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/* Build a replay scenario from a pattern/driver, so a representative session's reconstructed
   timeline follows that journey + outcome instead of a generic one. */
function patternScenario(pat: VPattern): Scenario {
  if (pat.form) return { journey: ['Fees', 'Apply'], outcome: 'field-drop', form: pat.form, headline: `High intent — filled most of the form, then stalled on ‘${pat.form.stall}’.`, fix: pat.action }
  const outcome: ReplayOutcome = pat.kind === 'converting' ? 'converted'
    : pat.kind === 'friction' ? (pat.journey.includes('Enquiry') ? 'error' : 'loop')
    : pat.kind === 'comparison' ? 'loop' : 'left'
  const headline = pat.kind === 'converting' ? `A ${pat.name.toLowerCase()} journey — it earned the lead.`
    : pat.kind === 'opportunity' ? `Real intent, no enquiry — ${lcFirst(pat.blurb)}`
    : pat.kind === 'friction' ? 'The journey broke down before a lead.'
    : 'Thorough research — bounced between sections, then left.'
  return { journey: pat.journey, outcome, headline, fix: pat.action }
}
const DRIVER_JOURNEY: Record<string, string[]> = {
  testimonials: ['Hero', 'Testimonials', 'Apply'], prospectus: ['Hero', 'Programme', 'Apply'], return: ['Hero', 'Fees', 'Apply'],
  'fees-prog': ['Programme', 'Fees', 'Apply'], 'test-fees': ['Testimonials', 'Fees', 'Apply'],
  'form-err': ['Hero', 'Enquiry', 'Exit'], 'cta-noprog': ['Hero', 'Apply', 'Exit'], loops: ['Fees', 'Programme', 'Fees', 'Exit'],
}
function driverScenario(drv: Driver): Scenario {
  const conv = drv.group !== 'negative'
  const journey = DRIVER_JOURNEY[drv.id] ?? (conv ? ['Hero', 'Apply'] : ['Hero', 'Exit'])
  const outcome: ReplayOutcome = conv ? 'converted' : drv.id === 'form-err' ? 'error' : drv.id === 'loops' ? 'loop' : 'left'
  return { journey, outcome, headline: `This journey ${drv.label.toLowerCase()} — ${conv ? 'then enquired.' : 'then left without enquiring.'}` }
}

export function VisitorIntel({ p }: { p: Page }) {
  const beh = useMemo(() => pageBehavior(p), [p])
  const intel = useMemo(() => visitorIntel(p), [p])
  const drivers = useMemo(() => conversionDrivers(p), [p])
  const [tab, setTab] = useState<'patterns' | 'drivers'>('patterns')
  const [openPat, setOpenPat] = useState<VPattern | null>(null)
  const [openDrv, setOpenDrv] = useState<Driver | null>(null)
  const [replay, setReplay] = useState<{ session: BehSession; scenario?: Scenario } | null>(null)
  const openReplay = (session: BehSession, scenario?: Scenario) => setReplay({ session, scenario })

  if (intel.status !== 'ok') {
    return (
      <Card className="p-5">
        <SectionHead title="Visitor intelligence" hint="how your visitors decide" icon={<Route className="h-4 w-4" />} />
        <div className="flex items-start gap-2 rounded-[10px] bg-sunken px-3.5 py-3 text-[13px] leading-relaxed text-fg-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" /><span>{intel.reason}</span>
        </div>
      </Card>
    )
  }

  const topOpp = intel.patterns.filter((x) => x.kind === 'opportunity').sort((a, b) => b.journeys - a.journeys)[0]

  return (
    <Card className="p-5">
      <SectionHead title="Visitor intelligence" hint={`${num(intel.journeysAnalysed)} journeys · ${intel.baselineConvPct}% convert`} icon={<Route className="h-4 w-4" />} />

      {/* AI overview — lead with the biggest opportunity, not the top converter */}
      <div className="mb-4 rounded-[12px] border border-navy/20 bg-navy-tint/40 p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-navy"><Lightbulb className="h-3.5 w-3.5" /> Top opportunity</div>
        {topOpp ? (
          <>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg">
              <b className="font-semibold">{num(topOpp.journeys)}</b> journeys — {topOpp.blurb.charAt(0).toLowerCase() + topOpp.blurb.slice(1)}
            </p>
            {topOpp.investigate && <p className="mt-1 text-[12px] text-fg-muted">Investigate: {topOpp.investigate}</p>}
            <button onClick={() => { setTab('patterns'); setOpenPat(topOpp) }} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-navy hover:text-navy-hover">Explore opportunity <ChevronRight className="h-3.5 w-3.5" /></button>
          </>
        ) : (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg">Journeys convert cleanly — no major leak to recover right now.</p>
        )}
      </div>

      <Segmented<'patterns' | 'drivers'> value={tab} onChange={setTab} className="mb-4" options={[{ value: 'patterns', label: 'Journey patterns' }, { value: 'drivers', label: 'Conversion drivers' }]} />

      {tab === 'patterns' ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {intel.patterns.map((pat, i) => <PatternCard key={pat.id} pat={pat} baseline={intel.baselineConvPct} index={i} onOpen={() => setOpenPat(pat)} />)}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-fg-subtle">Patterns read from this page’s journeys — illustrative. Validate any change with an A/B test.</p>
        </>
      ) : (
        <ConversionDriversTab drivers={drivers.drivers} onOpen={setOpenDrv} />
      )}

      {openPat && <PatternDetail pat={openPat} baseline={intel.baselineConvPct} beh={beh} onClose={() => setOpenPat(null)} onReplay={openReplay} />}
      {openDrv && <DriverDetail drv={openDrv} beh={beh} onClose={() => setOpenDrv(null)} onReplay={openReplay} />}
      <SessionReplayModal session={replay?.session ?? null} page={p} scenario={replay?.scenario} onClose={() => setReplay(null)} />
    </Card>
  )
}

function ConfDot({ c }: { c: Confidence }) {
  return <span className="inline-flex items-center gap-1 text-[10.5px] text-fg-subtle"><span className={cn('h-1.5 w-1.5 rounded-full', CONF[c].cls)} />{CONF[c].label}</span>
}

/* Journey chips. Page sections render as plain pills with arrows; once the journey enters the
   form (`formFrom`), the remaining chips live inside a tinted, bordered "form" group — filled
   fields carry a check, the stall field is red — so it's obvious where browsing ends and the
   form begins. */
function JourneyLine({ journey, size = 'sm', dropLabel, formFrom = -1 }: { journey: string[]; size?: 'sm' | 'md'; dropLabel?: string; formFrom?: number }) {
  const hasForm = formFrom >= 0 && formFrom < journey.length
  const sections = hasForm ? journey.slice(0, formFrom) : journey
  const fields = hasForm ? journey.slice(formFrom) : []
  const sm = size === 'sm'
  const ic = sm ? 'h-3 w-3' : 'h-3.5 w-3.5'
  return (
    <div className="flex flex-wrap items-center gap-1">
      {sections.map((s, i) => (
        <Fragment key={`s${i}`}>
          {i > 0 && <span className="text-fg-subtle">→</span>}
          <span className={cn('rounded font-medium', sm ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-[12px]', s === dropLabel ? 'bg-neg-tint text-neg' : 'bg-sunken text-fg-muted')}>{s}</span>
        </Fragment>
      ))}
      {fields.length > 0 && (
        <span className="inline-flex items-center gap-1">
          {sections.length > 0 && <span className="text-fg-subtle">→</span>}
          <span className={cn('inline-flex flex-wrap items-center gap-1 rounded-[8px] border border-navy/25 bg-navy-tint/30', sm ? 'px-1.5 py-0.5' : 'px-2 py-1')}>
            <span className={cn('inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-navy', sm ? 'text-[9px]' : 'text-[10px]')}><ClipboardList className={ic} /> Form</span>
            {fields.map((f) => {
              const stalled = f === dropLabel
              return (
                <span key={f} className={cn('inline-flex items-center gap-0.5 font-medium', sm ? 'text-[11px]' : 'text-[12px]', stalled ? 'text-neg' : 'text-fg-muted')}>
                  {stalled ? <X className={cn('text-neg', ic)} /> : <Check className={cn('text-pos', ic)} />}{f}
                </span>
              )
            })}
          </span>
        </span>
      )}
    </div>
  )
}
const dropLabelOf = (pat: VPattern) => (pat.form ? pat.journey[pat.journey.length - 1] : undefined)
const formStartOf = (pat: VPattern) => (pat.form ? pat.journey.length - (pat.form.filled.length + 1) : -1)

function Metric({ pat }: { pat: VPattern }) {
  if (pat.kind === 'converting') return (
    <span>
      <b className="tnum text-fg">{pat.convRatePct}%</b> convert{pat.relMultiple ? <> · <b className="tnum text-pos">{pat.relMultiple}×</b> page</> : null}
      <span className="ml-1 text-fg-subtle">· {pat.shareOfConvPct}% of conversions</span>
    </span>
  )
  if (pat.kind === 'opportunity') return <><b className="tnum text-fg">{num(pat.journeys)}</b> journeys · last: {pat.lastStage}</>
  return <><b className="tnum text-fg">{num(pat.journeys)}</b> journeys · {pat.evidence ?? pat.sections?.join(' ⇄ ')}</>
}

function PatternCard({ pat, index, onOpen }: { pat: VPattern; baseline: number; index: number; onOpen: () => void }) {
  const k = KIND[pat.kind]
  return (
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group flex flex-col rounded-[13px] border border-line bg-panel p-4 text-left transition-colors hover:border-navy/25 hover:bg-sunken/20"
    >
      <div className="flex items-center gap-2">
        <Badge tone={k.tone}>{k.label}</Badge>
        <ConfDot c={pat.confidence} />
        <ChevronRight className="ml-auto h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-2 text-[14px] font-semibold text-fg">{pat.name}</div>
      <div className="text-[12px] leading-snug text-fg-muted">{pat.blurb}</div>
      <div className="mt-2.5"><JourneyLine journey={pat.journey} dropLabel={dropLabelOf(pat)} formFrom={formStartOf(pat)} /></div>
      <div className="mt-2.5 border-t border-line pt-2 text-[12px] text-fg-subtle"><Metric pat={pat} /></div>
    </motion.button>
  )
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[10px] border border-line bg-surface/40 px-3 py-2.5">
      <div className="text-[11px] text-fg-subtle">{label}</div>
      <div className="mt-0.5 text-[15px] font-bold text-fg tnum">{value}</div>
      {sub && <div className="text-[10.5px] text-fg-subtle">{sub}</div>}
    </div>
  )
}

function RepSessions({ ids, beh, scenario, onReplay }: { ids: string[]; beh: ReturnType<typeof pageBehavior>; scenario?: Scenario; onReplay: (s: BehSession, scenario?: Scenario) => void }) {
  const sessions = ids.map((id) => beh.sessionList.find((s) => s.id === id)).filter((s): s is BehSession => !!s)
  if (sessions.length === 0) return null
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Representative sessions</div>
      <div className="space-y-1.5">
        {sessions.map((s) => (
          <button key={s.id} onClick={() => onReplay(s, scenario)} className="flex w-full items-center gap-2.5 rounded-[9px] border border-line bg-surface/40 px-2.5 py-2 text-left transition-colors hover:border-navy/25 hover:bg-sunken/40">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-sunken text-fg-muted">{s.device === 'mobile' ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-fg">{s.source}</span>
              <span className="block truncate text-[10.5px] text-fg-subtle">{s.tags.slice(0, 2).join(' · ') || 'clean session'} · {s.durSec}s</span>
            </span>
            <Play className="h-3.5 w-3.5 shrink-0 text-navy" />
          </button>
        ))}
      </div>
    </div>
  )
}

function Drawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild><div className="fixed inset-0 z-50 bg-fg/25 backdrop-blur-[2px]" /></Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div className="fixed right-0 top-0 z-50 flex h-full w-[480px] max-w-[calc(100vw-24px)] flex-col border-l border-line bg-panel shadow-lg focus:outline-none" initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 360, damping: 38 }}>
            {children}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PatternDetail({ pat, baseline, beh, onClose, onReplay }: { pat: VPattern; baseline: number; beh: ReturnType<typeof pageBehavior>; onClose: () => void; onReplay: (s: BehSession, scenario?: Scenario) => void }) {
  const k = KIND[pat.kind]
  const notConv = pat.kind === 'converting' && pat.converters != null ? pat.journeys - pat.converters : null
  return (
    <Drawer onClose={onClose}>
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2"><Badge tone={k.tone}>{k.label}</Badge><ConfDot c={pat.confidence} /></div>
          <Dialog.Title className="text-[16px] font-semibold text-fg">{pat.name}</Dialog.Title>
          <Dialog.Description className="mt-0.5 text-[12.5px] text-fg-muted">{pat.blurb}</Dialog.Description>
        </div>
        <Dialog.Close className="rounded-md p-1 text-fg-subtle transition-colors hover:bg-sunken hover:text-fg"><X className="h-4 w-4" /></Dialog.Close>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Common journey</div>
          <JourneyLine journey={pat.journey} size="md" dropLabel={dropLabelOf(pat)} formFrom={formStartOf(pat)} />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <StatTile label="Journeys" value={num(pat.journeys)} />
          {pat.kind === 'converting'
            ? <StatTile label="Converts" value={`${pat.convRatePct}%`} sub={`${pat.relMultiple}× the page’s ${baseline}%`} />
            : <StatTile label={pat.lastStage ? 'Last step' : 'Pattern'} value={pat.lastStage ?? pat.sections?.join(' ⇄ ') ?? '—'} />}
          <StatTile label="Top device" value={cap(pat.topDevice)} />
          <StatTile label="Top channel" value={pat.topChannel} />
        </div>

        {notConv != null && <p className="text-[12px] text-fg-muted">Of these, <b className="tnum text-fg">{num(notConv)}</b> journeys didn’t convert — the headroom within this group.</p>}
        {pat.evidence && <div className="rounded-[10px] bg-sunken px-3.5 py-2.5 text-[12px] text-fg-muted">Evidence: {pat.evidence}</div>}
        {pat.investigate && <div className="rounded-[10px] bg-sunken px-3.5 py-2.5 text-[12px] text-fg-muted">Investigate: {pat.investigate}</div>}

        <div className="flex items-start gap-2.5 rounded-[11px] border border-navy/20 bg-navy-tint/40 px-3.5 py-3">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
          <div><div className="text-[10px] font-semibold uppercase tracking-wide text-navy">Try this</div><p className="mt-0.5 text-[12.5px] leading-relaxed text-fg">{pat.action}</p></div>
        </div>

        <RepSessions ids={pat.sessionIds} beh={beh} scenario={patternScenario(pat)} onReplay={onReplay} />
        <p className="text-[11px] leading-relaxed text-fg-subtle">Illustrative pattern from this page’s journeys — the recordings are the evidence behind it. Validate with an A/B test.</p>
      </div>
    </Drawer>
  )
}

/* ---------------- Conversion Drivers ---------------- */
const GROUP: Record<DriverGroup, { label: string; tone: string; icon: typeof TrendingUp }> = {
  positive: { label: 'Lifts conversion', tone: 'text-pos', icon: TrendingUp },
  negative: { label: 'Hurts conversion', tone: 'text-neg', icon: TrendingDown },
  combination: { label: 'Combinations that matter', tone: 'text-navy', icon: Lightbulb },
}

function ConversionDriversTab({ drivers, onOpen }: { drivers: Driver[]; onOpen: (d: Driver) => void }) {
  const groups: DriverGroup[] = ['positive', 'combination', 'negative']
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const items = drivers.filter((d) => d.group === g)
        if (items.length === 0) return null
        const G = GROUP[g]
        return (
          <div key={g}>
            <div className={cn('mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide', G.tone)}><G.icon className="h-3.5 w-3.5" />{G.label}</div>
            <div className="space-y-1.5">
              {items.map((d) => <DriverRow key={d.id} d={d} onOpen={() => onOpen(d)} />)}
            </div>
          </div>
        )
      })}
      <p className="text-[11px] leading-relaxed text-fg-subtle">Associated with conversion, not proven to cause it — confirm with an A/B test before acting.</p>
    </div>
  )
}

function liftTone(d: Driver) { return d.group === 'negative' ? 'bg-neg-tint text-neg' : d.group === 'combination' ? 'bg-navy-tint text-navy' : 'bg-pos-tint text-pos' }

function DriverRow({ d, onOpen }: { d: Driver; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group flex w-full items-center gap-3 rounded-[11px] border border-line bg-panel px-3.5 py-2.5 text-left transition-colors hover:border-navy/25 hover:bg-sunken/20">
      <span className={cn('shrink-0 rounded-md px-2 py-1 text-[13px] font-bold tnum', liftTone(d))}>{d.lift}×</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2"><span className="truncate text-[13px] font-semibold text-fg">{d.label}</span><span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-fg-subtle">{d.strength}</span></span>
        <span className="block truncate text-[11.5px] text-fg-muted">{d.interpretation}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

function DriverDetail({ drv, beh, onClose, onReplay }: { drv: Driver; beh: ReturnType<typeof pageBehavior>; onClose: () => void; onReplay: (s: BehSession, scenario?: Scenario) => void }) {
  const neg = drv.group === 'negative'
  return (
    <Drawer onClose={onClose}>
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2"><span className={cn('rounded-md px-2 py-0.5 text-[12px] font-bold tnum', liftTone(drv))}>{drv.lift}×</span><span className="text-[10.5px] font-medium uppercase tracking-wide text-fg-subtle">{drv.strength}</span></div>
          <Dialog.Title className="text-[16px] font-semibold text-fg">{drv.label}</Dialog.Title>
          <Dialog.Description className="mt-0.5 text-[12.5px] text-fg-muted">{drv.interpretation}</Dialog.Description>
        </div>
        <Dialog.Close className="rounded-md p-1 text-fg-subtle transition-colors hover:bg-sunken hover:text-fg"><X className="h-4 w-4" /></Dialog.Close>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="rounded-[10px] bg-sunken px-3.5 py-3 text-[12.5px] leading-relaxed text-fg-muted">
          Journeys that {drv.label.toLowerCase()} {neg ? 'converted at' : 'converted at'} <b className={cn('tnum', neg ? 'text-neg' : 'text-pos')}>{drv.lift}×</b> the rate of comparable journeys that didn’t.
        </div>
        <RepSessions ids={drv.sessionIds} beh={beh} scenario={driverScenario(drv)} onReplay={onReplay} />
        <p className="text-[11px] leading-relaxed text-fg-subtle">A behavioural association, compared against a similar cohort — not proof of cause. Changing it only helps if an A/B test confirms it.</p>
      </div>
    </Drawer>
  )
}
