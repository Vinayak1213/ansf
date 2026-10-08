import { EXPERIMENTS, PAGES, ecpl, variantCpl, type ExpVariable, type Experiment, type Page } from './samurai'

export const expById = (id: string) => EXPERIMENTS.find((e) => e.id === id)
export const expPage = (e: Experiment): Page | undefined => PAGES.find((p) => p.id === e.pageId)

export interface FunnelStage { name: string; value: number; pct: number }
export function expFunnel(e: Experiment): { ctrl: FunnelStage[]; var: FunnelStage[] } {
  const g = (k: string, arm: 'c' | 'v') => {
    const c = e.corr.find((x) => x.label.toLowerCase().startsWith(k))
    return c ? c[arm] : null
  }
  const build = (vis: number, fs: number | null, ap: number | null, lead: number): FunnelStage[] =>
    ([['Visitors', vis], ['Form started', fs], ['Apply-Now', ap], ['Enquiry', lead]] as [string, number | null][])
      .filter((s) => s[1] != null)
      .map(([name, value]) => ({ name, value: value as number, pct: Math.round(((value as number) / vis) * 100) }))
  return {
    ctrl: build(e.control.v, g('form', 'c'), g('apply', 'c'), e.control.leads),
    var: build(e.variant.v, g('form', 'v'), g('apply', 'v'), e.variant.leads),
  }
}

export function expDaily(e: Experiment) {
  const n = Math.max(2, Math.min(e.days || 2, 14))
  const cF = ecpl(e.control) || 0
  const vF = ecpl(e.variant) || 0
  const gen = (final: number) => {
    const a: number[] = []
    for (let i = 0; i < n; i++) {
      const p = (i + 1) / n
      a.push(Math.round(final * (1 + (1 - p) * 0.32 + (1 - p) * 0.18 * Math.sin(i * 1.4))))
    }
    a[n - 1] = Math.round(final)
    return a
  }
  return { n, ctrl: gen(cF), var: gen(vF) }
}

export interface MetricRow { label: string; c: number; v: number; fmt: 'inr' | 'pct' | 'num'; hb: boolean; goal?: boolean }
export function buildMetricRows(e: Experiment): MetricRow[] {
  const cc = ecpl(e.control)!
  const vc = ecpl(e.variant)!
  const cConv = (e.control.leads / e.control.v) * 100
  const vConv = (e.variant.leads / e.variant.v) * 100
  const rows: MetricRow[] = [
    { label: 'Cost per lead', c: cc, v: vc, fmt: 'inr', hb: false },
    { label: 'Conversion rate', c: cConv, v: vConv, fmt: 'pct', hb: true },
  ]
  e.corr.forEach((c) => rows.push({ label: c.label, c: c.c, v: c.v, fmt: 'num', hb: true, goal: c.label.toLowerCase().startsWith('apply') }))
  return rows
}

export const readinessPct = (e: Experiment) =>
  ({ best: 100, low: 100, nodiff: 100, good: 75, learning: 45, pending: 20, limited: 35 } as Record<string, number>)[e.verdict] ?? 50

export function estDecision(p: Page | undefined, mult: number) {
  const dailyLeads = (p && p.leads ? p.leads : 30) / 30
  const base = Math.max(8, Math.round(16 / (dailyLeads + 0.3)))
  const days = Math.round(base * (mult || 1))
  const human = days < 45 ? days + ' days' : days < 400 ? Math.round(days / 30) + ' months' : Math.round((days / 365) * 10) / 10 + ' years'
  return { days, human }
}

// ---- N-variant (A/B/C…) derivations --------------------------------
export interface NVarFunnel { letter: string; name: string; stages: FunnelStage[] }
/** Per-variant funnel: Visitors → signals (ordered by total volume, desc) → goal. Stage order is shared across variants so columns line up. */
export function nvarFunnel(e: Experiment): NVarFunnel[] {
  const variants = e.variants ?? []
  const vars = e.variables ?? []
  const goal = vars.find((v) => v.isGoal) ?? vars[0]
  const signals = vars.filter((v) => v !== goal)
  const totalOf = (v: ExpVariable) => variants.reduce((s, vr) => s + (v.arms[vr.letter]?.count ?? 0), 0)
  const ordered = [...signals].sort((a, b) => totalOf(b) - totalOf(a))
  const stageVars = [...ordered, ...(goal ? [goal] : [])]
  return variants.map((vr) => ({
    letter: vr.letter,
    name: vr.name,
    stages: [
      { name: 'Visitors', value: vr.v, pct: 100 },
      ...stageVars.map((sv) => {
        const c = sv.arms[vr.letter]?.count ?? 0
        return { name: sv.name, value: c, pct: vr.v ? Math.round((c / vr.v) * 100) : 0 }
      }),
    ],
  }))
}

/** Per-variant cost-per-goal daily series, each line settling on that variant's real CPL. */
export function nvarDaily(e: Experiment) {
  const variants = e.variants ?? []
  const n = Math.max(2, Math.min(e.days || 2, 14))
  const gen = (final: number, seed: number) => {
    const a: number[] = []
    for (let i = 0; i < n; i++) {
      const p = (i + 1) / n
      a.push(Math.round(final * (1 + (1 - p) * 0.32 + (1 - p) * 0.18 * Math.sin(i * 1.4 + seed))))
    }
    a[n - 1] = Math.round(final)
    return a
  }
  return { n, series: variants.map((vr, i) => ({ letter: vr.letter, name: vr.name, data: gen(variantCpl(e, vr.letter) ?? 0, i * 0.7) })) }
}

export const DETECTED = ['Apply Now button', 'Request a callback button', 'Download prospectus button', 'WhatsApp enquiry button', 'Call now button', 'Enquiry form']

export interface Scenario { k: string; name: string; desc: string; mult: number; rec?: boolean }
export const SCENARIOS: Scenario[] = [
  { k: 'apply', name: 'Apply-Now click', desc: 'A visitor clicks Apply Now — our default micro-conversion.', mult: 1, rec: true },
  { k: 'form_start', name: 'Form started', desc: 'A visitor focuses the first field of the enquiry form.', mult: 0.8 },
  { k: 'callback', name: 'Callback requested', desc: 'A visitor asks to be called back.', mult: 2 },
  { k: 'brochure', name: 'Prospectus downloaded', desc: 'A visitor downloads the prospectus.', mult: 1.6 },
  { k: 'whatsapp', name: 'WhatsApp enquiry', desc: 'A visitor opens WhatsApp to enquire.', mult: 2.5 },
  { k: 'enrol', name: 'Enrolment', desc: 'The final outcome — accurate, but rare.', mult: 18 },
  { k: 'fee', name: 'Fee paid', desc: 'Programme fee received — the rarest signal.', mult: 30 },
]
export const scenByKey = (k: string) => SCENARIOS.find((s) => s.k === k)
export function elMult(el: string) {
  el = (el || '').toLowerCase()
  if (el.includes('apply')) return 1
  if (el.includes('form')) return 0.8
  if (el.includes('prospectus') || el.includes('brochure')) return 1.6
  if (el.includes('callback')) return 2
  if (el.includes('call')) return 2.2
  if (el.includes('whatsapp')) return 2.5
  return 2
}
