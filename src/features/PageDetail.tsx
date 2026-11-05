import { motion } from 'motion/react'
import { Activity, AlertTriangle, CheckCircle2, Circle, PencilRuler, Rocket, Trash2, Wallet } from 'lucide-react'
import { useReducer, useState } from 'react'
import { BehaviorView } from '@/features/behavior/BehaviorView'
import { takePendingBehavior } from '@/data/behavior'
import { RangePicker, useRange } from '@/lib/range'
import { useNav } from '@/lib/nav'
import { useToast } from '@/components/Toast'
import { useExp } from './experiments/ExperimentsProvider'
import { Badge, Button, Card, SectionHead } from '@/components/ui'
import { FunnelChain } from '@/components/charts'
import { NetIcon } from './Pages'
import { cn, inr, num } from '@/lib/utils'
import { PAGES, findPage, publishDraftPage, removeDraftPage, type Page } from '@/data/samurai'
import { lifeState, pageAds, pageEndedTest, pageHealth, pageNet, pageRunningTest } from '@/data/pages'
import { PageDashboard } from '@/features/dashboard/PageDashboard'

export function PageDetail({ id }: { id: string }) {
  const { label } = useRange()
  const { go } = useNav()
  const toast = useToast()
  const { newExperiment } = useExp()
  const [view, setView] = useState<'performance' | 'behavior'>(() => (takePendingBehavior(id) ? 'behavior' : 'performance'))
  const [, bump] = useReducer((x) => x + 1, 0)
  const p = findPage(id)
  if (!p) return <div className="p-10 text-fg-subtle">Page not found.</div>

  // user-created pages: a draft (not live) or a freshly published page still awaiting its first data
  if (p.draft) return <DraftPageDetail p={p} onBack={() => go('pages')} onPublish={() => { publishDraftPage(p.id); bump(); toast('Page published — it’s live and collecting its first data.') }} onDelete={() => { removeDraftPage(p.id); toast('Draft deleted.'); go('pages') }} onStartTest={() => newExperiment(p.id)} />
  if (p.spend === 0) return <CollectingPageDetail p={p} onBack={() => go('pages')} onStartTest={() => newExperiment(p.id)} />

  const h = pageHealth(p)
  const life = lifeState(p)
  const running = pageRunningTest(p.id)
  const ended = pageEndedTest(p.id)

  const header = (
    <>
      <div className="mb-3 flex items-center gap-2 text-[13px] text-fg-muted">
        <button onClick={() => go('pages')} className="font-medium hover:text-fg">Pages</button>
        <span className="text-fg-subtle">/</span>
        <span className="text-fg">{p.name}</span>
      </div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-fg">
            <NetIcon net={pageNet(p.id)} /> {p.name}
          </h1>
          <p className="mt-0.5 text-[13px] text-fg-subtle">{p.group === 'Other' ? 'Generic page' : `${p.group} programme`} · pages.onlinejain.com{p.path}</p>
        </div>
        <div className="flex items-center gap-2">
          <RangePicker />
          {running ? (
            <Button variant="primary" size="md" onClick={() => go('experimentdetail', running.id)}>View the test</Button>
          ) : ended ? (
            <>
              <Button variant="default" size="md" onClick={() => go('experimentdetail', ended.id)}>View the winner</Button>
              <Button variant="primary" size="md" onClick={() => newExperiment(p.id)}>Start a test</Button>
            </>
          ) : (
            <Button variant="primary" size="md" onClick={() => newExperiment(p.id)}>Start a test</Button>
          )}
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium', life.cls === 'won' ? 'bg-pos-tint text-pos' : life.cls === 'run' ? 'bg-navy-tint text-navy' : life.cls === 'mute' ? 'bg-sunken text-fg-muted' : 'bg-sunken text-fg-muted')}>
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" /> {life.txt}
        </span>
        <Badge tone={h.tone === 'ok' ? 'pos' : h.tone === 'bad' ? 'neg' : 'warn'}>{h.tone === 'ok' ? 'Healthy' : h.txt}</Badge>
      </div>
      <div className="mb-5 inline-flex rounded-[10px] border border-line bg-sunken p-0.5">
        {([['performance', 'Performance', Wallet], ['behavior', 'Behaviour', Activity]] as const).map(([v, lbl, Icon]) => (
          <button key={v} onClick={() => setView(v)} className={cn('inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-[12.5px] font-medium transition-colors', view === v ? 'bg-panel text-fg shadow-sm' : 'text-fg-subtle hover:text-fg-muted')}>
            <Icon className="h-3.5 w-3.5" />{lbl}
          </button>
        ))}
      </div>
    </>
  )

  if (view === 'behavior') {
    return (
      <div className="mx-auto max-w-[1000px] px-8 py-7">
        {header}
        <BehaviorView p={p} />
      </div>
    )
  }

  // ---- leak variant (spends, converts nothing) ----
  if (p.leads === 0) {
    const reason = p.fault === 'broken_form'
      ? 'The enquiry form fails below 380px. No mobile lead has been recorded since 14 Nov.'
      : 'This intake closed 11 days ago, yet the page is still live and taking Meta spend.'
    return (
      <div className="mx-auto max-w-[1000px] px-8 py-7">
        {header}
        <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-neg/25 bg-neg-tint px-4 py-3 text-[13px] text-fg">
          <AlertTriangle className="h-4 w-4 shrink-0 text-neg" />
          <span><b>This page is spending with zero return.</b> {reason}</span>
        </div>
        <SectionHead title="Where the money goes" hint={label} />
        <Card className="p-5">
          <FunnelChain pageId={p.id} />
          <p className="mt-3 text-[11.5px] text-fg-subtle">Every rupee here reached a page that could not convert it — this is the confirmed leak on Overview.</p>
        </Card>
        <div className="mt-4"><AdsPanel id={p.id} /></div>
        <div className="mt-4"><HealthPanel id={p.id} /></div>
      </div>
    )
  }

  // ---- normal lifecycle variant ----
  return (
    <div className="mx-auto max-w-[1000px] px-8 py-7">
      {header}

      <PageDashboard p={p} />

      <div className="mt-5"><TestInfo id={p.id} /></div>
      <div className="mt-5"><AdsPanel id={p.id} /></div>
      <div className="mt-5"><HealthPanel id={p.id} /></div>
    </div>
  )
}

