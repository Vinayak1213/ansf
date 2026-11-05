import { createContext, useContext, useState, type ReactNode } from 'react'

export type RouteName =
  | 'overview'
  | 'alerts'
  | 'audience'
  | 'studio'
  | 'decisions'
  | 'pages'
  | 'pagedetail'
  | 'experiments'
  | 'experimentdetail'
  | 'sandbox'
  | 'campaigns'
  | 'campaigndetail'
  | 'ai'
  | 'settings'
  | 'onboarding'

export type Route = { name: RouteName; param?: string }

const NavCtx = createContext<{ route: Route; go: (name: RouteName, param?: string) => void }>({
  route: { name: 'overview' },
  go: () => {},
})

export const useNav = () => useContext(NavCtx)

/** the sidebar's highlighted item for a given route */
export function baseOf(name: RouteName): RouteName {
  if (name === 'pagedetail') return 'pages'
  if (name === 'experimentdetail' || name === 'sandbox') return 'experiments'
  if (name === 'campaigndetail') return 'campaigns'
  if (name === 'onboarding') return 'settings'
  return name
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>({ name: 'overview' })
  const go = (name: RouteName, param?: string) => {
    setRoute({ name, param })
    window.scrollTo({ top: 0 })
  }
  return <NavCtx.Provider value={{ route, go }}>{children}</NavCtx.Provider>
}
