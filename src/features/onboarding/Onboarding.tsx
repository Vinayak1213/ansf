import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Plug, Rocket, ScrollText, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { useNav } from '@/lib/nav'
import { useToast } from '@/components/Toast'
import { INDUSTRIES, cap, initialsOf, lexiconFor, offerSuggest, useTenant, type Tenant } from '@/lib/tenant'
import { Button, Card } from '@/components/ui'
import { cn } from '@/lib/utils'

const CONNS = [
  { k: 'Google Ads', icon: 'G', meta: 'Import spend & clicks by campaign' },
  { k: 'Meta Ads', icon: 'M', meta: 'Import spend & delivery, write back conversions' },
  { k: 'CRM', icon: 'SL', meta: '' }, // meta is filled from the client's lexicon at render
  { k: 'Clarity', icon: 'C', meta: 'Heatmaps & session replay on the pages' },
]

export function Onboarding() {
  const { go } = useNav()
  const toast = useToast()
  const { addTenant } = useTenant()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [created, setCreated] = useState<Tenant | null>(null)

  const [name, setName] = useState('')
  const [industry, setIndustry] = useState<string>('B2B SaaS')
  const [region, setRegion] = useState('India')
  const [slug, setSlug] = useState('')
  const [offerings, setOfferings] = useState<string[]>([])
  const [period, setPeriod] = useState(lexiconFor('B2B SaaS').period)
  const [target, setTarget] = useState(500)
  const [conns, setConns] = useState<Set<string>>(new Set(['Google Ads', 'Meta Ads', 'CRM', 'Clarity']))

  const lex = lexiconFor(industry)
  const STEPS = [
    { k: 'org', label: 'Organisation', hint: 'Who is this workspace for?' },
    { k: 'prog', label: cap(lex.offering.many), hint: `What you market, and the ${lex.goalNoun}` },
    { k: 'connect', label: 'Connect', hint: 'Where spend and leads come from' },
    { k: 'review', label: 'Review', hint: 'Confirm and create the workspace' },
  ]

  const domainSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'workspace').slice(0, 24)
  const domain = `pages.${domainSlug}.com`
  const suggestions = offerSuggest(industry)
  const canNext = step === 0 ? name.trim().length > 1 : true

  const goStep = (n: number) => { setDir(n > step ? 1 : -1); setStep(Math.max(0, Math.min(STEPS.length - 1, n))) }
  // Changing industry re-frames the whole flow: clear offerings from the old vertical and reset the goal period.
  const pickIndustry = (v: string) => { setIndustry(v); setOfferings([]); setPeriod(lexiconFor(v).period) }
  const toggleOffer = (p: string) => setOfferings((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]))
  const toggleConn = (c: string) => setConns((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n })

  const create = () => {
    const t: Tenant = {
      id: domainSlug + '-' + Math.random().toString(36).slice(2, 5),
      name: name.trim(), initials: initialsOf(name), domain, industry, region,
      offerings, goal: { name: period, target }, conns: [...conns], fresh: true, lexicon: lex,
    }
    addTenant(t) // adds and switches to the new workspace
    setCreated(t)
    toast(`${t.name}'s workspace is ready.`)
  }

  if (created) {
    const nOffer = created.offerings.length
    return (
      <div className="grid h-screen place-items-center bg-surface px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[440px] text-center">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[18px] bg-pos-tint text-pos"><CheckCircle2 className="h-8 w-8" /></motion.div>
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">{created.name} is ready on Samurai</h1>
          <p className="mx-auto mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-fg-subtle">The workspace is set up with {nOffer} {nOffer === 1 ? lex.offering.one : lex.offering.many}, a {created.goal?.target}-{lex.goalUnit} target and {created.conns?.length} connection{created.conns?.length !== 1 ? 's' : ''}. Numbers appear as spend and {lex.conversion.many} flow in.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="default" size="md" onClick={() => go('settings')}>Open settings</Button>
            <Button variant="primary" size="md" onClick={() => go('overview')}><Rocket className="h-3.5 w-3.5" /> Enter workspace</Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-fg">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas px-4">
        <span className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-brand shadow-[inset_0_1px_0_rgba(255,255,255,.28)]"><span className="block h-2 w-2 rounded-full bg-white" /></span>
          <span className="text-[14px] font-semibold tracking-tight text-fg">Samurai</span>
        </span>
        <span className="h-5 w-px bg-line" />
        <span className="text-[13px] text-fg-muted">Onboard a new client</span>
        <button onClick={() => go('settings')} title="Exit" className="ml-auto grid h-8 w-8 place-items-center rounded-[8px] text-fg-subtle transition-colors hover:bg-sunken hover:text-fg"><X className="h-4 w-4" /></button>
      </header>

      {/* step rail */}
      <div className="flex shrink-0 items-center justify-center gap-1 border-b border-line bg-canvas px-4 py-2.5 sm:gap-2">
        {STEPS.map((s, i) => {
          const done = i < step, current = i === step
          return (
            <div key={s.k} className="flex items-center">
              <button onClick={() => i <= step && goStep(i)} disabled={i > step} className={cn('flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium transition-colors', current ? 'bg-brand-tint text-brand' : done ? 'text-fg hover:bg-sunken' : 'cursor-not-allowed text-fg-subtle')}>
                <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold', current ? 'bg-brand text-white' : done ? 'bg-pos text-white' : 'bg-sunken text-fg-subtle')}>{done ? <Check className="h-3 w-3" /> : i + 1}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span className={cn('mx-1 h-px w-5 sm:w-8', done ? 'bg-pos/50' : 'bg-line')} />}
            </div>
          )
        })}
      </div>

      {/* content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[600px] px-6 py-8">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={{ enter: (d: number) => ({ opacity: 0, x: d * 20 }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: d * -20 }) }} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              {step === 0 && (
                <Section icon={<Building2 className="h-[18px] w-[18px]" />} title="Who is this workspace for?" sub="Create a new client on Samurai. You can change any of this later in Settings.">
                  <Labeled label="Client name">
                    <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Inc." className="input text-[14px]" />
                  </Labeled>
                  <Labeled label="Industry">
                    <div className="flex flex-wrap gap-2">{INDUSTRIES.map((t) => <Pick key={t} on={industry === t} onClick={() => pickIndustry(t)}>{t}</Pick>)}</div>
                  </Labeled>
                  <Labeled label="Primary region">
                    <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="India" className="input" />
                  </Labeled>
                </Section>
              )}
              {step === 1 && (
                <Section icon={<ScrollText className="h-[18px] w-[18px]" />} title={`${cap(lex.offering.many)} & ${lex.goalNoun}`} sub={`What this client markets, and the ${lex.goalNoun} Samurai will pace against.`}>
                  <Labeled label="Landing-page domain">
                    <div className="flex items-center overflow-hidden rounded-[9px] border border-line">
                      <span className="bg-sunken px-2.5 py-2 text-[12px] text-fg-subtle">pages.</span>
                      <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} placeholder={domainSlug} className="flex-1 bg-transparent px-2.5 py-2 text-[13px] text-fg outline-none" />
                      <span className="bg-sunken px-2.5 py-2 text-[12px] text-fg-subtle">.com</span>
                    </div>
                  </Labeled>
                  <Labeled label={`${cap(lex.offering.many)}${offerings.length ? ` · ${offerings.length} selected` : ''}`}>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((p) => <Pick key={p} on={offerings.includes(p)} onClick={() => toggleOffer(p)} small>{offerings.includes(p) && <Check className="h-3 w-3" />}{p}</Pick>)}
                      {suggestions.length === 0 && <span className="text-[12px] text-fg-subtle">Add {lex.offering.many} later in Settings.</span>}
                    </div>
                  </Labeled>
                  <div className="grid grid-cols-2 gap-3">
                    <Labeled label="Goal period"><input value={period} onChange={(e) => setPeriod(e.target.value)} className="input" /></Labeled>
                    <Labeled label={`${cap(lex.goalUnit)} target`}><input type="number" value={target} onChange={(e) => setTarget(+e.target.value || 0)} className="input" /></Labeled>
                  </div>
                </Section>
              )}
              {step === 2 && (
                <Section icon={<Plug className="h-[18px] w-[18px]" />} title="Connect their data" sub="Samurai reconciles spend → leads from these. Connect now, or skip and do it later — the workspace still gets created.">
                  <Card className="p-1">
                    {CONNS.map((c) => {
                      const on = conns.has(c.k)
                      const meta = c.k === 'CRM' ? `Every ${lex.conversion.one} posts in as a lead` : c.meta
                      return (
                        <div key={c.k} className="flex items-center gap-3 border-b border-line px-3.5 py-3 last:border-0">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-sunken text-[11px] font-bold text-fg-muted">{c.icon}</span>
                          <div className="min-w-0 flex-1"><b className="text-[13px] text-fg">{c.k}</b><p className="truncate text-[11.5px] text-fg-subtle">{meta}</p></div>
                          <Switch on={on} onClick={() => toggleConn(c.k)} />
                        </div>
                      )
                    })}
                  </Card>
                  <p className="mt-2 text-[11.5px] text-fg-subtle">{conns.size} of {CONNS.length} connected. You can add the rest anytime from Settings → Connections.</p>
                </Section>
              )}
              {step === 3 && (
                <Section icon={<CheckCircle2 className="h-[18px] w-[18px]" />} title="Review & create" sub="Here's the workspace Samurai will set up.">
                  <Card className="overflow-hidden">
                    <SummaryRow label="Client" value={<span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-[7px] bg-navy text-[10px] font-bold text-white">{initialsOf(name || 'W')}</span>{name || '—'}</span>} />
                    <SummaryRow label="Industry · region" value={`${industry} · ${region}`} onEdit={() => goStep(0)} />
                    <SummaryRow label="Domain" value={domain} onEdit={() => goStep(1)} />
                    <SummaryRow label={cap(lex.offering.many)} value={offerings.length ? offerings.join(', ') : 'None yet'} onEdit={() => goStep(1)} />
                    <SummaryRow label={cap(lex.goalNoun)} value={`${period} · ${target} ${lex.goalUnit}`} onEdit={() => goStep(1)} />
                    <SummaryRow label="Connections" value={conns.size ? [...conns].join(', ') : 'None — connect later'} onEdit={() => goStep(2)} />
                  </Card>
                  <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-navy/15 bg-navy-tint/40 px-3.5 py-2.5 text-[12px] text-fg-muted">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy" /> Same Samurai product, configured for {name || 'this client'}. Their numbers stay entirely separate from every other workspace.
                  </div>
                </Section>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* footer */}
      <footer className="flex h-16 shrink-0 items-center gap-3 border-t border-line bg-canvas px-5">
        {step > 0 ? <Button variant="default" size="md" onClick={() => goStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Back</Button> : <Button variant="default" size="md" onClick={() => go('settings')}>Cancel</Button>}
        <div className="flex-1 text-center"><div className="text-[12.5px] font-medium text-fg">{STEPS[step].label}</div><div className="text-[11px] text-fg-subtle">{STEPS[step].hint}</div></div>
        {step < STEPS.length - 1 ? (
          <Button variant="primary" size="md" disabled={!canNext} onClick={() => goStep(step + 1)}>Continue <ArrowRight className="h-4 w-4" /></Button>
        ) : (
          <Button variant="primary" size="md" onClick={create}><Rocket className="h-4 w-4" /> Create workspace</Button>
        )}
      </footer>
    </div>
  )
}

function Section({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-tint text-brand">{icon}</span>
        <div><h1 className="text-[19px] font-semibold tracking-tight text-fg">{title}</h1><p className="mt-0.5 text-[13px] leading-relaxed text-fg-subtle">{sub}</p></div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[12px] font-medium text-fg-muted">{label}</span>{children}</label>
}
function Pick({ on, onClick, children, small }: { on: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return <button onClick={onClick} className={cn('inline-flex items-center gap-1 rounded-full border font-medium transition-colors', small ? 'px-2.5 py-1 text-[12px]' : 'px-3.5 py-1.5 text-[13px]', on ? 'border-brand bg-brand-tint text-brand' : 'border-line bg-panel text-fg-muted hover:border-line-strong')}>{children}</button>
}
function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onClick} className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors', on ? 'bg-brand' : 'bg-line-strong')}>
      <motion.span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm" animate={{ left: on ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
    </button>
  )
}
function SummaryRow({ label, value, onEdit }: { label: string; value: React.ReactNode; onEdit?: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 text-[13px] last:border-0">
      <span className="w-28 shrink-0 text-fg-subtle">{label}</span>
      <b className="min-w-0 flex-1 truncate font-medium text-fg">{value}</b>
      {onEdit && <button onClick={onEdit} className="shrink-0 text-[12px] font-medium text-navy hover:underline">Edit</button>}
    </div>
  )
}
