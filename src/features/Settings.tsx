import { motion } from 'motion/react'
import { Check, Plus } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Badge, Button, Card, Segmented, SectionHead } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { useNav } from '@/lib/nav'
import { cap, lexiconOf, useTenant, type Lexicon, type Tenant } from '@/lib/tenant'
import { cn } from '@/lib/utils'
import { CrmSync } from '@/features/settings/CrmSync'

const singular = (s: string) => s.replace(/s$/, '')

const DEFAULTS = {
  ws: { name: 'JAIN Online', domain: 'pages.onlinejain.com' },
  conn: { google: true, meta: true, crm: true, clarity: true, convWebhook: true },
  tracking: { leadDef: 'form_submit', tagCoverage: 68, tagTotal: 73, autoDetect: true },
  programmes: ['MBA', 'BBA', 'B.Com', 'BCA', 'MCA', 'M.Com', 'BA', 'B.Sc'],
  intakes: [{ name: 'January 2027', target: 600, current: 412, close: '15 Jan 2027' }, { name: 'July 2027', target: 550, current: 0, close: '15 Jul 2027' }],
  metrics: { headline: 'cpl', feeDef: 'fees_collected', cplBands: true },
  experiments: { defaultGoal: 'apply', readiness: 120, declareOn: 'cpl' },
  privacy: { ageGate: true, tokenise: true, purgeUnconverted: true, retentionDays: 180, erasure: true },
  alerts: { brokenForm: true, closedIntake: true, mobileDrop: true, weekly: true, channel: 'WhatsApp' },
  team: [{ name: 'Akshay R', email: 'akshay.r@jainonline.edu', role: 'Owner', you: true }, { name: 'Abhishek', email: 'abhishek@jainonline.edu', role: 'Owner' }, { name: 'Vinith', email: 'vinith.p@jainonline.edu', role: 'Editor' }],
  workspaces: [{ name: 'JAIN Online', meta: 'pages.onlinejain.com · 73 pages · 500 leads', active: true }, { name: 'Vignan Online', meta: 'pages.vignanonline.edu · no pages uploaded yet' }, { name: 'IIT', meta: 'no domain set · needs setup' }],
}
type S = typeof DEFAULTS

/* Settings shows the ACTIVE client's configuration — identity, what they market, their
   goal and which sources are connected all come from the tenant, so a SaaS client never
   sees a university's programmes. The deeper platform settings (tracking, privacy, alerts)
   use sensible defaults. */
function deriveSettings(t: Tenant): S {
  const conns = new Set(t.conns ?? [])
  const g = t.goal
  return {
    ...structuredClone(DEFAULTS),
    ws: { name: t.name, domain: t.domain || '—' },
    conn: { google: conns.has('Google Ads'), meta: conns.has('Meta Ads'), crm: conns.has('CRM'), clarity: conns.has('Clarity'), convWebhook: conns.has('CRM') },
    programmes: [...t.offerings],
    intakes: g ? [{ name: g.name, target: g.target, current: g.current ?? 0, close: g.close ?? '—' }] : [],
  }
}

const TABS = [['setup', 'Setup'], ['conn', 'Connections'], ['crm', 'CRM sync'], ['tracking', 'Tracking'], ['prog', 'offerings'], ['exp', 'Experiments'], ['privacy', 'Privacy & data'], ['alerts', 'Alerts'], ['team', 'Team']]

