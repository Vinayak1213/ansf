import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { createContext, useContext, useReducer, useState, type ReactNode } from 'react'
import { Wizard, type WizResult } from './Wizard'
import { Button } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { useNav } from '@/lib/nav'
import { inr } from '@/lib/utils'
import { EXPERIMENTS, PAGES, ecpl, type Experiment } from '@/data/samurai'
import { estDecision, expById } from '@/data/experiments'
import { TEMPLATES, elLabel, type ExperimentTemplate } from '@/data/templates'

type ExpTab = 'tests' | 'templates'
const Ctx = createContext<{
  rev: number
  openWizard: (pageId?: string) => void
  openDeclare: (id: string) => void
  openStop: (id: string) => void
  templates: ExperimentTemplate[]
  getTemplate: (id: string) => ExperimentTemplate | undefined
  saveTemplate: (t: ExperimentTemplate) => void
  launchFromTemplate: (t: ExperimentTemplate) => void
  expTab: ExpTab
  setExpTab: (t: ExpTab) => void
}>({
  rev: 0, openWizard: () => {}, openDeclare: () => {}, openStop: () => {},
  templates: [], getTemplate: () => undefined, saveTemplate: () => {}, launchFromTemplate: () => {}, expTab: 'tests', setExpTab: () => {},
})
export const useExp = () => useContext(Ctx)

const todayStr = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function ExperimentsProvider({ children }: { children: ReactNode }) {
  const [rev, bump] = useReducer((x) => x + 1, 0)
  const toast = useToast()
  const { go } = useNav()
  const [wiz, setWiz] = useState<{ open: boolean; page?: string }>({ open: false })
  const [declareId, setDeclareId] = useState<string | null>(null)
  const [stopId, setStopId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<ExperimentTemplate[]>(TEMPLATES)
  const [expTab, setExpTab] = useState<ExpTab>('tests')

  const getTemplate = (id: string) => templates.find((t) => t.id === id)
  const saveTemplate = (t: ExperimentTemplate) => {
    setTemplates((ts) => {
      const i = ts.findIndex((x) => x.id === t.id)
      if (i >= 0) { const c = [...ts]; c[i] = t; return c }
      return [{ ...t, id: 'tpl' + Math.random().toString(36).slice(2, 6) }, ...ts]
    })
    setExpTab('templates')
    go('experiments')
    toast(`Template saved — "${t.name || 'Untitled template'}".`)
  }
  // launch an N-variant test directly from a template (it already carries the variant pages, variables & placement)
  const launchFromTemplate = (t: ExperimentTemplate) => {
    const named = t.variables.filter((v) => v.name.trim())
    const goalV = named.find((v) => v.isGoal) ?? named[0]
    const vs = [...t.variants].sort((a, b) => a.letter.localeCompare(b.letter))
    if (vs.length < 2 || !goalV) { toast('Add at least two variants and a variable first.'); return }
    const pname = (pid: string) => PAGES.find((x) => x.id === pid)?.name ?? pid
    const controlPageId = vs[0].pageId
    const p = PAGES.find((x) => x.id === controlPageId)
    const est = estDecision(p, 1)
    const id = 'e-new-' + Math.random().toString(36).slice(2, 6)
    const variants = vs.map((vr) => ({ letter: vr.letter, pageId: vr.pageId, name: pname(vr.pageId), v: 0, spend: 0 }))
    const variables = named.map((v) => ({
      id: v.id, name: v.name.trim(), isGoal: v.isGoal,
      arms: Object.fromEntries(vs.map((vr) => { const el = t.placement[vr.pageId]?.[v.id]; return [vr.letter, { button: el ? elLabel(el) : '', count: 0 }] })),
    }))
    EXPERIMENTS.unshift({
      id, name: t.name || 'New multi-variant test', pageId: controlPageId, group: p?.group ?? 'Other', status: 'running', verdict: 'pending', goal: goalV.name.trim(), days: 0, estDays: est.days,
      templateId: t.id, templateName: t.name, dashboard: t.dashboard,
      control: { v: 0, leads: 0, spend: 0 }, variant: { v: 0, leads: 0, spend: 0 }, corr: [],
      variants, variables,
      narrative: { hyp: t.change || '—', going: 'Just launched — collecting data.', decide: `Decides in about ${est.human} at this volume.` },
    })
    setExpTab('tests')
    bump()
    go('experimentdetail', id)
    toast('Multi-variant test launched — collecting data.')
  }

  const launch = (r: WizResult) => {
    const p = PAGES.find((x) => x.id === r.pageId)
    const est = estDecision(p, r.goalMult)
    const id = 'e-new-' + Math.random().toString(36).slice(2, 6)
    EXPERIMENTS.unshift({
      id, name: r.name, pageId: r.pageId, group: p?.group ?? 'Other', status: 'running', verdict: 'pending', goal: r.goalLabel, days: 0, estDays: est.days,
      templateId: r.templateId, templateName: r.templateName, dashboard: r.dashboard,
      control: { v: 0, leads: 0, spend: 0 }, variant: { v: 0, leads: 0, spend: 0 }, corr: [],
      narrative: { hyp: r.change || '—', going: 'Just launched — collecting data.', decide: `Decides in about ${est.human} at this volume.` },
    })
    setWiz({ open: false })
    bump()
    go('experimentdetail', id)
    toast(`Test launched — decides in ~${est.human}.`)
  }
  const declare = (id: string, win: 'A' | 'B', reason: string) => {
    const e = expById(id)
    if (!e) return
    e.status = 'ended'
    e.verdict = win === 'B' ? 'best' : 'low'
    e.decision = { by: 'Akshay R', date: todayStr(), reason, learned: 'Recorded when the winner was declared.' }
    setDeclareId(null)
    bump()
    go('experimentdetail', id)
    toast(`Winner declared — Variant ${win} shipped.`)
  }
  const stop = (id: string) => {
    const e = expById(id)
    if (!e) return
    e.status = 'stopped'
    setStopId(null)
    bump()
    toast('Test stopped.')
  }

  return (
    <Ctx.Provider value={{ rev, openWizard: (page) => setWiz({ open: true, page }), openDeclare: setDeclareId, openStop: setStopId, templates, getTemplate, saveTemplate, launchFromTemplate, expTab, setExpTab }}>
      {children}
      <Wizard open={wiz.open} initialPage={wiz.page} onClose={() => setWiz({ open: false })} onLaunch={launch} />
      <DeclareDialog exp={declareId ? expById(declareId) : undefined} onClose={() => setDeclareId(null)} onConfirm={declare} />
      <StopDialog exp={stopId ? expById(stopId) : undefined} onClose={() => setStopId(null)} onConfirm={stop} />
    </Ctx.Provider>
  )
}

function Shell({ title, sub, children, footer, onClose }: { title: string; sub: string; children: ReactNode; footer: ReactNode; onClose: () => void }) {
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        <Dialog.Portal forceMount>
          <Dialog.Overlay asChild>
            <motion.div className="fixed inset-0 z-50 bg-fg/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          </Dialog.Overlay>
          <Dialog.Content asChild>
            <motion.div className="fixed left-1/2 top-1/2 z-50 w-[460px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-line bg-panel shadow-lg focus:outline-none" initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }}>
              <div className="flex items-start justify-between border-b border-line p-4">
                <div><Dialog.Title className="text-[15px] font-semibold text-fg">{title}</Dialog.Title><Dialog.Description className="mt-0.5 text-[12px] text-fg-subtle">{sub}</Dialog.Description></div>
                <Dialog.Close className="text-fg-subtle hover:text-fg"><X className="h-4 w-4" /></Dialog.Close>
              </div>
              <div className="p-4">{children}</div>
              <div className="flex justify-end gap-2 border-t border-line p-3">{footer}</div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </AnimatePresence>
    </Dialog.Root>
  )
}

