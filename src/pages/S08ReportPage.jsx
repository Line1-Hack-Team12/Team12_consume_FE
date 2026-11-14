import back from '../assets/icons/chevron-left.svg'
import info from '../assets/icons/info.svg'
import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import Note from '../components/ui/Note'
import SummaryCard from '../components/ui/SummaryCard'
import { DEFAULT_TONE, TONES } from '../constants/limits'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import { S05_PREVIEW_ANALYSIS } from '../mocks/s05Preview'
import { formatKRW } from '../utils/format'
import CategoryShareCard from './S08/CategoryShareCard'
import MonthlyTrendCard from './S08/MonthlyTrendCard'
import ObservationsCard from './S08/ObservationsCard'
import RecurringPaymentsCard from './S08/RecurringPaymentsCard'

// F15·F16·F18. 확정 분석 응답을 표시하며, 화면에서 거래를 다시 집계하거나 탐지하지 않는다.
export default function S08ReportPage({ params }) {
  const { navigate } = useAppNavigation()
  const { settings, snapshot, analysis } = useAnalysisSession()
  const designPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === 's05'
  const result = designPreview ? S05_PREVIEW_ANALYSIS : snapshot && analysis?.snapshotId === snapshot.id ? analysis : null
  const validResult = !params?.snapshotId || params.snapshotId === result?.snapshotId ? result : null
  const report = validResult?.report
  const tone = TONES.some((item) => item.value === settings.tone) ? settings.tone : DEFAULT_TONE
  const goHome = () => navigate(SCREEN.S05, {}, { replace: true })

  if (!validResult) {
    return (
      <ScreenLayout title="먼저 분석 결과를 확인해 주세요" onBack={goHome} backFallback={SCREEN.S05}
        footer={<Button onClick={goHome}>결과 홈으로</Button>}>
        <Note>기록을 검토하고 확정하면 같은 기록을 기준으로 소비 리포트를 확인할 수 있어요.</Note>
      </ScreenLayout>
    )
  }

  const summary = report?.summaryByTone?.[tone] ?? report?.summaryByTone?.coach

  return (
    <ScreenLayout title="소비 리포트 상세" onBack={goHome} backFallback={SCREEN.S05}
      backIcon={<img src={back} width={24} height={24} alt="" className="block" />}
      contentClassName="gap-4!"
      footer={<>
        <Button onClick={() => navigate(SCREEN.S10, { snapshotId: validResult.snapshotId })}>리포트 확인 완료</Button>
        <Button variant="secondary" onClick={goHome}>결과 홈으로</Button>
      </>}>
      <SummaryCard caption={report?.periodLabel ?? validResult.periodLabel} amount={formatKRW(validResult.totalKrw)} largeAmount>
        {summary ? <p className="text-body-m text-white/85" aria-live="polite">{summary}</p> : <p className="text-body-m text-white/85">확정한 기록의 지출 합계예요.</p>}
      </SummaryCard>

      {report ? <>
        <CategoryShareCard categories={report.categories} />
        <MonthlyTrendCard months={report.months} comparison={report.monthComparison} />
        <ObservationsCard observations={report.observations} tone={tone} />
        {report.recurring ? <RecurringPaymentsCard recurring={report.recurring} /> : null}
        <Note tone="gray" iconContent={<img src={info} width={16} height={16} alt="" className="shrink-0" />}>
          <p>{report.limitations.join(' ')}</p>
        </Note>
      </> : (
        <Note tone="warn" icon="alert">지출 합계는 확인할 수 있지만 리포트 상세 자료가 아직 없어요. 결과 홈에서 다른 분석 내용을 확인할 수 있어요.</Note>
      )}

      {validResult.mode === 'demo' ? <p className="text-micro text-ink-3">{designPreview ? '디자인 미리보기 · 합성 예시 데이터예요.' : '데모 리포트 · 확정한 예시 거래 기준이에요. 실제 AI·날씨·정기결제 분석은 아직 연결되지 않았어요.'}</p> : null}
    </ScreenLayout>
  )
}
