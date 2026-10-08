/* Experiment templates — a multi-variant test you set up on the interaction map.
   You pick the variant PAGES (existing pages), define your own VARIABLES (named metrics — one is the
   goal, the rest are signals), and place each variable on every variant's page. A variable can sit on
   a DIFFERENT button per variant, which is what makes them compare like-for-like. The dashboard shows
   each variable across every variant: A vs B vs C … */

/* ---- the clickable elements a landing page exposes ---- */
export interface PageElement { k: string; label: string; kind: 'button' | 'form' | 'link' }
export const PAGE_ELEMENTS: PageElement[] = [
  { k: 'apply', label: 'Apply Now', kind: 'button' },
  { k: 'form', label: 'Enquiry form', kind: 'form' },
  { k: 'callback', label: 'Request a callback', kind: 'button' },
  { k: 'prospectus', label: 'Download prospectus', kind: 'button' },
  { k: 'whatsapp', label: 'WhatsApp enquiry', kind: 'link' },
  { k: 'call', label: 'Call now', kind: 'link' },
]
export const elLabel = (k: string) => PAGE_ELEMENTS.find((e) => e.k === k)?.label ?? k
/** how rare each element is vs a raw enquiry — drives the decision-time estimate */
export const EL_MULT: Record<string, number> = { apply: 1, form: 0.8, callback: 2, prospectus: 1.6, whatsapp: 2.5, call: 2.2 }

/* ---- a custom VARIABLE: a named metric. Exactly one is the goal (the decision); the rest are signals. ---- */
export interface Variable { id: string; name: string; isGoal?: boolean }
export const makeVarId = () => 'v' + Math.random().toString(36).slice(2, 6)
export const goalVariable = (vs: Variable[]): Variable | undefined => vs.find((v) => v.isGoal) ?? vs[0]
export const defaultVariables = (): Variable[] => [
  { id: 'enquiry', name: 'Enquiry', isGoal: true },
  { id: 'primary', name: 'Primary action' },
]

/* ---- a VARIANT = an existing page, with a letter A–E ---- */
export interface VariantRef { pageId: string; letter: string }
export const LETTERS = ['A', 'B', 'C', 'D', 'E']

/* ---- the panels a dashboard can hold (kept for the template card / review summary) ---- */
export interface Panel { k: string; name: string; desc: string }
export const PANELS: Panel[] = [
  { k: 'verdict', name: 'Cost-per-lead verdict', desc: 'Cost per lead across variants — the decision.' },
  { k: 'goal', name: 'Goal conversion', desc: 'Your goal variable, across every variant.' },
  { k: 'signals', name: 'Corroborating signals', desc: 'Your signal variables, across variants.' },
  { k: 'overtime', name: 'Cost per lead over time', desc: 'How the gap develops day by day.' },
]
export const panelName = (k: string) => PANELS.find((p) => p.k === k)?.name ?? k

/* ---- guardrails (monitoring) ---- */
export interface GuardrailDef { k: string; name: string; desc: string; unit: '%' | 'h'; def: number; dir?: 'up' | 'down' }
export const GUARDRAILS: GuardrailDef[] = [
  { k: 'cpl_rise', name: 'Cost per lead rises', desc: "Alert if a variant's cost per lead climbs past the threshold.", unit: '%', def: 15, dir: 'up' },
  { k: 'form_health', name: 'Form takes zero leads', desc: 'Alert if a variant stops converting for this many hours.', unit: 'h', def: 6 },
  { k: 'mobile_drop', name: 'Mobile conversion drops', desc: 'Alert if mobile conversion falls sharply after launch.', unit: '%', def: 20, dir: 'down' },
  { k: 'sample_ratio', name: 'Traffic split skews', desc: 'Alert if the even split drifts (sample-ratio mismatch).', unit: '%', def: 5 },
]
export const guardrailDef = (k: string) => GUARDRAILS.find((g) => g.k === k)

export const NOTIFY = ['WhatsApp', 'Email', 'Slack'] as const
export interface Guardrail { k: string; threshold: number; on: boolean }

export interface ExperimentTemplate {
  id: string
  name: string
  description: string
  change: string
  suggestedFor: string[] // soft hint only — not a hard target
  variables: Variable[] // custom named metrics; exactly one is the goal
  variants: VariantRef[] // the pages being compared (2–5), each with a letter
  placement: Record<string, Record<string, string>> // pageId → variableId → elementKey (where each variable sits on each variant)
  dashboard: string[] // ordered panel keys
  guardrails: Guardrail[]
  minVisitors: number
  notify: (typeof NOTIFY)[number]
  usedBy: number
}

export const TEMPLATES: ExperimentTemplate[] = [
  {
    id: 't-fold', name: 'Fold + fee nudge', description: 'Our proven winner — move the form above the fold and answer cost before the ask.',
    change: 'Fold layout + fee/scholarship nudge', suggestedFor: ['MBA', 'MCA', 'BBA'],
    variables: [{ id: 'enquiry', name: 'Enquiry', isGoal: true }, { id: 'primary', name: 'Primary action' }, { id: 'brochure', name: 'Prospectus download' }],
    variants: [{ pageId: 'mba', letter: 'A' }, { pageId: 'bba', letter: 'B' }],
    placement: {
      mba: { enquiry: 'form', primary: 'apply', brochure: 'prospectus' },
      bba: { enquiry: 'form', primary: 'apply', brochure: 'prospectus' },
    },
    dashboard: ['verdict', 'goal', 'signals'],
    guardrails: [{ k: 'cpl_rise', threshold: 12, on: true }, { k: 'form_health', threshold: 6, on: true }],
    minVisitors: 120, notify: 'WhatsApp', usedBy: 3,
  },
  {
    id: 't-scholarship', name: 'Scholarship banner', description: 'Put affordability in the first fold to lift intent early.',
    change: 'Scholarship banner above the fold', suggestedFor: ['B.Sc', 'BA', 'B.Com'],
    variables: defaultVariables(),
    variants: [{ pageId: 'bsc', letter: 'A' }, { pageId: 'ba', letter: 'B' }],
    placement: { bsc: { enquiry: 'form', primary: 'apply' }, ba: { enquiry: 'form', primary: 'apply' } },
    dashboard: ['verdict', 'goal', 'signals'],
    guardrails: [{ k: 'cpl_rise', threshold: 15, on: true }],
    minVisitors: 150, notify: 'WhatsApp', usedBy: 1,
  },
  {
    id: 't-form', name: 'Shorter enquiry form', description: 'Ask name and phone first, email last — fewer mid-form drop-offs.',
    change: 'Reordered, shorter enquiry form', suggestedFor: ['any programme'],
    variables: [{ id: 'enquiry', name: 'Enquiry', isGoal: true }],
    variants: [{ pageId: 'mca', letter: 'A' }, { pageId: 'bca', letter: 'B' }],
    placement: { mca: { enquiry: 'form' }, bca: { enquiry: 'form' } },
    dashboard: ['verdict', 'goal'],
    guardrails: [{ k: 'form_health', threshold: 4, on: true }, { k: 'sample_ratio', threshold: 5, on: true }],
    minVisitors: 100, notify: 'Email', usedBy: 0,
  },
]

export function blankTemplate(): ExperimentTemplate {
  return {
    id: 'draft', name: '', description: '', change: '', suggestedFor: [],
    variables: defaultVariables(), variants: [], placement: {},
    dashboard: ['verdict', 'goal'], guardrails: [{ k: 'cpl_rise', threshold: 15, on: true }],
    minVisitors: 120, notify: 'WhatsApp', usedBy: 0,
  }
}
