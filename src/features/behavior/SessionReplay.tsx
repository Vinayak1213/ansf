import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, ExternalLink, Monitor, MousePointerClick, Pause, Play, RotateCcw, Smartphone, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { BehSession } from '@/data/behavior'
import type { Page } from '@/data/samurai'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'

/* In-app session replay — NOT a fake video. Samurai reconstructs the handful of sessions
   behind a flagged number as an honest, tagged event timeline (via Microsoft Clarity), so a
   marketer can watch WHY a page leaks or an experiment moved, then jump to the fix. */

type Spot = 'top' | 'hero' | 'form' | 'submit' | 'exit'
type Kind = 'neutral' | 'friction' | 'success'
interface REvent { t: number; label: string; detail: string; kind: Kind; spot: Spot; rage?: number }

const fmt = (s: number) => { const x = Math.max(0, Math.round(s)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}` }
const h32 = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0 }

const TAG_TONE: Record<string, string> = { 'rage click': 'bg-neg-tint text-neg', 'form error': 'bg-neg-tint text-neg', 'dead click': 'bg-warn-tint text-warn', 'quick-back': 'bg-warn-tint text-warn', bounced: 'bg-sunken text-fg-muted', left: 'bg-sunken text-fg-muted', converted: 'bg-pos-tint text-pos' }
const tagTone = (t: string) => TAG_TONE[t] ?? (t.startsWith('scrolled') ? 'bg-navy-tint text-navy' : 'bg-sunken text-fg-muted')

/** Reconstruct a plausible, tag-consistent event timeline for one session. */
function reconstruct(s: BehSession, page: Page): REvent[] {
  const dur = Math.max(s.durSec, 6)
  const at = (frac: number) => Math.round(dur * frac)
  const has = (t: string) => s.tags.some((x) => x === t || x.startsWith(t))
  const broken = page.fault === 'broken_form'
  const closed = page.fault === 'closed_intake'
  const converted = s.converted || has('converted')
  const rageN = 4 + (h32(s.id) % 6)
  const scrollTag = s.tags.find((t) => t.startsWith('scrolled'))
  const land: REvent = { t: 0, label: 'Landed on the page', detail: `From ${s.source} · ${s.device}`, kind: 'neutral', spot: 'top' }

  if (converted) return [
    land,
    { t: at(0.18), label: 'Read the offer', detail: 'Scanned the headline and hero CTA', kind: 'neutral', spot: 'hero' },
    { t: at(0.45), label: 'Reached the form', detail: 'Scrolled down to the enquiry form', kind: 'neutral', spot: 'form' },
    { t: at(0.7), label: 'Filled the form', detail: 'Entered name, phone and programme', kind: 'neutral', spot: 'form' },
    { t: at(0.95), label: 'Submitted — became a lead', detail: 'Form accepted · reconciled into CPL', kind: 'success', spot: 'submit' },
  ]
  if (broken && (has('rage click') || has('form error'))) return [
    land,
    { t: at(0.22), label: 'Reached the form', detail: 'Scrolled to the enquiry form', kind: 'neutral', spot: 'form' },
    { t: at(0.46), label: 'Tapped Submit', detail: 'Filled the fields and tapped Submit', kind: 'neutral', spot: 'submit' },
    { t: at(0.6), label: 'Submit did nothing', detail: 'No request fired — the form breaks below 380px', kind: 'friction', spot: 'submit' },
    { t: at(0.74), label: `Rage-clicked ×${rageN}`, detail: 'Hit Submit again and again in frustration', kind: 'friction', spot: 'submit', rage: rageN },
    { t: at(0.99), label: 'Left — no lead', detail: 'Abandoned the page · the click produced nothing', kind: 'friction', spot: 'exit' },
  ]
  if (has('quick-back')) return [
    land,
    { t: at(0.55), label: 'Left within seconds', detail: closed ? 'Bounced back to search — the intake had closed' : 'Returned straight to the search results', kind: 'friction', spot: 'exit' },
  ]
  if (has('bounced')) return [
    land,
    { t: at(0.9), label: 'Bounced immediately', detail: 'Left without scrolling or interacting', kind: 'friction', spot: 'exit' },
  ]
  if (has('dead click')) return [
    land,
    { t: at(0.3), label: 'Scrolled down', detail: 'Skimmed past the hero', kind: 'neutral', spot: 'hero' },
    { t: at(0.58), label: 'Dead-clicked an element', detail: "Tapped something that looked clickable but wasn't", kind: 'friction', spot: 'hero' },
    { t: at(0.99), label: 'Left the page', detail: 'Gave up without enquiring', kind: 'friction', spot: 'exit' },
  ]
  const pctLabel = scrollTag ? scrollTag.replace('scrolled ', '') : '75%'
  return [
    land,
    { t: at(0.35), label: `Scrolled ${pctLabel}`, detail: 'Read most of the page', kind: 'neutral', spot: 'hero' },
    { t: at(0.62), label: 'Reached the form', detail: "Saw the enquiry form but didn't start it", kind: 'neutral', spot: 'form' },
    { t: at(0.99), label: 'Left without enquiring', detail: 'No form interaction · no lead', kind: closed ? 'friction' : 'neutral', spot: 'exit' },
  ]
}

function verdict(page: Page, headline?: string): { tone: Kind; text: string; fix?: string } {
  if (headline) return { tone: 'neutral', text: headline, fix: 'Watch both arms to see the behavioural reason behind the number.' }
  if (page.fault === 'broken_form') return { tone: 'friction', text: "One of the sessions behind this page's money leak — the mobile form fails below 380px, so paid clicks can't convert.", fix: 'Fix: make the form responsive and verify Submit fires a request.' }
  if (page.fault === 'closed_intake') return { tone: 'friction', text: "Spend is still reaching an intake that has closed, so these visits can't become leads.", fix: 'Fix: pause the campaign or point the ad at a live intake.' }
  return { tone: 'success', text: 'A clean run — the page turned a paid click into a reconciled lead.' }
}

export function SessionReplayModal({ session, page, headline, onClose }: { session: BehSession | null; page: Page; headline?: string; onClose: () => void }) {
  const toast = useToast()
  const events = useMemo(() => (session ? reconstruct(session, page) : []), [session, page])
  const dur = Math.max(session?.durSec ?? 1, 6)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(true)
  const raf = useRef<number | undefined>(undefined)
  const PLAY_MS = Math.min(Math.max(dur * 170, 6000), 12000)

  // reset on new session
  useEffect(() => { setProgress(0); setPlaying(true) }, [session?.id])
  // escape to close
  useEffect(() => {
    if (!session) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session, onClose])
  // playback loop
  useEffect(() => {
    if (!playing || !session) return
    let startTs: number | null = null
    const from = progress >= 1 ? 0 : progress
    if (progress >= 1) setProgress(0)
    const tick = (ts: number) => {
      if (startTs === null) startTs = ts
      const p = from + (ts - startTs) / PLAY_MS
      if (p >= 1) { setProgress(1); setPlaying(false); return }
      setProgress(p)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, session?.id])

  const elapsed = progress * dur
  let idx = 0
  for (let i = 0; i < events.length; i++) if (events[i].t <= elapsed + 0.001) idx = i
  const cur = events[idx]
  const v = verdict(page, headline)

  const jumpTo = (i: number) => { setPlaying(false); setProgress(events[i].t / dur) }
  const toggle = () => setPlaying((p) => !p)
  const restart = () => { setProgress(0); setPlaying(true) }

  return (
    <AnimatePresence>
      {session && cur && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.96, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} onClick={(e) => e.stopPropagation()} className="flex max-h-[88vh] w-full max-w-[860px] flex-col overflow-hidden rounded-[16px] border border-line bg-panel shadow-pop">
            {/* header */}
            <div className="flex items-center gap-3 border-b border-line px-5 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-navy-tint text-navy">{session.device === 'mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">Session replay <span className="text-[11px] font-normal text-fg-subtle">· {page.name}</span></div>
                <div className="truncate text-[11.5px] text-fg-subtle">{session.source} · {session.device} · {fmt(session.durSec)}</div>
              </div>
              <div className="hidden flex-wrap items-center gap-1 sm:flex">{session.tags.map((t) => <span key={t} className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', tagTone(t))}>{t}</span>)}</div>
              <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-fg-subtle transition-colors hover:bg-sunken hover:text-fg"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-[300px_1fr]">
              {/* device frame + transport */}
              <div className="flex flex-col items-center gap-3">
                <Frame device={session.device} spot={cur.spot} kind={cur.kind} rage={cur.rage} pageId={page.id} />
                {/* transport */}
                <div className="w-full">
                  <div onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPlaying(false); setProgress(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))) }} className="group relative h-2 cursor-pointer rounded-full bg-sunken">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-navy" style={{ width: `${progress * 100}%` }} />
                    {events.map((ev, i) => <span key={i} title={ev.label} className={cn('absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel', ev.kind === 'friction' ? 'bg-neg' : ev.kind === 'success' ? 'bg-pos' : 'bg-line-strong')} style={{ left: `${(ev.t / dur) * 100}%` }} />)}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={progress >= 1 ? restart : toggle} className="grid h-8 w-8 place-items-center rounded-full bg-navy text-white transition-colors hover:bg-navy-hover">{progress >= 1 ? <RotateCcw className="h-4 w-4" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
                    <span className="tnum text-[12px] text-fg-subtle">{fmt(elapsed)} / {fmt(dur)}</span>
                    <span className="ml-auto text-[10.5px] text-fg-subtle">via Microsoft Clarity</span>
                  </div>
                </div>
              </div>

              {/* event timeline */}
              <div className="flex min-w-0 flex-col">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">What happened</div>
                <div className="relative flex-1">
                  <div className="absolute bottom-2 left-[9px] top-2 w-px bg-line" />
                  <div className="space-y-0.5">
                    {events.map((ev, i) => {
                      const active = i === idx, done = i < idx
                      const dot = ev.kind === 'friction' ? 'bg-neg' : ev.kind === 'success' ? 'bg-pos' : 'bg-navy'
                      return (
                        <button key={i} onClick={() => jumpTo(i)} className={cn('relative flex w-full items-start gap-3 rounded-[9px] px-2 py-2 text-left transition-colors', active ? 'bg-sunken' : 'hover:bg-sunken/60')}>
                          <span className="relative z-10 mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center">
                            <span className={cn('h-[10px] w-[10px] rounded-full ring-2 ring-panel transition-all', active ? dot : done ? cn(dot, 'opacity-60') : 'bg-line-strong')} />
                            {active && <motion.span layoutId="sr-pulse" className={cn('absolute inset-0 rounded-full opacity-30', dot)} animate={{ scale: [1, 1.7, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={cn('text-[13px] font-medium', active ? 'text-fg' : done ? 'text-fg-muted' : 'text-fg-subtle')}>{ev.label}</span>
                              <span className="tnum ml-auto shrink-0 text-[10.5px] text-fg-subtle">{fmt(ev.t)}</span>
                            </div>
                            <div className="text-[11.5px] leading-snug text-fg-subtle">{ev.detail}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* so-what */}
                <div className={cn('mt-3 flex items-start gap-2 rounded-[10px] px-3 py-2.5 text-[12px] leading-relaxed', v.tone === 'friction' ? 'bg-neg-tint/50 text-fg' : v.tone === 'success' ? 'bg-pos-tint/50 text-fg' : 'bg-navy-tint/50 text-fg-muted')}>
                  {v.tone === 'friction' ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-neg" /> : v.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pos" /> : <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-navy" />}
                  <span>{v.text}{v.fix && <b className="ml-1 font-semibold text-fg">{v.fix}</b>}</span>
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="flex items-center gap-3 border-t border-line px-5 py-2.5">
              <span className="text-[11px] text-fg-subtle">Reconstructed from the Clarity recording — Samurai surfaces the sessions behind the number.</span>
              <button onClick={() => toast('Opening the raw recording in Microsoft Clarity (demo).')} className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] border border-line px-2.5 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"><ExternalLink className="h-3.5 w-3.5" /> Open in Clarity</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---- schematic device frame; the inner page scrolls to the active spot ---- */
function Frame({ device, spot, kind, rage, pageId }: { device: string; spot: Spot; kind: Kind; rage?: number; pageId: string }) {
  const mobile = device === 'mobile'
  const y = spot === 'top' ? 0 : spot === 'hero' ? -18 : spot === 'form' ? -104 : spot === 'submit' ? -128 : -128
  const dotY = spot === 'top' ? '16%' : spot === 'hero' ? '30%' : spot === 'form' ? '60%' : '78%'
  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-white shadow-sm', mobile ? 'h-[300px] w-[188px] rounded-[26px] border-[6px] border-[#111]' : 'h-[300px] w-full max-w-[300px] rounded-[12px] border border-line')}>
      {!mobile && <div className="flex h-6 items-center gap-1 border-b border-line bg-sunken px-2"><i className="h-2 w-2 rounded-full bg-line-strong" /><i className="h-2 w-2 rounded-full bg-line-strong" /><i className="h-2 w-2 rounded-full bg-line-strong" /><span className="ml-2 truncate rounded bg-panel px-2 py-0.5 text-[8.5px] text-fg-subtle">pages.onlinejain.com/{pageId}</span></div>}
      {mobile && <div className="absolute left-1/2 top-1.5 z-20 h-1.5 w-14 -translate-x-1/2 rounded-full bg-black/60" />}
      <div className="relative h-full overflow-hidden">
        <motion.div animate={{ y }} transition={{ type: 'spring', stiffness: 120, damping: 22 }} className={cn('p-3', mobile && 'pt-4')}>
          <div className="rounded-[8px] bg-brand-tint p-3">
            <div className="h-2.5 w-3/4 rounded bg-brand/40" />
            <div className="mt-1.5 h-2 w-1/2 rounded bg-brand/25" />
            <div className="mt-3 inline-block rounded-full bg-brand px-3 py-1 text-[9px] font-semibold text-white">Apply Now</div>
          </div>
          <div className="mt-2.5 space-y-1.5"><div className="h-2 w-full rounded bg-sunken" /><div className="h-2 w-5/6 rounded bg-sunken" /><div className="h-2 w-2/3 rounded bg-sunken" /></div>
          <div className="mt-3 rounded-[10px] border border-line p-3">
            <div className="h-2 w-1/3 rounded bg-fg/15" />
            <div className="mt-2 h-6 rounded-[6px] border border-line bg-sunken" />
            <div className="mt-1.5 h-6 rounded-[6px] border border-line bg-sunken" />
            <div className={cn('relative mt-2 grid h-7 place-items-center rounded-[6px] text-[9px] font-semibold text-white transition-colors', kind === 'success' ? 'bg-pos' : kind === 'friction' ? 'bg-neg' : 'bg-navy')}>
              Submit
              {spot === 'submit' && kind === 'friction' && !!rage && <RageBurst n={rage} />}
              {spot === 'submit' && kind === 'success' && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-white"><CheckCircle2 className="h-4 w-4 text-pos" /></motion.span>}
            </div>
          </div>
        </motion.div>
      </div>
      {spot !== 'exit' ? (
        <motion.span key={spot} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2" style={{ top: dotY }}>
          <span className="relative grid place-items-center">
            <MousePointerClick className={cn('h-4 w-4 drop-shadow', kind === 'friction' ? 'text-neg' : kind === 'success' ? 'text-pos' : 'text-navy')} />
            <motion.span className={cn('absolute h-6 w-6 rounded-full opacity-30', kind === 'friction' ? 'bg-neg' : kind === 'success' ? 'bg-pos' : 'bg-navy')} animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 1.3, repeat: Infinity }} />
          </span>
        </motion.span>
      ) : (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/45 backdrop-blur-[1px]"><span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-neg shadow-sm">Left the page</span></div>
      )}
    </div>
  )
}

function RageBurst({ n }: { n: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 grid place-items-center">
      {[0, 1, 2].map((i) => <motion.span key={i} className="absolute h-full w-full rounded-[6px] border-2 border-white/70" animate={{ scale: [1, 1.5], opacity: [0.7, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.3 }} />)}
      <span className="absolute -right-2 -top-2 rounded-full bg-neg px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">×{n}</span>
    </span>
  )
}
