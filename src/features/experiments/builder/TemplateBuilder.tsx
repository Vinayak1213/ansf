import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Rocket, Save, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNav } from '@/lib/nav'
import { useExp } from '../ExperimentsProvider'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { LETTERS, blankTemplate, guardrailDef, makeVarId, type ExperimentTemplate } from '@/data/templates'
import { StepTrack } from './StepTrack'
import { StepDashboard } from './StepDashboard'
import { StepMonitor } from './StepMonitor'
import { StepReview } from './StepReview'

const STEPS = [
  { k: 'track', label: 'Variables', hint: 'Pick variants, add variables, place them' },
  { k: 'dashboard', label: 'Dashboard', hint: 'The A vs B vs C comparison you’ll watch' },
  { k: 'monitor', label: 'Monitor', hint: 'Set guardrails & alerts' },
  { k: 'review', label: 'Review', hint: 'Check everything, then launch' },
]

const STEP_VARIANTS = {
  enter: (d: number) => ({ opacity: 0, x: d * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -24 }),
}

export interface StepProps {
  t: ExperimentTemplate
  update: (fn: (d: ExperimentTemplate) => void) => void
  addVariant: (pageId: string) => void
  removeVariant: (pageId: string) => void
  setVariantLetter: (pageId: string, letter: string) => void
  addVariable: () => void
  renameVariable: (id: string, name: string) => void
  setGoalVariable: (id: string) => void
  removeVariable: (id: string) => void
  assign: (pageId: string, el: string, varId: string) => void
  setGuard: (k: string, patch: Partial<{ on: boolean; threshold: number }>) => void
  goTo: (step: number) => void
}

