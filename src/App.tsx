import { useEffect, useRef, useState } from 'react'
import { NavProvider, baseOf, useNav } from '@/lib/nav'
import { TenantProvider, isOperatorView, ownsSeededData, useTenant } from '@/lib/tenant'
import { WorkspaceEmpty } from '@/components/WorkspaceEmpty'
import { OperatorViewBanner } from '@/components/OperatorViewBanner'
import { Onboarding } from '@/features/onboarding/Onboarding'
import { RangeProvider } from '@/lib/range'
import { InvestigateProvider } from '@/components/Investigate'
import { ToastProvider } from '@/components/Toast'
import { Sidebar, Topbar, type Screen } from '@/components/Shell'
import { Overview } from '@/features/Overview'
import { Audience } from '@/features/Audience'
import { Decisions } from '@/features/Decisions'
import { EnrollmentStudio } from '@/features/EnrollmentStudio'
import { SmartAlerts } from '@/features/SmartAlerts'
import { Pages } from '@/features/Pages'
import { PageDetail } from '@/features/PageDetail'
import { Experiments } from '@/features/Experiments'
import { ExperimentDetail } from '@/features/ExperimentDetail'
import { TemplateBuilder } from '@/features/experiments/builder/TemplateBuilder'
import { ExperimentsProvider } from '@/features/experiments/ExperimentsProvider'
import { Campaigns } from '@/features/Campaigns'
import { CampaignDetail } from '@/features/CampaignDetail'
import { Settings } from '@/features/Settings'
import { SamuraiAI } from '@/ai/SamuraiAI'

function readCollapsed() {
  try { return localStorage.getItem('samurai.sidebar') === 'collapsed' } catch { return false }
}

function AppInner() {
  const { route, go } = useNav()
  const { tenant } = useTenant()
  const owns = ownsSeededData(tenant)
  const operatorView = isOperatorView()
  const base = baseOf(route.name)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const toggleCollapse = () => setCollapsed((c) => { const n = !c; try { localStorage.setItem('samurai.sidebar', n ? 'collapsed' : 'open') } catch { /* ignore */ } return n })

  // A client arriving on their invite link (?tenant=…&invite=… , or &setup=1) and whose
  // workspace is still awaiting setup is dropped straight into the self-serve complete flow,
  // which finishes that same tenant. Runs once; normal boot (no such param) is unaffected.
  const booted = useRef(false)
  useEffect(() => {
    if (booted.current) return
    booted.current = true
    try {
      const p = new URLSearchParams(window.location.search)
      // Under an operator view-as, never auto-enter the self-serve complete flow — the
      // operator is viewing read-only, not finishing the client's setup for them.
      if ((p.get('invite') || p.get('setup')) && tenant.fresh && !operatorView) go('onboarding', 'complete')
    } catch { /* ignore */ }
  }, [tenant.fresh, go])

  // Focused, full-screen journeys — they take over the whole viewport (no shell).
  if (route.name === 'sandbox') return <TemplateBuilder id={route.param!} />
  if (route.name === 'onboarding') return <Onboarding />

  return (
    <div className="flex min-h-screen flex-col bg-surface text-fg">
      {operatorView && <OperatorViewBanner />}
      <div className="flex min-h-0 flex-1">
      <Sidebar active={base as Screen} onNavigate={(s) => go(s)} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        <main className="flex-1" key={route.name + (route.param ?? '')}>
          {/* Only the data-owning tenant renders the bundled dataset; every other
              workspace gets an honest empty state (no other client's numbers). Gated
              here (component swap) so switching workspace can't violate rules of hooks.
              Overview self-gates (cold-start vs owner), and Settings is per-tenant. */}
          {route.name === 'overview' && <Overview />}
          {route.name === 'alerts' && (owns ? <SmartAlerts /> : <WorkspaceEmpty screen="alerts" />)}
          {route.name === 'audience' && (owns ? <Audience /> : <WorkspaceEmpty screen="audience" />)}
          {route.name === 'studio' && (owns ? <EnrollmentStudio /> : <WorkspaceEmpty screen="studio" />)}
          {route.name === 'decisions' && (owns ? <Decisions /> : <WorkspaceEmpty screen="decisions" />)}
          {route.name === 'pages' && (owns ? <Pages /> : <WorkspaceEmpty screen="pages" />)}
          {route.name === 'pagedetail' && (owns ? <PageDetail id={route.param!} /> : <WorkspaceEmpty screen="pages" />)}
          {route.name === 'ai' && (owns ? <SamuraiAI /> : <WorkspaceEmpty screen="ai" />)}
          {route.name === 'experiments' && (owns ? <Experiments /> : <WorkspaceEmpty screen="experiments" />)}
          {route.name === 'experimentdetail' && (owns ? <ExperimentDetail id={route.param!} /> : <WorkspaceEmpty screen="experiments" />)}
          {route.name === 'campaigns' && (owns ? <Campaigns /> : <WorkspaceEmpty screen="campaigns" />)}
          {route.name === 'campaigndetail' && (owns ? <CampaignDetail id={route.param!} /> : <WorkspaceEmpty screen="campaigns" />)}
          {route.name === 'settings' && <Settings />}
        </main>
      </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <TenantProvider>
        <InvestigateProvider>
          <RangeProvider>
            <NavProvider>
              <ExperimentsProvider>
                <AppInner />
              </ExperimentsProvider>
            </NavProvider>
          </RangeProvider>
        </InvestigateProvider>
      </TenantProvider>
    </ToastProvider>
  )
}
