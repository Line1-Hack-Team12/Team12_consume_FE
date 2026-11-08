import AnalysisSessionProvider from './components/layout/AnalysisSessionProvider'
import NavigationProvider from './components/layout/NavigationProvider'
import { useNavigation } from './hooks/navigationContext'
import PlaceholderPage from './pages/PlaceholderPage'
import { SCREEN_COMPONENTS } from './pages/registry'

function CurrentScreen() {
  const { current } = useNavigation()
  const Page = SCREEN_COMPONENTS[current.id]
  if (!Page) return <PlaceholderPage screenId={current.id} />
  return <Page params={current.params} />
}

export default function App() {
  return (
    <AnalysisSessionProvider>
      <NavigationProvider>
        <CurrentScreen />
      </NavigationProvider>
    </AnalysisSessionProvider>
  )
}
