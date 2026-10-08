import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowUp, BarChart3, CalendarClock, Command, FileText, FlaskConical, History, Plus, Scissors, ScrollText, Sparkles, Target, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { buildInsight, PROMPTS, routeQuestion } from './engine'
import { AnswerCard, AiOrb } from './AnswerCard'
import { GenerativeChart } from './GenerativeChart'
import { Button } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { cn, inr } from '@/lib/utils'
import { ACCOUNT, LEAKS, QUARTER, pageName } from '@/data/samurai'

type Turn = { key: string; q: string; id: number }
type Report = { id: string; title: string; keys: string[]; sched?: string }

const STARTER_ICON: Record<string, typeof Target> = { leak: AlertTriangle, dearest: TrendingUp, cut: Scissors, test: FlaskConical, pacing: Target, platform: BarChart3, digest: ScrollText }
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

export function SamuraiAI() {
  const toast = useToast()
  const [view, setView] = useState<'chat' | 'report'>('chat')
  const [tab, setTab] = useState<'reports' | 'scheduled' | 'history'>('reports')
  const [thread, setThread] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [draft, setDraft] = useState<Report | null>(null)
  const [reports, setReports] = useState<Report[]>([{ id: 'r1', title: 'Weekly performance review', keys: ['pacing', 'leak', 'platform'], sched: 'Weekly · Mon 9:00 AM' }])
  const [openReport, setOpenReport] = useState<Report | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const empty = thread.length === 0

  const ask = (key: string, q: string) => setThread((t) => [...t, { key, q, id: Date.now() + t.length }])
  const submit = () => { const v = input.trim(); if (!v) return; ask(routeQuestion(v), v); setInput('') }

  // keep the newest turn in view — the composer never moves, only the thread grows above it
  useEffect(() => { if (!empty) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [thread.length, empty])

  const addToReport = (key: string) => {
    setDraft((d) => ({ ...(d ?? { id: 'draft', title: 'Untitled report', keys: [] }), keys: [...(d?.keys ?? []), key] }))
    const n = (draft?.keys.length ?? 0) + 1
    toast(`Added to report — ${n} section${n !== 1 ? 's' : ''}. Open the Reports tab to compose it.`)
  }
  const saveDraft = () => {
    if (!draft) return
    const r = { ...draft, id: 'r' + Math.random().toString(36).slice(2, 6), title: draft.title === 'Untitled report' ? 'New report' : draft.title }
    setReports((rs) => [r, ...rs]); setDraft(null); toast(`Report saved — "${r.title}".`); setTab('reports')
  }

  if (view === 'report' && openReport) return <ReportDoc report={openReport} onBack={() => setView('chat')} onSchedule={() => toast('Report scheduled — delivered weekly by email & WhatsApp.')} />

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-surface">
      {/* scroll region */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          {empty ? (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mx-auto max-w-[860px] px-6 pb-10 pt-10">
              <Landing onPick={ask} />
              <div className="mt-9"><NeedsAttention onPick={ask} /></div>
              <div className="mt-8"><Workspace tab={tab} setTab={setTab} reports={reports} draft={draft} onOpen={(r) => { setOpenReport(r); setView('report') }} onSaveDraft={saveDraft} onNew={() => { setDraft({ id: 'draft', title: 'Untitled report', keys: ['digest'] }); setTab('reports') }} onOpenHistory={ask} /></div>
            </motion.div>
          ) : (
            <motion.div key="thread" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="mx-auto max-w-[760px] px-6 py-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg-muted"><Sparkles className="h-3.5 w-3.5 text-navy" /> Samurai AI <span className="text-fg-subtle">· conversation</span></span>
                <button onClick={() => setThread([])} className="ml-auto inline-flex items-center gap-1 rounded-full border border-line bg-panel px-2.5 py-1 text-[11.5px] font-medium text-fg-muted transition-colors hover:border-navy/30 hover:text-navy"><Plus className="h-3 w-3" /> New chat</button>
              </div>
              <div className="space-y-7">
                {thread.map((t, i) => (
                  <div key={t.id} className="space-y-3">
                    <div className="flex justify-end"><div className="max-w-[82%] rounded-[15px] rounded-tr-sm bg-navy px-3.5 py-2 text-[13.5px] font-medium text-white shadow-sm">{t.q}</div></div>
                    <AnswerCard insight={buildInsight(t.key)} live={i === thread.length - 1} onAddToReport={addToReport} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* docked composer — stable, never jumps */}
      <div className="shrink-0 border-t border-line bg-gradient-to-b from-transparent to-surface">
        <div className="mx-auto max-w-[760px] px-6 pb-4 pt-3">
          {!empty && <FollowUps lastKey={thread[thread.length - 1]?.key} onPick={ask} />}
          <Composer value={input} onChange={setInput} onSubmit={submit} />
          <p className="mt-2 text-center text-[11px] text-fg-subtle">Grounded in your data — Samurai reads your numbers, it doesn't invent them.</p>
        </div>
      </div>
    </div>
  )
}

/* ---------------- landing ---------------- */
function Landing({ onPick }: { onPick: (k: string, q: string) => void }) {
  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="text-center">
        <AiOrb className="mx-auto mb-4 h-14 w-14" />
        <h1 className="text-[26px] font-semibold tracking-tight text-fg">{greeting()} — what can I analyse?</h1>
        <p className="mx-auto mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-fg-subtle">Ask about spend, pages, experiments or targets. Every answer is composed from your connected, reconciled data — then you can drop it into a report and schedule it to your team.</p>
      </motion.div>
      <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.045, delayChildren: 0.15 } } }} className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {PROMPTS.map((p) => {
          const Icon = STARTER_ICON[p.key] ?? Sparkles
          return (
            <motion.button key={p.key} variants={{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }} onClick={() => onPick(p.key, p.q)} whileHover={{ y: -2 }} className="group flex items-center gap-3 rounded-[12px] border border-line bg-panel px-3.5 py-3 text-left shadow-sm transition-colors hover:border-navy/30 hover:bg-navy-tint/30">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-navy-tint text-navy transition-colors group-hover:bg-navy group-hover:text-white"><Icon className="h-4 w-4" /></span>
              <span className="text-[13px] font-medium leading-snug text-fg">{p.q}</span>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}

/* ---------------- composer (stable dock) ---------------- */
function Composer({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 132) + 'px' } }, [value])
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="flex items-end gap-2 rounded-[16px] border border-line-strong bg-panel px-3 py-2 shadow-md transition-shadow focus-within:border-navy/40 focus-within:shadow-lg">
      <Sparkles className="mb-1.5 h-4 w-4 shrink-0 text-navy/60" />
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit() } }}
        placeholder="Ask a question, or paste a page / campaign link…"
        className="max-h-[132px] flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-relaxed text-fg outline-none placeholder:text-fg-subtle"
      />
      <span className="mb-1.5 hidden items-center gap-0.5 text-[10.5px] text-fg-subtle sm:flex"><Command className="h-3 w-3" />↵</span>
      <button type="submit" disabled={!value.trim()} className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-navy text-white shadow-sm transition-all hover:bg-navy-hover disabled:opacity-30" aria-label="Send">
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  )
}

