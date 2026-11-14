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

function StartRedirect() {
  const { search, state } = useLocation()
  return <Navigate to={{ pathname: SCREEN_PATHS[SCREEN.S00], search }} state={state} replace />
}

const router = createBrowserRouter([{
  element: <RouterLayout />,
  children: [
    { index: true, element: <StartRedirect /> },
    ...Object.entries(SCREEN_COMPONENTS).map(([id, Page]) => (
      { path: SCREEN_PATHS[id], element: <ScreenRoute Page={Page} /> }
    )),
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
