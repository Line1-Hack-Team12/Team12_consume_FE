import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router'
import AnalysisSessionProvider from './components/layout/AnalysisSessionProvider'
import NavigationProvider from './components/layout/NavigationProvider'
import { useAppNavigation } from './hooks/navigationContext'
import PlaceholderPage from './pages/PlaceholderPage'
import { SCREEN_COMPONENTS } from './pages/registry'
import { SCREEN, SCREEN_PATHS } from './constants/screens'

function ScreenRoute({ Page }) {
  const { current } = useAppNavigation()
  return Page ? <Page key={current.key} params={current.params} /> : <PlaceholderPage screenId={current.id} />
}

function RouterLayout() {
  return <NavigationProvider><Outlet /></NavigationProvider>
}

function ScreenRedirect({ path }) {
  const location = useLocation()
  // 기존 북마크의 해시 주소도 일반 경로로 옮긴다.
  const legacy = location.pathname === '/' && location.hash.startsWith('#/')
    ? new URL(location.hash.slice(1), window.location.origin)
    : null
  const pathname = legacy ? SCREEN_PATHS[legacy.pathname.slice(1)] ?? legacy.pathname : path
  const search = new URLSearchParams(location.search)
  legacy?.searchParams.forEach((value, key) => search.set(key, value))
  return <Navigate to={{ pathname, search: search.toString() }} state={location.state} replace />
}

const router = createBrowserRouter([{
  element: <RouterLayout />,
  children: [
    { index: true, element: <ScreenRedirect path={SCREEN_PATHS[SCREEN.S00]} /> },
    ...Object.entries(SCREEN_COMPONENTS).flatMap(([id, Page]) => [
      { path: SCREEN_PATHS[id], element: <ScreenRoute Page={Page} /> },
      { path: id, element: <ScreenRedirect path={SCREEN_PATHS[id]} /> },
    ]),
    { path: '*', element: <ScreenRoute /> },
  ],
}])

export default function App() {
  return (
    <AnalysisSessionProvider>
      <RouterProvider router={router} />
    </AnalysisSessionProvider>
  )
}