export function TemplateBuilder({ id }: { id: string }) {
  const { go } = useNav()
  const { getTemplate, saveTemplate, launchFromTemplate, setExpTab } = useExp()
  const [t, setT] = useState<ExperimentTemplate>(() => (id === 'new' ? blankTemplate() : structuredClone(getTemplate(id) ?? blankTemplate())))
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)

  const update = (fn: (d: ExperimentTemplate) => void) => setT((prev) => { const d = structuredClone(prev); fn(d); return d })

  // variants (existing pages being compared)
  const addVariant = (pageId: string) => update((d) => {
    if (d.variants.some((v) => v.pageId === pageId) || d.variants.length >= 5) return
    const letter = LETTERS.find((l) => !d.variants.some((v) => v.letter === l)) ?? 'E'
    d.variants.push({ pageId, letter })
  })
  const removeVariant = (pageId: string) => update((d) => { d.variants = d.variants.filter((v) => v.pageId !== pageId); delete d.placement[pageId] })
  const setVariantLetter = (pageId: string, letter: string) => update((d) => {
    const cur = d.variants.find((v) => v.pageId === pageId); if (!cur || cur.letter === letter) return
    const holder = d.variants.find((v) => v.letter === letter); if (holder) holder.letter = cur.letter
    cur.letter = letter
  })

  // variables (custom metrics)
  const addVariable = () => update((d) => d.variables.push({ id: makeVarId(), name: '' }))
  const renameVariable = (vid: string, name: string) => update((d) => { const v = d.variables.find((x) => x.id === vid); if (v) v.name = name })
  const setGoalVariable = (vid: string) => update((d) => d.variables.forEach((v) => { v.isGoal = v.id === vid }))
  const removeVariable = (vid: string) => update((d) => {
    d.variables = d.variables.filter((v) => v.id !== vid)
    if (!d.variables.some((v) => v.isGoal) && d.variables[0]) d.variables[0].isGoal = true
    for (const pid of Object.keys(d.placement)) delete d.placement[pid][vid]
  })

  // placement: on a variant page, put a variable on an element (≤1 variable per element, ≤1 element per variable)
  const assign = (pageId: string, el: string, varId: string) => update((d) => {
    const pm = d.placement[pageId] ?? (d.placement[pageId] = {})
    for (const vId of Object.keys(pm)) if (pm[vId] === el) delete pm[vId]
    if (varId) pm[varId] = el
  })

  const setGuard = (k: string, patch: Partial<{ on: boolean; threshold: number }>) => update((d) => {
    const g = d.guardrails.find((x) => x.k === k)
    if (g) Object.assign(g, patch)
    else d.guardrails.push({ k, threshold: guardrailDef(k)!.def, on: true, ...patch })
  })

  const goStep = (next: number) => { setDir(next > step ? 1 : -1); setStep(Math.max(0, Math.min(STEPS.length - 1, next))) }
  const exit = () => { setExpTab('templates'); go('experiments') }
  const save = () => { saveTemplate(t) }
  const launch = () => { launchFromTemplate(t) }

  const namedVars = t.variables.filter((v) => v.name.trim()).length
  const ready = t.variants.length >= 2 && namedVars >= 1
  const canProceed = step === 0 ? ready : true
  const stepProps: StepProps = { t, update, addVariant, removeVariant, setVariantLetter, addVariable, renameVariable, setGoalVariable, removeVariable, assign, setGuard, goTo: goStep }
  const reachable = useMemo(() => (i: number) => i === 0 || ready, [ready])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-fg">
      {/* header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas px-4">
        <button onClick={exit} title="Exit builder" className="grid h-8 w-8 place-items-center rounded-[8px] text-fg-subtle transition-colors hover:bg-sunken hover:text-fg"><X className="h-4 w-4" /></button>
        <span className="h-5 w-px bg-line" />
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-brand shadow-[inset_0_1px_0_rgba(255,255,255,.28)]"><span className="block h-2 w-2 rounded-full bg-white" /></span>
          <input
            value={t.name}
            onChange={(e) => update((d) => { d.name = e.target.value })}
            placeholder="Untitled template"
            className="w-[240px] rounded-[7px] border border-transparent bg-transparent px-1.5 py-1 text-[14px] font-semibold text-fg outline-none transition-colors placeholder:text-fg-subtle hover:border-line focus:border-navy focus:bg-panel"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-[12px] text-fg-subtle sm:inline">Step {step + 1} of {STEPS.length}</span>
          <Button variant="default" size="sm" onClick={save}><Save className="h-3.5 w-3.5" /> Save</Button>
        </div>
      </header>

      {/* step rail */}
      <div className="flex shrink-0 items-center justify-center gap-1 border-b border-line bg-canvas px-4 py-2.5 sm:gap-2">
        {STEPS.map((s, i) => {
          const done = i < step
          const current = i === step
          const canJump = reachable(i)
          return (
            <div key={s.k} className="flex items-center">
              <button
                disabled={!canJump}
                onClick={() => canJump && goStep(i)}
                className={cn('flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
                  current ? 'bg-navy-tint text-navy' : done ? 'text-fg hover:bg-sunken' : 'text-fg-subtle',
                  canJump && !current && 'hover:bg-sunken', !canJump && 'cursor-not-allowed opacity-60')}
              >
                <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold',
                  current ? 'bg-navy text-white' : done ? 'bg-pos text-white' : 'bg-sunken text-fg-subtle')}>
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span className={cn('mx-1 h-px w-5 sm:w-10', done ? 'bg-pos/50' : 'bg-line')} />}
            </div>
          )
        })}
      </div>

      {/* content */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={STEP_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="h-full overflow-y-auto"
          >
            {step === 0 && <StepTrack {...stepProps} />}
            {step === 1 && <StepDashboard {...stepProps} />}
            {step === 2 && <StepMonitor {...stepProps} />}
            {step === 3 && <StepReview {...stepProps} onSave={save} onLaunch={launch} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* footer nav */}
      <footer className="flex h-16 shrink-0 items-center gap-3 border-t border-line bg-canvas px-5">
        {step > 0 ? (
          <Button variant="default" size="md" onClick={() => goStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
        ) : (
          <Button variant="default" size="md" onClick={exit}>Cancel</Button>
        )}
        <div className="flex-1 text-center">
          <div className="text-[12.5px] font-medium text-fg">{STEPS[step].label}</div>
          <div className="text-[11px] text-fg-subtle">{STEPS[step].hint}</div>
        </div>
        {step < STEPS.length - 1 ? (
          <Button variant="primary" size="md" disabled={!canProceed} onClick={() => goStep(step + 1)}>Continue <ArrowRight className="h-4 w-4" /></Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="default" size="md" onClick={launch}><Rocket className="h-3.5 w-3.5" /> Launch a test</Button>
            <Button variant="primary" size="md" onClick={save}><Save className="h-4 w-4" /> Save template</Button>
          </div>
        )}
      </footer>
    </div>
  )
}
