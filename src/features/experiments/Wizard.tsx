import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Upload, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'
import { NetIcon } from '@/features/Pages'
import { cn, inr } from '@/lib/utils'
import { PAGES } from '@/data/samurai'
import { pageNet, pageRunningTest } from '@/data/pages'
import { DETECTED, SCENARIOS, elMult, estDecision, scenByKey } from '@/data/experiments'

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

const STEPS = ['Page', 'The change', 'Goal', 'Review']

/** The quick A/B test: control = the live page, Variant B = your change. (Multi-variant tests are built
    in the template builder; see launchFromTemplate.) */
export function Wizard({ open, initialPage, onClose, onLaunch }: { open: boolean; initialPage?: string; onClose: () => void; onLaunch: (r: WizResult) => void }) {
  const [step, setStep] = useState(0)
  const [pageId, setPageId] = useState(initialPage ?? '')
  const [name, setName] = useState('')
  const [change, setChange] = useState('')
  const [uploaded, setUploaded] = useState(false)
  const [goal, setGoal] = useState('apply')
  const [customEl, setCustomEl] = useState(DETECTED[0])

  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setStep(0); setPageId(initialPage ?? ''); setName(''); setChange(''); setUploaded(false); setGoal('apply'); setCustomEl(DETECTED[0])
  }
  if (!open && wasOpen) setWasOpen(false)

  const p = PAGES.find((x) => x.id === pageId)
  const goalMult = goal === 'custom' ? elMult(customEl) : scenByKey(goal)?.mult ?? 1
  const goalLabel = goal === 'custom' ? `Custom · ${customEl}` : scenByKey(goal)?.name ?? ''
  const canNext = step === 0 ? !!pageId : step === 1 ? uploaded : true

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
                  <Dialog.Title className="text-[15px] font-semibold text-fg">New experiment · quick A/B</Dialog.Title>
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
                  <div className="mb-3 rounded-[9px] border border-navy/15 bg-navy-tint/30 px-3 py-2 text-[11.5px] leading-relaxed text-fg-muted">Comparing more than two versions, or tracking your own variables? Build a <b className="text-fg">multi-variant test</b> in the Templates tab instead.</div>
                  {step === 0 && <StepPage pageId={pageId} onPick={setPageId} />}
                  {step === 1 && <StepChange name={name} setName={setName} change={change} setChange={setChange} uploaded={uploaded} setUploaded={setUploaded} slug={p?.id ?? 'page'} />}
                  {step === 2 && <StepGoal p={p} goal={goal} setGoal={setGoal} customEl={customEl} setCustomEl={setCustomEl} uploaded={uploaded} />}
                  {step === 3 && <StepReview p={p} name={name} goalLabel={goalLabel} est={estDecision(p, goalMult)} />}
                </div>
                <div className="flex items-center border-t border-line px-5 py-3">
                  {step > 0 ? <Button variant="default" size="sm" onClick={() => setStep((s) => s - 1)}>Back</Button> : <span />}
                  <div className="flex-1" />
                  {step < STEPS.length - 1 ? (
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
