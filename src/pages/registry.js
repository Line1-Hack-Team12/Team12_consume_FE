import { SCREEN } from '../constants/screens'
import E02DuplicatePage from './E02DuplicatePage'
import S00StartPage from './S00StartPage'
import S01SettingsPage from './S01SettingsPage'
import S02ExtractionPage from './S02ExtractionPage'
import S03EditPage from './S03EditPage'
import S03FinalizingPage from './S03FinalizingPage'
import S03ReviewPage from './S03ReviewPage'
import S03TablePage from './S03TablePage'
import S05ResultsPage from './S05ResultsPage'
import S05PatternDetailPage from './S05PatternDetailPage'
import S09SavingsPlanPage from './S09SavingsPlanPage'

// 화면 ID → 화면 컴포넌트. 새 화면을 만들면 여기에 한 줄 추가한다.
// 등록하지 않은 ID는 PlaceholderPage가 보인다.
export const SCREEN_COMPONENTS = {
  [SCREEN.S00]: S00StartPage,
  [SCREEN.S01]: S01SettingsPage,
  [SCREEN.S02]: S02ExtractionPage,
  [SCREEN.S03]: S03ReviewPage,
  [SCREEN.S03_E]: S03EditPage,
  [SCREEN.S03_T]: S03TablePage,
  [SCREEN.S03_P]: S03FinalizingPage,
  [SCREEN.S05]: S05ResultsPage,
  [SCREEN.S05_1]: S05PatternDetailPage,
  [SCREEN.S09]: S09SavingsPlanPage,
  [SCREEN.E02]: E02DuplicatePage,
}
