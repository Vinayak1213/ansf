import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, Boxes, Check, Copy, FlaskConical, Layers, Pencil, Plus, Rocket, Upload, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'
import { NetIcon } from '@/features/Pages'
import { cn, inr } from '@/lib/utils'
import { PAGES } from '@/data/samurai'
import { pageNet, pageRunningTest } from '@/data/pages'
import { DETECTED, SCENARIOS, elMult, estDecision, scenByKey } from '@/data/experiments'
import { goalVariable, type ExperimentTemplate } from '@/data/templates'

export interface WizResult {
  pageId: string
  name: string
  change: string
  goalLabel: string
  goalMult: number
  templateId?: string
  templateName?: string
  dashboard?: string[]
}

// Step 0 ("Start") is the single entry point for every test: pick a proven template (one-click launch) or
// start a quick A/B from scratch, which walks steps 1–4.
const STEPS = ['Start', 'Page', 'The change', 'Goal', 'Review']

export function Wizard({
  open, initialPage, onClose, onLaunch,
  templates, onLaunchTemplate, onEditTemplate, onDuplicateTemplate, onNewTemplate,
}: {
  open: boolean
  initialPage?: string
  onClose: () => void
  onLaunch: (r: WizResult) => void
  templates: ExperimentTemplate[]
  onLaunchTemplate: (t: ExperimentTemplate) => void
  onEditTemplate: (t: ExperimentTemplate) => void
  onDuplicateTemplate: (t: ExperimentTemplate) => void
  onNewTemplate: () => void
}) {
  // When launched from a specific page, the intent is a quick A/B on that page — skip Start, open at Page.
  const minStep = initialPage ? 1 : 0
  const [step, setStep] = useState(minStep)
  const [pageId, setPageId] = useState(initialPage ?? '')
  const [name, setName] = useState('')
  const [change, setChange] = useState('')
  const [uploaded, setUploaded] = useState(false)
  const [goal, setGoal] = useState('apply')
  const [customEl, setCustomEl] = useState(DETECTED[0])

  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setStep(minStep); setPageId(initialPage ?? ''); setName(''); setChange(''); setUploaded(false); setGoal('apply'); setCustomEl(DETECTED[0])
  }
  if (!open && wasOpen) setWasOpen(false)

  const p = PAGES.find((x) => x.id === pageId)
  const goalMult = goal === 'custom' ? elMult(customEl) : scenByKey(goal)?.mult ?? 1
  const goalLabel = goal === 'custom' ? `Custom · ${customEl}` : scenByKey(goal)?.name ?? ''
  const canNext = step === 1 ? !!pageId : step === 2 ? uploaded : true

  const launch = () => onLaunch({ pageId, name: name || 'New variant', change, goalLabel, goalMult })

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-50 bg-fg/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-48px)] w-[660px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[18px] border border-line bg-panel shadow-lg focus:outline-none"
                initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              >
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                  <Dialog.Title className="text-[15px] font-semibold text-fg">{step === 0 ? 'New experiment' : 'New experiment · quick A/B'}</Dialog.Title>
                  <Dialog.Close className="text-fg-subtle hover:text-fg"><X className="h-4 w-4" /></Dialog.Close>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto border-b border-line px-5 py-3">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold', i === step ? 'bg-navy text-white' : i < step ? 'bg-pos text-white' : 'bg-sunken text-fg-subtle')}>{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
                      <span className={cn('whitespace-nowrap text-[12px] font-medium', i === step ? 'text-fg' : 'text-fg-subtle')}>{s}</span>
                      {i < STEPS.length - 1 && <span className="mx-1 h-px w-5 bg-line" />}
                    </div>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {step === 0 && <StepStart templates={templates} onLaunchTemplate={onLaunchTemplate} onEditTemplate={onEditTemplate} onDuplicateTemplate={onDuplicateTemplate} onNewTemplate={onNewTemplate} onScratch={() => setStep(1)} />}
                  {step === 1 && <StepPage pageId={pageId} onPick={setPageId} />}
                  {step === 2 && <StepChange name={name} setName={setName} change={change} setChange={setChange} uploaded={uploaded} setUploaded={setUploaded} slug={p?.id ?? 'page'} />}
                  {step === 3 && <StepGoal p={p} goal={goal} setGoal={setGoal} customEl={customEl} setCustomEl={setCustomEl} uploaded={uploaded} />}
                  {step === 4 && <StepReview p={p} name={name} goalLabel={goalLabel} est={estDecision(p, goalMult)} />}
                </div>
                <div className="flex items-center border-t border-line px-5 py-3">
                  {step > minStep ? <Button variant="default" size="sm" onClick={() => setStep((s) => s - 1)}>Back</Button> : <span />}
                  <div className="flex-1" />
                  {step === 0 ? (
                    <Button variant="primary" size="sm" onClick={() => setStep(1)}>Start from scratch</Button>
                  ) : step < STEPS.length - 1 ? (
                    <Button variant="primary" size="sm" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Continue</Button>
                  ) : (
                    <Button variant="primary" size="sm" onClick={launch}>Launch test</Button>
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

function StepStart({ templates, onLaunchTemplate, onEditTemplate, onDuplicateTemplate, onNewTemplate, onScratch }: {
  templates: ExperimentTemplate[]
  onLaunchTemplate: (t: ExperimentTemplate) => void
  onEditTemplate: (t: ExperimentTemplate) => void
  onDuplicateTemplate: (t: ExperimentTemplate) => void
  onNewTemplate: () => void
  onScratch: () => void
}) {
  return (
    <div>
      <div className="text-[15px] font-semibold text-fg">How do you want to start?</div>
      <div className="mb-4 mt-1 text-[12.5px] leading-relaxed text-fg-subtle">Launch a proven multi-variant template in one click — the variant pages, your variables and the alerts are already set up — or build a quick A/B from scratch.</div>

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Start from a proven template</div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {templates.map((t) => (
          <TemplatePick key={t.id} t={t} onLaunch={() => onLaunchTemplate(t)} onEdit={() => onEditTemplate(t)} onDup={() => onDuplicateTemplate(t)} />
        ))}
        <button onClick={onNewTemplate} className="flex min-h-[132px] flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed border-line-strong bg-panel/50 text-fg-subtle transition-colors hover:border-navy/40 hover:bg-navy-tint/30 hover:text-navy">
          <Plus className="h-5 w-5" /><b className="text-[12.5px]">Build a new template</b><span className="text-[11px]">Set one up in the sandbox</span>
        </button>
      </div>

      <div className="my-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-fg-subtle"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>

      <button onClick={onScratch} className="flex w-full items-center gap-3 rounded-[12px] border border-line bg-sunken/40 px-4 py-3 text-left transition-colors hover:border-navy/40 hover:bg-navy-tint/30">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-navy-tint text-navy"><Upload className="h-4 w-4" /></span>
        <div className="flex-1">
          <b className="text-[13.5px] text-fg">Start from scratch — quick A/B</b>
          <div className="text-[11.5px] text-fg-subtle">Upload one variation and test it against the live page. Two versions, four quick steps.</div>
        </div>
        <span className="text-fg-subtle">▸</span>
      </button>
    </div>
  )
}

function TemplatePick({ t, onLaunch, onEdit, onDup }: { t: ExperimentTemplate; onLaunch: () => void; onEdit: () => void; onDup: () => void }) {
  const named = t.variables.filter((v) => v.name.trim())
  const goal = goalVariable(named)?.name ?? 'No goal'
  const alerts = t.guardrails.filter((g) => g.on).length
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-panel p-3.5 shadow-sm transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-navy-tint"><FlaskConical className="h-3.5 w-3.5 text-navy" /></span>
        {t.usedBy > 0
          ? <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">Used by {t.usedBy}</span>
          : <span className="rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-medium text-fg-subtle">Not used yet</span>}
      </div>
      <div>
        <b className={cn('block text-[13.5px] font-semibold leading-tight', t.name ? 'text-fg' : 'text-fg-subtle')}>{t.name || 'Untitled template'}</b>
        <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-fg-subtle">{t.description || t.change || 'No description yet.'}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        <PickChip icon={<span className="rounded bg-brand px-1 py-0.5 text-[8px] font-bold uppercase text-white">Goal</span>}>{goal}</PickChip>
        <PickChip icon={<Layers className="h-2.5 w-2.5" />}>{t.variants.length}</PickChip>
        <PickChip icon={<Boxes className="h-2.5 w-2.5" />}>{named.length}</PickChip>
        <PickChip icon={<Bell className="h-2.5 w-2.5" />}>{alerts}</PickChip>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 border-t border-line pt-2.5">
        <Button variant="navy" size="sm" onClick={onLaunch}><Rocket className="h-3.5 w-3.5" /> Launch</Button>
        <Button variant="default" size="sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
        <button onClick={onDup} className="ml-auto grid h-7 w-7 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-sunken hover:text-fg" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}

function PickChip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-md border border-line bg-sunken px-1.5 py-0.5 text-[10.5px] font-medium text-fg-muted">{icon}{children}</span>
}

function StepPage({ pageId, onPick }: { pageId: string; onPick: (id: string) => void }) {
  const eligible = PAGES.filter((p) => p.spend > 0)
  const free = eligible.filter((p) => !pageRunningTest(p.id))
  return (
    <div>
      <div className="text-[15px] font-semibold text-fg">Which page do you want to test?</div>
      <div className="mb-3 mt-1 text-[12.5px] text-fg-subtle">{free.length} of {eligible.length} pages free — a page can run only one test at a time.</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {eligible.map((p) => {
          const running = pageRunningTest(p.id)
          return (
            <button key={p.id} disabled={!!running} onClick={() => onPick(p.id)} className={cn('flex items-center justify-between rounded-[10px] border px-3 py-2.5 text-left transition-colors disabled:opacity-50', pageId === p.id ? 'border-navy bg-navy-tint' : 'border-line hover:border-line-strong', running && 'cursor-not-allowed')}>
              <span className="flex items-center gap-2"><NetIcon net={pageNet(p.id)} /><b className="text-[13px] text-fg">{p.name}</b></span>
              {running ? <span className="rounded bg-warn-tint px-1.5 py-0.5 text-[10px] font-semibold text-warn">Testing</span> : <span className="text-[12px] text-fg-subtle tnum">{p.cpl ? inr(p.cpl) : '—'}<span className="text-[10px]">/lead</span></span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepChange({ name, setName, change, setChange, uploaded, setUploaded, slug }: { name: string; setName: (v: string) => void; change: string; setChange: (v: string) => void; uploaded: boolean; setUploaded: (v: boolean) => void; slug: string }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[15px] font-semibold text-fg">Upload your variation</div>
        <div className="mt-1 text-[12.5px] leading-relaxed text-fg-subtle">Control (A) stays as the live page. Variant B is your change — export it from your builder as a ZIP and drop it here. We host it and auto-detect the buttons to track.</div>
      </div>
      <label className="block"><span className="mb-1 block text-[12px] font-medium text-fg-muted">Variant name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fold + fee nudge" className="input" /></label>
      <label className="block"><span className="mb-1 block text-[12px] font-medium text-fg-muted">Hypothesis — what you expect (optional)</span><textarea value={change} onChange={(e) => setChange(e.target.value)} rows={2} placeholder="Moving the form above the fold will lift Apply-Now clicks…" className="input h-auto py-2" /></label>
      {uploaded ? (
        <div className="rounded-[12px] border border-line bg-sunken/50 p-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-pos-tint text-pos">✓</span>
            <div className="flex-1"><b className="text-[13px] text-fg">variant-b.zip</b><div className="text-[11.5px] text-fg-subtle">Hosted at pages.onlinejain.com/{slug}-b · staging</div></div>
            <button onClick={() => setUploaded(false)} className="text-[12px] font-medium text-navy">Replace</button>
          </div>
          <div className="mt-3 border-t border-line pt-3">
            <div className="mb-2 text-[11.5px] text-fg-muted">{DETECTED.length} trackable elements found — pick any as the goal next</div>
            <div className="flex flex-wrap gap-1.5">{DETECTED.map((el) => <span key={el} className="rounded-md border border-line bg-panel px-2 py-0.5 text-[11px] text-fg-muted">{el}</span>)}</div>
          </div>
        </div>
      ) : (
        <button onClick={() => setUploaded(true)} className="flex w-full flex-col items-center gap-1.5 rounded-[12px] border-2 border-dashed border-line-strong bg-sunken/40 py-8 transition-colors hover:border-navy/40 hover:bg-navy-tint/30">
          <Upload className="h-5 w-5 text-fg-subtle" />
          <b className="text-[13px] text-fg">Drop your variation ZIP here</b>
          <span className="text-[11.5px] text-fg-subtle">or click to select — exported from Webflow, Unbounce, your own builder, anything</span>
        </button>
      )}
    </div>
  )
}

function StepGoal({ p, goal, setGoal, customEl, setCustomEl, uploaded }: any) {
  return (
    <div>
      <div className="text-[15px] font-semibold text-fg">What are you testing for?</div>
      <div className="mb-3 mt-1 text-[12.5px] leading-relaxed text-fg-subtle">Pick the action that counts as a win. A frequent action decides fast; enrolment stays tracked underneath either way. <b>Apply-Now click</b> is our default.</div>
      <div className="space-y-2">
        {SCENARIOS.map((s) => {
          const est = estDecision(p, s.mult)
          const slow = s.mult >= 18
          return (
            <button key={s.k} onClick={() => setGoal(s.k)} className={cn('flex w-full items-center gap-3 rounded-[10px] border px-3.5 py-2.5 text-left transition-colors', goal === s.k ? 'border-navy bg-navy-tint' : 'border-line hover:border-line-strong')}>
              <div className="flex-1">
                <div className="flex items-center gap-2"><b className="text-[13px] text-fg">{s.name}</b>{s.rec && <span className="rounded bg-pos-tint px-1.5 py-0.5 text-[9.5px] font-semibold text-pos">Default</span>}</div>
                <p className="text-[11.5px] text-fg-subtle">{s.desc}</p>
              </div>
              <div className="text-right"><div className={cn('text-[13px] font-bold', slow ? 'text-neg' : 'text-pos')}>~{est.human}</div><div className="text-[10px] text-fg-subtle">to decide</div></div>
            </button>
          )
        })}
        <button onClick={() => setGoal('custom')} className={cn('flex w-full items-center gap-3 rounded-[10px] border px-3.5 py-2.5 text-left transition-colors', goal === 'custom' ? 'border-navy bg-navy-tint' : 'border-line hover:border-line-strong')}>
          <div className="flex-1"><div className="flex items-center gap-2"><b className="text-[13px] text-fg">Custom scenario</b><span className="rounded bg-sunken px-1.5 py-0.5 text-[9.5px] font-semibold text-fg-muted">Advanced</span></div><p className="text-[11.5px] text-fg-subtle">Count any element we detected on your variation as the win.</p></div>
          <div className="text-fg-subtle">▸</div>
        </button>
        {goal === 'custom' && (
          <div className="rounded-[10px] border border-line bg-sunken/40 p-3">
            {uploaded ? (
              <>
                <label className="mb-1 block text-[12px] font-medium text-fg-muted">Count a conversion when a visitor clicks:</label>
                <select value={customEl} onChange={(e) => setCustomEl(e.target.value)} className="input">{DETECTED.map((el) => <option key={el}>{el}</option>)}</select>
                <div className="mt-2 text-[12px] text-fg-muted">Decides in about <b>~{estDecision(p, elMult(customEl)).human}</b> at this page's volume.</div>
              </>
            ) : (
              <div className="text-[12px] text-fg-subtle">Upload a variation on the previous step so we can detect elements to track.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StepReview({ p, name, goalLabel, est }: any) {
  return (
    <div>
      <div className="mb-3 text-[15px] font-semibold text-fg">Ready to launch</div>
      <div className="overflow-hidden rounded-[12px] border border-line">
        {[
          ['Page', p?.name ?? '—'],
          ['Variant B', `${name || 'New variant'} · /${p?.id ?? 'page'}-b`],
          ['Goal', goalLabel],
          ['Traffic split', '50 / 50, even'],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5 text-[13px] last:border-0"><span className="shrink-0 text-fg-subtle">{k}</span><b className="truncate text-right text-fg">{v}</b></div>
        ))}
      </div>
      <div className="mt-4 rounded-[12px] border border-navy/15 bg-navy-tint/50 px-4 py-4 text-center">
        <div className="tnum text-[26px] font-bold text-navy">~{est.human}</div>
        <div className="text-[12px] text-fg-muted">estimated time to a verdict, at this page's volume</div>
      </div>
      <p className="mt-3 text-[12px] text-fg-subtle">One click launches it and the clock starts now — you'll know by about <b>day {est.days}</b>.</p>
    </div>
  )
}