export function Settings() {
  const [tab, setTab] = useState('setup')
  const toast = useToast()
  const { tenant } = useTenant()
  const lex = lexiconOf(tenant)
  const [s, setS] = useState<S>(() => deriveSettings(tenant))
  // Re-derive when the active client changes so Settings always reflects the current workspace.
  useEffect(() => { setS(deriveSettings(tenant)) }, [tenant.id])
  const set = (fn: (draft: S) => void) => setS((prev) => { const d = structuredClone(prev); fn(d); return d })

  return (
    <div className="mx-auto max-w-[900px] px-8 py-7">
      <div className="mb-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">Settings</h1>
        <p className="mt-0.5 text-[13px] text-fg-subtle">Configure Samurai for {tenant.name}. Everything the platform needs — connections, targets, tests, privacy — is self-serve.</p>
      </div>
      <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('-mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors', tab === k ? 'border-brand text-brand' : 'border-transparent text-fg-subtle hover:text-fg')}>{k === 'prog' ? `${cap(lex.offering.many)} & targets` : l}</button>
        ))}
      </div>

      {tab === 'setup' && <Setup s={s} lex={lex} onGoto={setTab} />}
      {tab === 'conn' && <Connections s={s} set={set} lex={lex} onConfigureCrm={() => setTab('crm')} />}
      {tab === 'crm' && <CrmSync />}
      {tab === 'tracking' && <Tracking s={s} set={set} toast={toast} lex={lex} />}
      {tab === 'prog' && <Programmes s={s} set={set} toast={toast} lex={lex} />}
      {tab === 'exp' && <Experiments s={s} set={set} lex={lex} />}
      {tab === 'privacy' && <Privacy s={s} set={set} />}
      {tab === 'alerts' && <Alerts s={s} set={set} lex={lex} />}
      {tab === 'team' && <Team s={s} toast={toast} />}
    </div>
  )
}