function TestInfo({ id }: { id: string }) {
  const running = pageRunningTest(id)
  const ended = pageEndedTest(id)
  const p = PAGES.find((x) => x.id === id)!
  const cpl = p.leads ? p.spend / p.leads : null
  return (
    <Card className="p-5">
      {running ? (
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-navy-tint px-2 py-0.5 text-[11px] font-semibold text-navy"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-navy" />Test running</span>
          <div><b className="text-[14px] text-fg">{running.name}</b><p className="mt-1 text-[12.5px] text-fg-muted">A test is live on this page. Its result stays with the experiment, so this page shows only its own economics — one owner per number.</p></div>
        </div>
      ) : ended ? (
        <div className="flex items-start gap-3">
          <span className="rounded-md bg-pos-tint px-2 py-0.5 text-[11px] font-semibold text-pos">Winner shipped</span>
          <div><b className="text-[14px] text-fg">{ended.name}</b><p className="mt-1 text-[12.5px] text-fg-muted">This page now serves the winning variant. The controlled before/after result lives with the experiment.</p></div>
        </div>
      ) : (
        <div>
          <b className="text-[14px] text-fg">No test on this page</b>
          <p className="mt-1 text-[12.5px] text-fg-muted">Its cost per lead is {cpl ? inr(cpl) : '—'}. A test here could bring it toward your cheapest page — use <b>Start a test</b> above.</p>
        </div>
      )}
    </Card>
  )
}

