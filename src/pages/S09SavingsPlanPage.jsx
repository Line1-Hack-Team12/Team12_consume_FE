import { useEffect, useRef } from 'react'
import back from '../assets/icons/chevron-left.svg'
import info from '../assets/s09/info.svg'
import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import Note from '../components/ui/Note'
import PlanGoalSummary from '../components/ui/PlanGoalSummary'
import { SCREEN } from '../constants/screens'
import { MIN_PLAN_GOAL_KRW } from '../constants/plans'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import useSavingsPlan from '../hooks/useSavingsPlan'
import { S05_PREVIEW_ANALYSIS } from '../mocks/s05Preview'
import { formatKRW } from '../utils/format'
import GoalCard from './S09/GoalCard'
import SavingsPlanCard from './S09/SavingsPlanCard'

// S09 저축 플랜 (F17). 목표와 예상 절감액을 구분하고, 목표 미달 플랜도 선택할 수 있다.
export default function S09SavingsPlanPage({ params }) {
  const mounted = useRef(false)
  const { navigate } = useAppNavigation()
  const { snapshot, analysis } = useAnalysisSession()
  const designPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === 's05'
  const result = designPreview ? S05_PREVIEW_ANALYSIS : snapshot && analysis?.snapshotId === snapshot.id ? analysis : null
  const validResult = !params?.snapshotId || params.snapshotId === result?.snapshotId ? result : null
  const savings = useSavingsPlan({ result: validResult, designPreview })

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  if (!validResult) {
    return (
      <ScreenLayout
        title="먼저 분석 결과를 확인해 주세요"
        backFallback={SCREEN.S05}
        footer={<Button onClick={() => navigate(SCREEN.S05, {}, { replace: true })}>결과 홈으로</Button>}
      >
        <Note>기록을 검토하고 확정하면 현재 소비에 맞는 월 저축 플랜을 확인할 수 있어요.</Note>
      </ScreenLayout>
    )
  }

  const selected = savings.plans.find((plan) => plan.id === savings.selectedPlanId)
  const disabled = savings.loading || savings.choosing
  const showExample = designPreview || validResult.mode === 'demo'
  const selectionLabel = selected ? `월 ${formatKRW(selected.monthlySavingsKrw)} ${selected.label} 선택` : savings.plans.length > 0 ? '플랜을 선택해 주세요' : '선택할 수 있는 플랜이 없어요'
  const canAdjustGoal = selected && selected.monthlySavingsKrw < savings.goalKrw
    && selected.monthlySavingsKrw >= MIN_PLAN_GOAL_KRW && selected.monthlySavingsKrw <= savings.sliderMaxKrw

  const confirm = async () => {
    if (await savings.confirmSelection() && mounted.current) navigate(SCREEN.S06, { snapshotId: validResult.snapshotId })
  }

  return (
    <ScreenLayout
      title="월 저축 목표에 맞춰보기"
      backFallback={SCREEN.S05}
      backIcon={<img src={back} width={24} height={24} alt="" className="block" />}
      footer={
        <>
          <Button disabled={disabled || Boolean(savings.error) || !selected} onClick={confirm}>
            {savings.choosing ? '플랜을 선택하고 있어요…' : selectionLabel}
          </Button>
          {showExample ? <Button variant="secondary" disabled={savings.impossibleExampleDisabled} title={savings.impossibleExampleReason || undefined} onClick={savings.showImpossibleExample}>달성 불가 예시</Button> : null}
          <Button variant="secondary" onClick={() => navigate(SCREEN.S05, {}, { replace: true })}>결과 홈으로</Button>
        </>
      }
    >
      <GoalCard value={savings.goalKrw} max={savings.sliderMaxKrw} disabled={savings.choosing} onChange={savings.setGoal} />

      <section className="flex flex-col gap-2.5" aria-labelledby="plan-locks-title">
        <h2 id="plan-locks-title" className="text-body-b">줄이기 어려운 항목</h2>
        {savings.locks.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="줄이기 어려운 항목 잠금">
            {savings.locks.map((lock) => (
              <Chip key={lock.id} showCheck={false} selected={lock.locked} disabled={savings.choosing || lock.supported === false} onClick={() => savings.toggleLock(lock.id)}>
                {lock.locked ? <>{lock.label}</> : lock.label}
              </Chip>
            ))}
          </div>
        ) : (
          <p className="text-caption text-ink-2">잠글 수 있는 감축 항목이 없어요.</p>
        )}
      </section>

      {savings.error ? (
        <Note tone="warn" icon="alert">
          <p>{savings.error}</p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={savings.retry}>다시 불러오기</Button>
        </Note>
      ) : savings.plans.length > 0 ? (
        <ul className="flex flex-col gap-5" role="radiogroup" aria-label="저축 플랜" aria-busy={savings.loading}>
          {savings.plans.map((plan) => (
            <SavingsPlanCard key={plan.id} plan={plan} goalKrw={savings.goalKrw} selected={plan.id === savings.selectedPlanId} disabled={disabled} onSelect={savings.selectPlan} />
          ))}
        </ul>
      ) : savings.loading ? (
        <Card><p className="text-caption text-ink-2" role="status">목표에 맞는 플랜을 준비하고 있어요.</p></Card>
      ) : (
        <Card className="flex flex-col gap-2">
          <h2 className="text-body-b">지금은 선택할 수 있는 플랜이 없어요.</h2>
          <p className="text-caption text-ink-2">{savings.unavailableReason || '잠금을 풀거나 다른 달의 기록을 더해 다시 확인해 보세요.'}</p>
        </Card>
      )}

      {selected && !savings.error ? (
        <PlanGoalSummary goalKrw={savings.goalKrw} plan={selected}>
          {canAdjustGoal ? <Button variant="tonal" size="sm" disabled={disabled} onClick={() => savings.setGoal(selected.monthlySavingsKrw)}>
            목표를 {formatKRW(selected.monthlySavingsKrw)}으로 맞추기
          </Button> : null}
        </PlanGoalSummary>
      ) : null}

      {savings.choiceError ? (
        <Note tone="warn" icon="alert">{savings.choiceError} 선택 버튼을 눌러 다시 시도할 수 있어요.</Note>
      ) : null}

      {savings.notice ? (
        <Note tone="brand" iconContent={<img src={info} width={16} height={16} alt="" className="shrink-0" />}>
          {savings.notice}
        </Note>
      ) : null}

      {validResult.mode === 'demo' ? (
        <p className="text-micro text-ink-3">
          {designPreview ? '디자인 미리보기 · Figma의 예시 데이터예요.' : `${savings.basisLabel} · 목업 플랜이에요.`} 실제 저축·구독 해지·푸시 발송은 실행하지 않아요.
        </p>
      ) : null}
    </ScreenLayout>
  )
}