/* ---------------- shared controls ---------------- */
function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onClick} className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors', on ? 'bg-brand' : 'bg-line-strong')}>
      <motion.span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm" animate={{ left: on ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
    </button>
  )
}
function Field({ label, sub, children }: { label: string; sub?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-0">
      <div className="flex-1"><b className="text-[13.5px] text-fg">{label}</b>{sub && <p className="mt-0.5 text-[12px] leading-relaxed text-fg-subtle">{sub}</p>}</div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
function NumInput({ value, onChange, suffix }: { value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
      <input type="number" value={value} onChange={(e) => onChange(+e.target.value || 0)} className="h-8 w-20 rounded-[8px] border border-line bg-panel px-2 text-[13px] text-fg outline-none focus:border-brand" />
      {suffix}
    </label>
  )
}

/* ---------------- tabs ---------------- */
function Setup({ s, lex, onGoto }: { s: S; lex: Lexicon; onGoto: (t: string) => void }) {
  // Setup = connect your data. Every step reflects REAL connection state (derived from the
  // tenant's conns), never a hardcoded default, so a fresh workspace is never shown as
  // partially set up. Offerings and a goal are no longer part of going live.
  const steps: [string, boolean, string][] = [
    ['Connect Google Ads', s.conn.google, 'conn'],
    ['Connect Meta Ads', s.conn.meta, 'conn'],
    ['Connect your CRM', s.conn.crm, 'conn'],
    ['Connect Clarity', s.conn.clarity, 'conn'],
  ]
  const done = steps.filter((x) => x[1]).length
  const pct = Math.round((done / steps.length) * 100)
  return (
    <>
      <Card className="mb-4 p-5">
        <div className="flex items-center justify-between">
          <div><b className="text-[14px] text-fg">Connect your data</b><div className="text-[12.5px] text-fg-subtle">{done} of {steps.length} sources connected — Samurai reconciles spend → {lex.conversion.many} once they're in.</div></div>
          <div className="tnum text-[22px] font-bold text-brand">{pct}%</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken"><motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} /></div>
      </Card>
      <Card>
        {steps.map(([label, ok, tab]) => (
          <div key={label} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0">
            <span className={cn('grid h-5 w-5 place-items-center rounded-full', ok ? 'bg-pos text-white' : 'border border-line-strong')}>{ok && <Check className="h-3 w-3" />}</span>
            <b className="flex-1 text-[13.5px] text-fg">{label}</b>
            {ok ? <Badge tone="pos">Connected</Badge> : <Button variant="default" size="sm" onClick={() => onGoto(tab)}>Connect</Button>}
          </div>
        ))}
      </Card>
      <p className="mt-3 text-[12px] leading-relaxed text-fg-subtle">Connect your ad accounts and CRM, and Samurai starts producing numbers — one blended cost per {lex.conversion.one}, nothing double-counted.</p>
    </>
  )
}

function ConnRow({ icon, name, meta, on, onToggle, onLabel }: { icon: string; name: string; meta: string; on: boolean; onToggle: () => void; onLabel: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-0">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-sunken text-[11px] font-bold text-fg-muted">{icon}</span>
      <div className="flex-1"><b className="text-[13.5px] text-fg">{name}</b><p className="text-[12px] text-fg-subtle">{meta}</p></div>
      <Badge tone={on ? 'pos' : 'neutral'}>{on ? onLabel : 'Off'}</Badge>
      <Switch on={on} onClick={onToggle} />
    </div>
  )
}
function Connections({ s, set, lex, onConfigureCrm }: { s: S; set: (fn: (d: S) => void) => void; lex: Lexicon; onConfigureCrm: () => void }) {
  return (
    <>
      <SectionHead title="Ad platforms" hint="where spend comes from" />
      <Card className="mb-5">
        <ConnRow icon="G" name="Google Ads" meta="Customer 5708589162 · 21 campaigns · synced 9:21 AM" on={s.conn.google} onToggle={() => set((d) => { d.conn.google = !d.conn.google })} onLabel="Syncing" />
        <ConnRow icon="M" name="Meta Ads" meta="Reads spend back into campaign reporting · ID macros for landing pages" on={s.conn.meta} onToggle={() => set((d) => { d.conn.meta = !d.conn.meta })} onLabel="Syncing" />
      </Card>
      <SectionHead title="Leads & outcomes" hint="where leads and outcomes live" right={<button onClick={onConfigureCrm} className="text-[12.5px] font-medium text-brand hover:text-brand-hover">Map CRM fields →</button>} />
      <Card>
        <ConnRow icon="SL" name="CRM" meta={`Every ${lex.conversion.one} posts in as a lead; map your fields in CRM sync`} on={s.conn.crm} onToggle={() => set((d) => { d.conn.crm = !d.conn.crm })} onLabel="Connected" />
        <ConnRow icon="W" name="Conversions webhook" meta="Turns spend into cost per outcome; exports conversions back to Google Ads" on={s.conn.convWebhook} onToggle={() => set((d) => { d.conn.convWebhook = !d.conn.convWebhook })} onLabel="Secret created" />
        <ConnRow icon="C" name="Microsoft Clarity" meta="Heatmaps & session replay on your pages" on={s.conn.clarity} onToggle={() => set((d) => { d.conn.clarity = !d.conn.clarity })} onLabel="On your pages" />
      </Card>
    </>
  )
}

function Tracking({ s, set, toast, lex }: any) {
  const cov = s.tracking.tagCoverage, tot = s.tracking.tagTotal
  return (
    <>
      <SectionHead title="Tag health" hint="what's actually firing on live pages" />
      <Card className="mb-5">
        <Field label="Pages carrying the current tag set" sub="Untagged pages are invisible spend. Tags bake in at upload, so a page published before a tag existed lacks it.">
          <Badge tone={cov / tot > 0.9 ? 'pos' : 'warn'}>{cov} of {tot}</Badge>
          <Button variant="default" size="sm" onClick={() => toast('Re-applying tags to 5 pages…')}>Re-apply</Button>
        </Field>
        <Field label="Conversion tag verified" sub="Turns green on the first lead that arrives the right way. Checked hourly."><Badge tone="pos">Verified</Badge></Field>
      </Card>
      <SectionHead title="What counts as a lead" />
      <Card>
        <Field label="Lead definition" sub={`The action Samurai counts as a ${lex.conversion.one}.`}>
          <Segmented value={s.tracking.leadDef} onChange={(v) => set((d: S) => { d.tracking.leadDef = v })} options={[{ value: 'form_submit', label: 'Form submission' }, { value: 'form_or_call', label: 'Form or call-back' }]} />
        </Field>
        <Field label="Auto-detect trackable elements" sub="On upload, find the buttons and forms so tests can pick a goal without code."><Switch on={s.tracking.autoDetect} onClick={() => set((d: S) => { d.tracking.autoDetect = !d.tracking.autoDetect })} /></Field>
      </Card>
    </>
  )
}

function Programmes({ s, set, toast, lex }: any) {
  const OfferMany = cap(lex.offering.many)
  return (
    <>
      <SectionHead title={OfferMany} hint="what this client markets" />
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap gap-2">
          {s.programmes.map((p: string) => (
            <span key={p} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sunken px-2.5 py-1 text-[12.5px] text-fg">
              {p}<button onClick={() => set((d: S) => { d.programmes = d.programmes.filter((x) => x !== p) })} className="text-fg-subtle hover:text-neg">×</button>
            </span>
          ))}
          {s.programmes.length === 0 && <span className="text-[12.5px] text-fg-subtle">No {lex.offering.many} yet.</span>}
          <button onClick={() => toast(`${OfferMany} sync from your connected CRM.`)} className="rounded-full border border-dashed border-line-strong px-2.5 py-1 text-[12.5px] text-fg-muted hover:border-brand hover:text-brand">+ Add</button>
        </div>
      </Card>
      <SectionHead title={`${cap(lex.goalNoun)}s`} hint="what the Overview paces against" />
      <Card className="mb-5">
        {s.intakes.map((it: any, i: number) => (
          <Field key={it.name} label={it.name} sub={it.close && it.close !== '—' ? `Closes ${it.close} · ${it.current} ${lex.goalUnit} so far` : `${it.current} ${lex.goalUnit} so far`}>
            <NumInput value={it.target} onChange={(v) => set((d: S) => { d.intakes[i].target = v })} />
          </Field>
        ))}
        {s.intakes.length === 0 && <div className="px-5 py-4 text-[12.5px] text-fg-subtle">No {lex.goalNoun} set yet — add one so the Overview has something to pace against.</div>}
      </Card>
      <SectionHead title="Headline & revenue" />
      <Card>
        <Field label="Overview headline metric" sub="What the big number on Overview shows.">
          <Segmented value={s.metrics.headline} onChange={(v) => set((d: S) => { d.metrics.headline = v })} options={[{ value: 'cpl', label: 'Cost per lead' }, { value: 'enrol', label: `Cost per ${singular(lex.goalUnit)}` }]} />
        </Field>
        <Field label="Band cost per lead red/amber/green" sub="Against this account's own trailing history, not an industry median."><Switch on={s.metrics.cplBands} onClick={() => set((d: S) => { d.metrics.cplBands = !d.metrics.cplBands })} /></Field>
      </Card>
    </>
  )
}

function Experiments({ s, set, lex }: any) {
  return (
    <>
      <SectionHead title="Test defaults" hint="how a new experiment is set up" />
      <Card>
        <Field label="Default goal" sub="The scenario a new test picks first. A micro-conversion decides fastest.">
          <Segmented value={s.experiments.defaultGoal} onChange={(v) => set((d: S) => { d.experiments.defaultGoal = v })} options={[{ value: 'apply', label: 'Primary CTA' }, { value: 'brochure', label: 'Lead magnet' }, { value: 'enrol', label: cap(singular(lex.goalUnit)) }]} />
        </Field>
        <Field label="Readiness threshold" sub="Leads per variant before a verdict can be called."><NumInput value={s.experiments.readiness} onChange={(v) => set((d: S) => { d.experiments.readiness = v })} suffix="per variant" /></Field>
        <Field label="Declare winners on" sub="The metric a verdict is based on.">
          <Segmented value={s.experiments.declareOn} onChange={(v) => set((d: S) => { d.experiments.declareOn = v })} options={[{ value: 'cpl', label: 'CPL' }, { value: 'cvr', label: 'CVR' }, { value: 'auto', label: 'Auto' }]} />
        </Field>
      </Card>
    </>
  )
}

function Privacy({ s, set }: any) {
  const rows: [string, string, keyof S['privacy']][] = [
    ['Age-gate under-18 leads', 'No educational exemption covers a lead. Grading or recording a minor is the sharpest risk — suppress it.', 'ageGate'],
    ['Tokenise PII', 'Show a token, never the raw phone or email. The regulator names this technique (Rule 6(1)(a)).', 'tokenise'],
    ['Purge unconverted leads', 'Unconverted leads carry no retention mandate. Purge on a clock; hand converted ones to the CRM.', 'purgeUnconverted'],
    ['Per-lead erasure on request', 'Honour a delete request for a single lead — a procurement requirement.', 'erasure'],
  ]
  return (
    <>
      <div className="mb-4 rounded-[12px] border border-navy/15 bg-navy-tint/60 px-4 py-3 text-[12.5px] text-fg-muted"><b className="text-fg">DPDP runway.</b> India's DPDP duties commence around May 2027 — an eight-month runway. The strongest posture is to hold as little lead PII as possible.</div>
      <SectionHead title="Lead privacy" hint="the highest-value settings in the product" />
      <Card>
        {rows.map(([label, sub, key]) => <Field key={key} label={label} sub={sub}><Switch on={s.privacy[key] as boolean} onClick={() => set((d: S) => { (d.privacy as any)[key] = !(d.privacy as any)[key] })} /></Field>)}
        <Field label="Retention window" sub="Days to keep row-level lead data before purge."><NumInput value={s.privacy.retentionDays} onChange={(v) => set((d: S) => { d.privacy.retentionDays = v })} suffix="days" /></Field>
      </Card>
    </>
  )
}

function Alerts({ s, set, lex }: any) {
  const rows: [string, string, keyof S['alerts']][] = [
    [`Broken ${lex.conversion.one} form`, 'A page taking spend with 0 submissions for hours — the most expensive event in the month.', 'brokenForm'],
    [`Spend to a closed ${lex.goalNoun}`, `Traffic still running to a ${lex.goalNoun} that has closed.`, 'closedIntake'],
    ['Mobile conversion drop', "A page's mobile conversion falls sharply after a deploy.", 'mobileDrop'],
  ]
  return (
    <>
      <SectionHead title="Alert rules" hint="only Samurai owns the page, so only Samurai can catch these" />
      <Card className="mb-5">{rows.map(([label, sub, key]) => <Field key={key} label={label} sub={sub}><Switch on={s.alerts[key] as boolean} onClick={() => set((d: S) => { (d.alerts as any)[key] = !(d.alerts as any)[key] })} /></Field>)}</Card>
      <SectionHead title="Weekly readout" hint="push beats a dashboard nobody opens" />
      <Card>
        <Field label="Send the weekly number" sub="One ₹-denominated number weekly, plus an all-clear when nothing is wrong."><Switch on={s.alerts.weekly} onClick={() => set((d: S) => { d.alerts.weekly = !d.alerts.weekly })} /></Field>
        <Field label="Channel" sub="Where the readout is sent.">
          <Segmented value={s.alerts.channel} onChange={(v) => set((d: S) => { d.alerts.channel = v })} options={[{ value: 'WhatsApp', label: 'WhatsApp' }, { value: 'Email', label: 'Email' }]} />
        </Field>
      </Card>
    </>
  )
}

function Team({ s, toast }: any) {
  const { go } = useNav()
  const { tenant, tenants, switchTo } = useTenant()
  const initials = (n: string) => n.split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase()
  return (
    <>
      <SectionHead title="People" hint="owner manages · editor changes pages · viewer reads" right={<button onClick={() => toast('Invite sent (demo).')} className="text-[12.5px] font-medium text-brand hover:text-brand-hover">+ Invite</button>} />
      <Card className="mb-5">
        {s.team.map((m: any) => (
          <div key={m.email} className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-0">
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-navy text-[11px] font-semibold text-white">{initials(m.name)}</span>
            <div className="flex-1"><b className="text-[13.5px] text-fg">{m.name}{m.you && <span className="ml-1.5 rounded bg-sunken px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">You</span>}</b><p className="text-[12px] text-fg-subtle">{m.email}</p></div>
            <Badge tone={m.role === 'Owner' ? 'pos' : 'neutral'}>{m.role}</Badge>
          </div>
        ))}
      </Card>
      <SectionHead title="Client workspaces" hint="each client gets its own console — same Samurai product" right={<button onClick={() => go('onboarding')} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:text-brand-hover"><Plus className="h-3.5 w-3.5" /> Onboard a client</button>} />
      <Card>
        {tenants.map((w) => (
          <div key={w.id} className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-navy text-[11px] font-bold text-white">{w.initials}</span>
            <div className="min-w-0 flex-1"><b className="text-[13.5px] text-fg">{w.name}</b><p className="truncate text-[12px] text-fg-subtle">{w.domain ? `${w.domain} · ${w.industry}` : w.fresh ? 'Needs setup — connect data & upload pages' : w.industry}</p></div>
            {w.id === tenant.id ? <Badge tone="pos">This workspace</Badge> : <Button variant="default" size="sm" onClick={() => { switchTo(w.id); toast(`Switched to ${w.name}.`) }}>Open</Button>}
          </div>
        ))}
      </Card>
    </>
  )
}
