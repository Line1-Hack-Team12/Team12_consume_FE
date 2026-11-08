import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import Note from '../components/ui/Note'
import { SCREEN } from '../constants/screens'
import { useNavigation } from '../hooks/navigationContext'

// 아직 구현하지 않은 화면 ID로 이동했을 때 보여주는 임시 화면
export default function PlaceholderPage({ screenId }) {
  const { navigate } = useNavigation()
  return (
    <ScreenLayout
      title={`${screenId} 화면 준비 중`}
      footer={
        <Button variant="secondary" onClick={() => navigate(SCREEN.S00)}>
          처음으로
        </Button>
      }
    >
      <Note tone="gray">이 화면은 아직 만들고 있어요. src/pages/registry.js에 화면을 등록하면 여기 대신 보여요.</Note>
    </ScreenLayout>
  )
}