function FollowUps({ lastKey, onPick }: { lastKey?: string; onPick: (k: string, q: string) => void }) {
  const items = useMemo(() => PROMPTS.filter((p) => p.key !== lastKey).slice(0, 3), [lastKey])
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium text-fg-subtle">Follow up:</span>
      {items.map((p) => (
        <button key={p.key} onClick={() => onPick(p.key, p.q)} className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11.5px] text-fg-muted transition-colors hover:border-navy/40 hover:bg-navy-tint hover:text-navy">{p.q}</button>
      ))}
    </div>
  )
}

/* ---------------- needs attention ---------------- */
function NeedsAttention({ onPick }: { onPick: (k: string, q: string) => void }) {
  const alerts = LEAKS.filter((l) => l.severity === 'confirmed')
  const total = alerts.reduce((a, l) => a + l.amount, 0)
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-panel shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-line bg-gradient-to-r from-warn-tint/60 to-transparent px-4 py-3">
        <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warn/50" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warn" /></span>
        <div className="flex-1"><div className="text-[13px] font-semibold text-fg">Needs your attention</div><div className="text-[11.5px] text-fg-subtle">Surfaced by Samurai AI, no prompt needed</div></div>
        <span className="rounded-md bg-neg-tint px-2 py-0.5 text-[11px] font-bold text-neg">{inr(total)} at risk</span>
      </div>
      {alerts.map((l, i) => {
        const key = l.reason === 'closed_intake' ? 'cut' : 'leak'
        return (
          <motion.button key={l.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} onClick={() => onPick(key, PROMPTS.find((p) => p.key === key)!.q)} className="group flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-sunken">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-neg-tint text-neg"><AlertTriangle className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-fg">{pageName(l.page)} — {inr(l.amount)} at risk</div>
              <div className="truncate text-[11.5px] text-fg-subtle">{l.detail}</div>
            </div>
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-navy opacity-0 transition-opacity group-hover:opacity-100">Investigate →</span>
          </motion.button>
        )
      })}
    </div>
  )
}