function AdsPanel({ id }: { id: string }) {
  const { factor: f } = useRange()
  const p = PAGES.find((x) => x.id === id)!
  const ads = pageAds(p)
  const cpl = p.leads ? p.spend / p.leads : null
  return (
    <div>
      <SectionHead title="Which ad paid for it" hint="performance by ad" />
      <Card className="overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="border-b border-line">
            <tr className="text-fg-subtle">
              <th className="px-4 py-2.5 text-left font-medium">Ad</th>
              <th className="px-4 py-2.5 text-right font-medium">Spend</th>
              <th className="px-4 py-2.5 text-right font-medium">Clicks</th>
              <th className="px-4 py-2.5 text-right font-medium">Leads</th>
              <th className="px-4 py-2.5 text-right font-medium">Cost per lead</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((a) => (
              <tr key={a.name} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5"><span className="flex items-center gap-2"><NetIcon net={a.net} />{a.name}</span></td>
                <td className="px-4 py-2.5 text-right tnum">{inr(a.spend * f)}</td>
                <td className="px-4 py-2.5 text-right tnum">{num(a.clicks * f)}</td>
                <td className="px-4 py-2.5 text-right tnum">{num(a.leads * f)}</td>
                <td className="px-4 py-2.5 text-right tnum font-semibold">{a.cpl ? inr(a.cpl) : <span className="text-fg-subtle">—</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-surface/60 font-semibold text-fg">
              <td className="px-4 py-2.5">All ads</td>
              <td className="px-4 py-2.5 text-right tnum">{inr(p.spend * f)}</td>
              <td className="px-4 py-2.5 text-right tnum">{num(p.clicks * f)}</td>
              <td className="px-4 py-2.5 text-right tnum">{num(p.leads * f)}</td>
              <td className="px-4 py-2.5 text-right tnum">{cpl ? inr(cpl) : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  )
}

function HealthPanel({ id }: { id: string }) {
  const p = PAGES.find((x) => x.id === id)!
  const errs = p.fault === 'broken_form' ? 122 : p.fault === 'closed_intake' ? 0 : 3
  const tagOk = p.fault !== 'broken_form'
  const rows = [
    { t: 'Conversion tag', d: 'Fires when a lead is captured.', badge: <Badge tone={tagOk ? 'pos' : 'neg'}>{tagOk ? 'Firing correctly' : 'Script erroring'}</Badge> },
    { t: 'Script errors (30 days)', d: 'JavaScript errors caught on this page.', badge: <Badge tone={errs > 20 ? 'neg' : errs > 0 ? 'warn' : 'pos'}>{errs} error{Number(errs) === 1 ? '' : 's'}</Badge> },
    { t: 'Heatmaps & replay', d: 'Microsoft Clarity is connected on this page.', badge: <Badge tone="pos">On</Badge> },
  ]
  return (
    <div>
      <SectionHead title="Page health" hint="tag & script status" />
      <Card>
        {rows.map((r, i) => (
          <motion.div key={r.t} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-0">
            <div className="flex-1"><b className="text-[13.5px] text-fg">{r.t}</b><p className="text-[12px] text-fg-subtle">{r.d}</p></div>
            {r.badge}
          </motion.div>
        ))}
      </Card>
    </div>
  )
}

/* ---------------- draft page — the "afterwards" screen for a newly created page ---------------- */
function DraftPageDetail({ p, onBack, onPublish, onDelete, onStartTest }: { p: Page; onBack: () => void; onPublish: () => void; onDelete: () => void; onStartTest: () => void }) {
  const steps = [
    { done: true, t: 'Page created', d: `${p.name} added to your workspace as a draft.` },
    { done: false, t: 'Build the landing page', d: 'Design it in your builder and host it at the URL below.' },
    { done: false, t: 'Point a campaign at it', d: 'Connect Google or Meta spend so real visitors arrive.' },
    { done: false, t: 'Publish to Samurai', d: 'We start reconciling spend → leads and surface its cost per lead.' },
  ]
  return (
    <div className="mx-auto max-w-[1000px] px-8 py-7">
      <div className="mb-3 flex items-center gap-2 text-[13px] text-fg-muted">
        <button onClick={onBack} className="font-medium hover:text-fg">Pages</button>
        <span className="text-fg-subtle">/</span><span className="text-fg">{p.name}</span>
      </div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-fg"><NetIcon net={pageNet(p.id)} /> {p.name} <Badge tone="neutral">Draft</Badge></h1>
          <p className="mt-0.5 text-[13px] text-fg-subtle">{p.group === 'Other' ? 'Generic page' : `${p.group} programme`} · pages.onlinejain.com{p.path}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="danger" size="md" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /> Delete draft</Button>
          <Button variant="primary" size="md" onClick={onPublish}><Rocket className="h-3.5 w-3.5" /> Publish page</Button>
        </div>
      </div>

      <div className="mb-5 flex items-start gap-2 rounded-[12px] border border-navy/15 bg-navy-tint/40 px-4 py-3 text-[13px] text-fg-muted">
        <PencilRuler className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
        <span><b className="text-fg">This page is a draft.</b> It isn’t live yet — no traffic, no spend — so it doesn’t affect your account totals. Publish it once the landing page is ready and a campaign is pointing at it.</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <SectionHead title="Preview" hint="how the page will look" />
          <div className="overflow-hidden rounded-[12px] border border-line-strong shadow-sm">
            <div className="flex items-center gap-2 border-b border-line bg-sunken px-3 py-2">
              <span className="flex gap-1"><i className="h-2.5 w-2.5 rounded-full bg-line-strong" /><i className="h-2.5 w-2.5 rounded-full bg-line-strong" /><i className="h-2.5 w-2.5 rounded-full bg-line-strong" /></span>
              <span className="flex-1 truncate rounded-md bg-panel px-2.5 py-1 text-center text-[11px] text-fg-subtle">pages.onlinejain.com{p.path} · draft</span>
            </div>
            <div className="bg-panel">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-fg"><span className="grid h-4 w-4 place-items-center rounded-[4px] bg-brand"><i className="h-1.5 w-1.5 rounded-full bg-white" /></span>JAIN Online</span>
                <span className="hidden gap-4 text-[11px] text-fg-subtle sm:flex"><span>Programmes</span><span>Fees</span><span>About</span></span>
              </div>
              <div className="grid gap-4 px-5 py-6 md:grid-cols-[1.3fr_1fr]">
                <div>
                  <span className="inline-block rounded-full bg-pos-tint px-2 py-0.5 text-[10px] font-semibold text-pos">UGC-entitled · NAAC A++</span>
                  <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-tight text-fg">{p.name}</h2>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">Learn from India’s #1 ranked online university. 100% online, industry-aligned, placement support.</p>
                  <span className="mt-3 inline-flex items-center rounded-[9px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white">Apply Now →</span>
                </div>
                <div className="rounded-[12px] border border-line bg-sunken/50 p-4">
                  <div className="mb-2 text-[13px] font-semibold text-fg">Get a call back</div>
                  <div className="space-y-2"><div className="rounded-[8px] border border-line bg-panel px-3 py-2 text-[12px] text-fg-subtle">Full name</div><div className="rounded-[8px] border border-line bg-panel px-3 py-2 text-[12px] text-fg-subtle">Phone number</div></div>
                  <div className="mt-2.5 rounded-[8px] bg-navy py-2.5 text-center text-[12.5px] font-semibold text-white">Request a callback</div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-fg-subtle">A representative preview — the live page is served from your own builder.</p>
        </div>

        <div>
          <SectionHead title="Go-live checklist" hint="what’s left before it collects data" />
          <Card className="p-1">
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-line px-3.5 py-3 last:border-0">
                {s.done ? <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-pos" /> : <Circle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-fg-subtle" />}
                <div><b className={cn('text-[13px]', s.done ? 'text-fg' : 'text-fg-muted')}>{s.t}</b><p className="text-[11.5px] leading-snug text-fg-subtle">{s.d}</p></div>
              </div>
            ))}
          </Card>
          <div className="mt-4 rounded-[12px] border border-navy/15 bg-navy-tint/50 p-4">
            <div className="text-[13px] font-semibold text-fg">Ready to go live?</div>
            <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">Publishing sets the page live. Its metrics stay blank until spend flows — so your totals never move until it truly performs.</p>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="primary" size="md" onClick={onPublish}><Rocket className="h-3.5 w-3.5" /> Publish page</Button>
              <button onClick={onStartTest} className="text-[12.5px] font-medium text-navy hover:underline">Plan a test first</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- published but awaiting first data ---------------- */
function CollectingPageDetail({ p, onBack, onStartTest }: { p: Page; onBack: () => void; onStartTest: () => void }) {
  return (
    <div className="mx-auto max-w-[1000px] px-8 py-7">
      <div className="mb-3 flex items-center gap-2 text-[13px] text-fg-muted">
        <button onClick={onBack} className="font-medium hover:text-fg">Pages</button>
        <span className="text-fg-subtle">/</span><span className="text-fg">{p.name}</span>
      </div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-fg"><NetIcon net={pageNet(p.id)} /> {p.name} <Badge tone="pos">Live</Badge></h1>
          <p className="mt-0.5 text-[13px] text-fg-subtle">{p.group === 'Other' ? 'Generic page' : `${p.group} programme`} · pages.onlinejain.com{p.path}</p>
        </div>
        <Button variant="primary" size="md" onClick={onStartTest}>Start a test</Button>
      </div>
      <Card className="grid place-items-center px-8 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-navy-tint">
          <motion.span className="h-3 w-3 rounded-full bg-navy" animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} />
        </span>
        <h2 className="mt-4 text-[16px] font-semibold text-fg">Live — collecting its first data</h2>
        <p className="mt-1.5 max-w-[48ch] text-[13px] leading-relaxed text-fg-subtle">This page is published but hasn’t received spend yet. Its cost per lead, the spend → lead chain, and on-page behaviour will appear here as traffic starts — nothing is estimated, so your account totals stay exact until it performs.</p>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="default" size="sm" onClick={onBack}>Back to pages</Button>
          <Button variant="navy" size="sm" onClick={onStartTest}>Start a test</Button>
        </div>
      </Card>
    </div>
  )
}
