import check from '../assets/s10/check.svg'
import sparkle from '../assets/s10/sparkle.svg'
import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import IconBox from '../components/ui/IconBox'
import Note from '../components/ui/Note'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useNavigation } from '../hooks/navigationContext'
import useCompletionSummary from '../hooks/useCompletionSummary'
import { S05_PREVIEW_ANALYSIS } from '../mocks/s05Preview'
import { formatKRW, formatNumber } from '../utils/format'

function SummaryRow({ label, children }) {
  return <div className="flex items-start justify-between gap-2 border-t border-line py-[13px] first:border-0">
    <dt className="min-w-0 flex-1 text-body text-ink-2">{label}</dt>
    <dd className="max-w-[65%] text-right text-body-b [overflow-wrap:anywhere]">{children}</dd>
  </div>
}

// S10은 현재 확정 기록의 선택 상태를 요약한다. 절감 성과나 변화 추적 결과를 생성하지 않는다.
export default function S10CompletionPage({ params }) {
  const { navigate } = useNavigation()
  const { snapshot, analysis } = useAnalysisSession()
  const designPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === 's05'
  const result = designPreview ? S05_PREVIEW_ANALYSIS : snapshot && analysis?.snapshotId === snapshot.id ? analysis : null
  const validResult = !params?.snapshotId || params.snapshotId === result?.snapshotId ? result : null
  const summary = useCompletionSummary({ result: validResult, designPreview })
  const goHome = () => navigate(SCREEN.S05, {}, { replace: true })

  if (!validResult) {
    return <ScreenLayout showBack={false} tone="surface" title="먼저 분석 결과를 확인해 주세요" footer={<Button onClick={goHome}>결과 홈으로</Button>}>
      <Note>기록을 검토하고 확정하면 이번에 확인한 내용과 선택한 설정을 모아 볼 수 있어요.</Note>
    </ScreenLayout>
  }

  const allFromPlan = summary.enabledReminderCount > 0 && summary.enabledReminderCount === summary.planReminderCount
  const plan = summary.selectedPlan
  const planLabel = plan?.label.replace(/^플랜\s*/, '')

  return (
    <ScreenLayout showBack={false} reserveBackSpace={false} tone="surface" contentClassName="gap-6!"
      footer={<>
        <Button onClick={goHome}>결과 홈으로</Button>
        <Button variant="secondary" onClick={() => navigate(SCREEN.S11, { snapshotId: validResult.snapshotId })}>발표용 한 달 뒤 목업</Button>
      </>}>
      <IconBox tone="success" size={32} className="self-start rounded-full! p-4!">
        <img src={check} width={32} height={32} alt="" className="block" />
      </IconBox>

      <h1 className="text-title-l">소비 돌아보기를<br />마쳤어요</h1>

      <Card tone="canvas" padding="none" className="px-[18px] pt-4 pb-1.5" aria-labelledby="completion-summary-title">
        <h2 id="completion-summary-title" className="text-caption-m text-ink-2">이번에 확인한 내용</h2>
        <dl>
          <SummaryRow label="관찰한 패턴">{formatNumber(summary.patternCount)}개</SummaryRow>
          <SummaryRow label="답한 질문">{formatNumber(summary.answeredCount)}개</SummaryRow>
          <SummaryRow label={allFromPlan ? '플랜에서 켜진 demo 규칙' : '켜진 demo 규칙'}>
            {formatNumber(summary.enabledReminderCount)}개
            {!allFromPlan && summary.planReminderCount > 0 ? <span className="mt-0.5 block text-micro text-ink-2">플랜에서 켜짐 {formatNumber(summary.planReminderCount)}개</span> : null}
          </SummaryRow>
          <SummaryRow label="선택 플랜">{plan ? `${planLabel} · 월 ${formatKRW(plan.monthlySavingsKrw)} 제안` : '선택하지 않음'}</SummaryRow>
        </dl>
      </Card>

      {summary.hasUnsavedResponses ? (
        <Note tone="warn" icon="alert">
          <p>아직 저장되지 않은 답변은 요약에 포함하지 않았어요.</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => navigate(SCREEN.S05_1, { patternId: summary.unsavedPatternIds[0], snapshotId: validResult.snapshotId })}>카드 응답 확인하기</Button>
        </Note>
      ) : null}

      <p className="text-body-b">{plan ? '이번에 고른 행동을 다음 소비 전에 떠올려 보세요.' : '이번에 확인한 내용을 다음 소비 전에 떠올려 보세요.'}</p>
      <Note tone="brand" iconContent={<img src={sparkle} width={16} height={16} alt="" className="shrink-0" />}>
        한 달 뒤 다시 기록을 올려보세요. 기록 보관 기간이 지나면 새로 업로드해야 해요.
      </Note>
      {designPreview ? <p className="text-micro text-ink-3">디자인 미리보기 · 합성 예시 데이터예요.</p> : null}
    </ScreenLayout>
  )
}