/* ---------------- workspace (reports / scheduled / history) ---------------- */
function Workspace({ tab, setTab, reports, draft, onOpen, onSaveDraft, onNew, onOpenHistory }: { tab: 'reports' | 'scheduled' | 'history'; setTab: (t: 'reports' | 'scheduled' | 'history') => void; reports: Report[]; draft: Report | null; onOpen: (r: Report) => void; onSaveDraft: () => void; onNew: () => void; onOpenHistory: (k: string, q: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-1 border-b border-line">
        <TabBtn active={tab === 'reports'} onClick={() => setTab('reports')} icon={FileText} label="Reports" n={reports.length} />
        <TabBtn active={tab === 'scheduled'} onClick={() => setTab('scheduled')} icon={CalendarClock} label="Scheduled" n={2} />
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')} icon={History} label="History" n={2} />
        <div className="ml-auto pb-1.5"><Button variant="navy" size="sm" onClick={onNew}><Plus className="h-3.5 w-3.5" /> New report</Button></div>
      </div>
      <div className="pt-4">
        {tab === 'reports' && <ReportsTab reports={reports} draft={draft} onOpen={onOpen} onSaveDraft={onSaveDraft} />}
        {tab === 'scheduled' && <ScheduledTab />}
        {tab === 'history' && <HistoryTab onOpen={onOpenHistory} />}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label, n }: { active: boolean; onClick: () => void; icon: typeof FileText; label: string; n: number }) {
  return (
    <button onClick={onClick} className={cn('-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors', active ? 'border-navy text-navy' : 'border-transparent text-fg-subtle hover:text-fg')}>
      <Icon className="h-3.5 w-3.5" />{label}<span className="tabular-nums text-[11px] text-fg-subtle">{n}</span>
    </button>
  )
}

function ReportsTab({ reports, draft, onOpen, onSaveDraft }: { reports: Report[]; draft: Report | null; onOpen: (r: Report) => void; onSaveDraft: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {draft && draft.keys.length > 0 && <ReportCard report={draft} draft onOpen={() => onOpen(draft)} onSave={onSaveDraft} />}
      {reports.map((r) => <ReportCard key={r.id} report={r} onOpen={() => onOpen(r)} />)}
    </div>
  )
}

function ReportCard({ report, draft, onOpen, onSave }: { report: Report; draft?: boolean; onOpen: () => void; onSave?: () => void }) {
  return (
    <motion.div whileHover={{ y: -2 }} className={cn('flex cursor-pointer flex-col gap-2 rounded-[var(--radius-lg)] border bg-panel p-4 shadow-sm', draft ? 'border-dashed border-navy/40' : 'border-line hover:border-navy/30')} onClick={onOpen}>
      <div className="flex items-center justify-between">
        <AiOrb className="h-7 w-7" />
        {report.sched ? <span className="rounded-md border border-navy/15 bg-navy-tint px-2 py-0.5 text-[10.5px] font-semibold text-navy">⏱ {report.sched}</span> : <span className="rounded-md border border-line bg-sunken px-2 py-0.5 text-[10.5px] font-medium text-fg-subtle">{draft ? 'Unsaved draft' : 'Not scheduled'}</span>}
      </div>
      <div className="text-[15px] font-semibold text-fg">{report.title}</div>
      <div className="text-[12px] text-fg-subtle">{report.keys.length} section{report.keys.length !== 1 ? 's' : ''} · This month</div>
      <div className="flex flex-col gap-0.5 text-[11.5px] text-fg-subtle">{report.keys.slice(0, 3).map((k, i) => <span key={i} className="truncate">{buildInsight(k).headline}</span>)}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-[12px] font-medium text-navy">Open &amp; view →</span>
        {draft && onSave && <button onClick={(e) => { e.stopPropagation(); onSave() }} className="ml-auto rounded-md border border-line px-2 py-1 text-[11.5px] font-medium text-fg-muted hover:border-line-strong">Save report</button>}
      </div>
    </motion.div>
  )
}

function ScheduledTab() {
  const rows = [
    { t: 'Weekly leak review', p: 'Where is my ad spend leaking, and what should I fix first?', f: 'Weekly · Monday 9:00 AM IST', to: 'akshay.r@jainonline.edu', via: 'Email · WhatsApp' },
    { t: 'Daily intake pacing', p: 'Am I on track for the January intake, and the projected gap?', f: 'Daily · 8:30 AM IST', to: 'akshay.r + 1', via: 'Email' },
  ]
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-panel px-4 py-3 shadow-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-navy-tint text-navy"><CalendarClock className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1"><div className="text-[13.5px] font-medium text-fg">{r.t}</div><div className="truncate text-[12px] text-fg-subtle">{r.p}</div></div>
          <div className="shrink-0 text-right text-[12px]"><div className="font-medium text-fg">{r.f}</div><div className="text-fg-subtle">{r.to} · {r.via}</div></div>
        </div>
      ))}
      <p className="px-1 text-[11.5px] text-fg-subtle">Each report is composed from your reconciled data <b className="font-medium text-fg-muted">at send time</b> — never a stale snapshot — and delivered by email or WhatsApp.</p>
    </div>
  )
}

