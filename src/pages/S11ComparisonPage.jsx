import alert from '../assets/icons/alert-warning.svg'
import backIcon from '../assets/icons/chevron-left.svg'
import info from '../assets/icons/info.svg'
import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Note from '../components/ui/Note'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import { S11_PREVIEW } from '../mocks/s11Preview'

function ComparisonRow({ period }) {
  const after = period.id === 'after'
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-caption-m text-ink-2">{period.label}</p>
        <p className={`text-body-b ${after ? 'text-brand' : 'text-ink'}`}>{period.weeks}주 중 {period.count}회</p>
      </div>
      <div className="h-3 overflow-clip rounded-full bg-subtle" aria-hidden="true">
        <div className={`h-full rounded-full ${after ? 'bg-brand' : 'bg-line-strong'}`} style={{ width: `${period.count / period.weeks * 100}%` }} />
      </div>
    </div>
  )
}

// S11은 독립된 발표용 화면이다. 합성 예시를 조회할 때 세션 상태를 변경하거나 저장하지 않는다.
export default function S11ComparisonPage() {
  const { navigate, back } = useAppNavigation()
  const { snapshot, analysis } = useAnalysisSession()
  const designPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === 's05'
  const canReturnToCompletion = designPreview || Boolean(snapshot && analysis?.snapshotId === snapshot.id)
  const returnToCompletion = () => navigate(canReturnToCompletion ? SCREEN.S10 : SCREEN.S00, {}, { replace: true })

  return (
    <ScreenLayout title="한 달 뒤 변화 예시" backFallback={canReturnToCompletion ? SCREEN.S10 : SCREEN.S00}
      onBack={() => back(canReturnToCompletion ? SCREEN.S10 : SCREEN.S00)}
      backIcon={<img src={backIcon} width={24} height={24} alt="" className="block" />}
      footer={<Button variant="secondary" onClick={returnToCompletion}>{canReturnToCompletion ? '완료로 돌아가기' : '시작 화면으로'}</Button>}>
      <section className="flex flex-col gap-0.5 rounded-[14px] border border-warning bg-warning-tint px-4 py-3.5" aria-labelledby="comparison-demo-title">
        <h2 id="comparison-demo-title" className="flex items-center gap-1.5 text-body-b">
          <img src={alert} width={16} height={16} alt="" className="shrink-0" />
          발표용 합성 데이터
        </h2>
        <p className="text-caption text-ink-2">실제 사용자의 변화가 아닙니다.</p>
      </section>

      <Card padding="lg" className="flex flex-col gap-4" aria-labelledby="comparison-pattern-title">
        <h2 id="comparison-pattern-title" className="text-heading">{S11_PREVIEW.patternTitle}</h2>
        {S11_PREVIEW.periods.map((period) => <ComparisonRow key={period.id} period={period} />)}
      </Card>

      <Note tone="gray" iconContent={<img src={info} width={16} height={16} alt="" className="shrink-0" />}>
        기간이 다른 단순 예시이며 실제 개선 효과를 증명하지 않아요.
      </Note>
    </ScreenLayout>
  )
}