function DeclareDialog({ exp, onClose, onConfirm }: { exp?: Experiment; onClose: () => void; onConfirm: (id: string, win: 'A' | 'B', reason: string) => void }) {
  const cc = exp ? ecpl(exp.control) : null
  const vc = exp ? ecpl(exp.variant) : null
  const rec: 'A' | 'B' = vc != null && cc != null && vc < cc ? 'B' : 'A'
  const [win, setWin] = useState<'A' | 'B'>(rec)
  const [reason, setReason] = useState('')
  const [wasOpen, setWasOpen] = useState(false)
  if (exp && !wasOpen) { setWasOpen(true); setWin(rec); setReason('') }
  if (!exp && wasOpen) setWasOpen(false)
  if (!exp) return null
  return (
    <Shell
      title="Declare a winner"
      sub={`${exp.name} — ships the chosen version live on the page.`}
      onClose={onClose}
      footer={<>
        <Button variant="default" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" disabled={!reason.trim()} onClick={() => onConfirm(exp.id, win, reason.trim())}>Declare &amp; ship</Button>
      </>}
    >
      <div className="mb-3 grid grid-cols-2 gap-2">
        {(['A', 'B'] as const).map((k) => (
          <button key={k} onClick={() => setWin(k)} className={`rounded-[10px] border px-3 py-2.5 text-left transition-colors ${win === k ? 'border-brand bg-brand-tint' : 'border-line hover:border-line-strong'}`}>
            <b className="text-[13px] text-fg">{k === 'A' ? 'Control (A)' : 'Variant B'}</b>
            <div className="text-[11.5px] text-fg-subtle tnum">{(k === 'A' ? cc : vc) ? inr((k === 'A' ? cc : vc)!) + ' per lead' : '—'}{k === 'B' && rec === 'B' ? ' · cheaper' : ''}</div>
          </button>
        ))}
      </div>
      <label className="block"><span className="mb-1 block text-[12px] font-medium text-fg-muted">Reason (required)</span><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Why this version wins…" className="input h-auto py-2" /></label>
      <p className="mt-3 rounded-[10px] bg-sunken px-3 py-2 text-[12px] text-fg-subtle">A decision record is saved and the page starts serving the winner — <b>no developer or deploy needed</b>.</p>
    </Shell>
  )
}

function StopDialog({ exp, onClose, onConfirm }: { exp?: Experiment; onClose: () => void; onConfirm: (id: string) => void }) {
  if (!exp) return null
  return (
    <Shell
      title="Stop test"
      sub={`${exp.name} — stops counting; both versions stay live.`}
      onClose={onClose}
      footer={<>
        <Button variant="default" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="danger" size="sm" onClick={() => onConfirm(exp.id)}>Stop test</Button>
      </>}
    >
      <label className="block"><span className="mb-1 block text-[12px] font-medium text-fg-muted">Reason</span>
        <select className="input"><option>Campaign paused</option><option>Inconclusive at this volume</option><option>Superseded by another test</option><option>Other</option></select>
      </label>
      <p className="mt-3 rounded-[10px] bg-sunken px-3 py-2 text-[12px] text-fg-subtle">Stopping is <b>not</b> a result — the idea is untested, not disproved. You can restart it from the page later.</p>
    </Shell>
  )
}
