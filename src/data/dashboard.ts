import { DEFAULT_FUNNEL, type FunnelDef } from './funnels'

/* ============================================================================
   Page dashboard — the Performance view is a grid of widgets the user can
   reorder (drag), resize (compact ↔ wide) and collapse. Funnels are editable
   widgets created/edited through a modal; the two common ones (the spend→lead
   funnel and cost-per-lead-over-time) ship by default. Layout + any user funnels
   persist per tenant + page.
   ========================================================================== */

export type WidgetKind = 'funnel' | 'trend' | 'bar' | 'donut' | 'kpi' | 'cpl-trend' | 'revenue'
export type WidgetSize = 'half' | 'full'
export interface WidgetCfg {
  id: string
  kind: WidgetKind
  title: string
  def?: FunnelDef      // present on funnel widgets
  source?: string      // present on chart widgets (trend/bar/donut/kpi) — the metric id, or 'custom'
  customLabel?: string // when source === 'custom': the user's name for the field
  customField?: string // when source === 'custom': the CRM field it maps to
  size: WidgetSize
  collapsed?: boolean
  builtin?: boolean    // the shipped widgets — reorder/resize/collapse, but not removed
}

export function defaultDashboard(): WidgetCfg[] {
  return [
    { id: 'chain', kind: 'funnel', title: 'How spend becomes a lead', def: { ...DEFAULT_FUNNEL, name: 'How spend becomes a lead' }, size: 'full', builtin: true },
    { id: 'cpl-trend', kind: 'cpl-trend', title: 'Cost per lead over time', size: 'half', builtin: true },
    { id: 'revenue', kind: 'revenue', title: 'What your spend returned', size: 'half', builtin: true },
  ]
}

const KEY = (tenantId: string, pageId: string) => `samurai.dash.${tenantId}.${pageId}`

export function loadDashboard(tenantId: string, pageId: string): WidgetCfg[] {
  try {
    const raw = localStorage.getItem(KEY(tenantId, pageId))
    if (raw) { const w = JSON.parse(raw); if (Array.isArray(w) && w.length) return w }
  } catch { /* ignore — fall back to defaults */ }
  return defaultDashboard()
}
export function saveDashboard(tenantId: string, pageId: string, widgets: WidgetCfg[]) {
  try { localStorage.setItem(KEY(tenantId, pageId), JSON.stringify(widgets)) } catch { /* ignore */ }
}
export function resetDashboard(tenantId: string, pageId: string) {
  try { localStorage.removeItem(KEY(tenantId, pageId)) } catch { /* ignore */ }
}
export const newFunnelId = () => `f-${Math.round(Math.random() * 1e9).toString(36)}-${Date.now().toString(36)}`