function HistoryTab({ onOpen }: { onOpen: (k: string, q: string) => void }) {
  const items = [{ key: 'leak', when: 'Today, 9:04 AM' }, { key: 'platform', when: 'Yesterday, 8:30 AM' }]
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-panel shadow-sm">
      {items.map((it, i) => {
        const ins = buildInsight(it.key)
        return (
          <button key={i} onClick={() => onOpen(it.key, ins.question)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-sunken">
            <AiOrb className="h-7 w-7" />
            <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium text-fg">{ins.question}</div><div className="text-[11.5px] text-fg-subtle">{it.when}</div></div>
            <ScrollText className="h-4 w-4 shrink-0 text-fg-subtle" />
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- report document (with a composing state) ---------------- */
function ReportDoc({ report, onBack, onSchedule }: { report: Report; onBack: () => void; onSchedule: () => void }) {
  const [composing, setComposing] = useState(true)
  useEffect(() => { const t = setTimeout(() => setComposing(false), 1150); return () => clearTimeout(t) }, [])
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const insights = report.keys.map((k) => buildInsight(k))
  const kpis = [
    { v: inr(ACCOUNT.cpl), l: 'Blended CPL' }, { v: inr(ACCOUNT.spend), l: 'Spend, this month' },
    { v: String(ACCOUNT.leads), l: 'Leads, this month' }, { v: `${QUARTER.enrol} / ${QUARTER.target}`, l: `${QUARTER.intake} enrolments` },
  ]
  const steps = ['Pulling reconciled figures', 'Composing each section', 'Rendering charts', 'Finalising the document']
  return (
    <div className="mx-auto max-w-[820px] px-6 py-6">
      <div className="mb-4 flex items-center gap-2 text-[13px] text-fg-muted">
        <button onClick={onBack} className="font-medium hover:text-fg">Samurai AI</button>
        <span className="text-fg-subtle">/ Report / {composing ? 'Composing' : 'Preview'}</span>
        <Button variant="navy" size="sm" className="ml-auto" disabled={composing} onClick={onSchedule}><CalendarClock className="h-3.5 w-3.5" /> Schedule delivery</Button>
      </div>
      <AnimatePresence mode="wait">
        {composing ? (
          <motion.div key="composing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid min-h-[420px] place-items-center rounded-[var(--radius-xl)] border border-line bg-panel shadow-lg">
            <div className="w-full max-w-[340px] text-center">
              <AiOrb className="mx-auto mb-4 h-12 w-12 animate-pulse" />
              <div className="text-[14px] font-semibold text-fg">Composing “{report.title}”…</div>
              <div className="mt-4 space-y-2 text-left">
                {steps.map((s, i) => (
                  <motion.div key={s} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 + i * 0.24 }} className="flex items-center gap-2 text-[12.5px] text-fg-muted">
                    <motion.span className="h-1.5 w-1.5 rounded-full bg-navy" animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} />{s}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="doc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[var(--radius-xl)] border border-line bg-panel shadow-lg">
            <div className="border-b border-line bg-gradient-to-b from-navy-tint to-transparent px-8 py-8 text-center">
              <AiOrb className="mx-auto mb-3 h-12 w-12" />
              <h1 className="text-[26px] font-bold tracking-tight text-fg">{report.title}</h1>
              <p className="mt-1 text-[12.5px] text-fg-subtle">Prepared by Samurai AI · {today} · This month</p>
              <div className="mt-5 flex flex-wrap justify-center gap-8">{kpis.map((k) => <div key={k.l}><div className="tnum text-[20px] font-bold text-fg">{k.v}</div><div className="text-[11px] text-fg-subtle">{k.l}</div></div>)}</div>
            </div>
            <section className="border-b border-line px-8 py-6">
              <h2 className="mb-3 text-[16px] font-semibold text-fg">Executive summary</h2>
              <p className="mb-2 text-[13px] leading-relaxed text-fg-muted">This report covers {insights.length} area{insights.length !== 1 ? 's' : ''} of your account performance, each composed from reconciled data:</p>
              <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-fg-muted marker:text-navy/40">{insights.map((ins) => <li key={ins.key}><b className="font-semibold text-fg">{ins.headline}.</b> {ins.summary}</li>)}</ul>
            </section>
            {insights.map((ins, i) => (
              <section key={ins.key} className="border-b border-line px-8 py-6 last:border-0">
                <h2 className="mb-3 text-[15px] font-semibold text-fg">{i + 1}. {ins.headline}</h2>
                {ins.narrative.map((p, j) => <p key={j} className="mb-2 text-[13px] leading-relaxed text-fg-muted">{p.replace(/\*\*/g, '')}</p>)}
                <div className="mt-3"><GenerativeChart spec={ins.chart} /></div>
              </section>
            ))}
            <div className="px-8 py-5 text-center text-[11.5px] text-fg-subtle">Every figure in this report is composed from Samurai's reconciled data — not a generated estimate. Generated {today}.</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
