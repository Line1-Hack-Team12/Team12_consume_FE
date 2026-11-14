import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import IconBox from '../components/ui/IconBox'
import { SCREEN } from '../constants/screens'
import { useAppNavigation } from '../hooks/navigationContext'

const FEATURES = [
  { icon: 'image', tone: 'brand', title: '캡처 몇 장으로 시작', body: '거래를 정리하고, 반복되는 상황을 찾아드려요.' },
  { icon: 'alert', tone: 'coral', title: '돈이 새는 상황을 이해해요', body: '직접 비용과 뒤따른 지출을 함께 확인하세요.' },
  { icon: 'check', tone: 'success', title: '다음 행동은 내가 정해요', body: '원인에 답하고, 지킬 수 있는 횟수 플랜을 골라요.' },
]

// S00 시작
export default function S00StartPage() {
  const { navigate } = useAppNavigation()
  return (
    <ScreenLayout
      showBack={false}
      contentClassName="gap-7"
      footer={<Button onClick={() => navigate(SCREEN.S01)}>시작하기</Button>}
    >
      <div className="flex flex-col gap-1.5">
        <h1 tabIndex={-1} className="text-[30px] leading-[1.35] font-bold tracking-[-0.015em] focus:outline-none">
          모르는 소비 습관을
          <br />
          찾아보세요
        </h1>
        <p className="text-body text-ink-2">결제 내역 캡처만 올리면, 같은 상황에서 반복된 지출과 그 뒤에 따라온 비용까지 보여드려요.</p>
      </div>

      <ul className="flex flex-col gap-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex items-center gap-3.5 rounded-[18px] bg-surface p-[18px]">
            <IconBox name={f.icon} tone={f.tone} />
            <div className="min-w-0">
              <p className="text-body-b">{f.title}</p>
              <p className="text-caption text-ink-2">{f.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-center text-caption text-ink-3">계좌 연결 없이 · 말투 선택 · 태깅과 알림은 선택</p>
    </ScreenLayout>
  )
}
