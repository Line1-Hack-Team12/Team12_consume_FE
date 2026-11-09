import { useEffect, useRef } from 'react'
import back from '../assets/s05-detail/back.svg'
import info from '../assets/s09/info.svg'
import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import Note from '../components/ui/Note'
import { SCREEN } from '../constants/screens'
import { MIN_PLAN_GOAL_KRW } from '../constants/plans'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useNavigation } from '../hooks/navigationContext'
import useSavingsPlan from '../hooks/useSavingsPlan'
import { S05_PREVIEW_ANALYSIS } from '../mocks/s05Preview'
import { formatKRW } from '../utils/format'
import GoalCard from './S09/GoalCard'
import SavingsPlanCard from './S09/SavingsPlanCard'

// S09 저축 플랜 (F17). 절감액·가능 최대치·조합은 목업 응답을 그대로 표시한다.
export default function S09SavingsPlanPage({ params }) {
  const mounted = useRef(false)
  const { navigate } = useNavigation()
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
  const selectionLabel = selected ? `${selected.label} 선택${savings.eligibleReminderCount > 0 ? ' · demo 알림 켜기' : ''}` : '선택할 수 있는 플랜이 없어요'

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
          <Button disabled={disabled || Boolean(savings.error) || !selected?.goalMet} onClick={confirm}>
            {savings.choosing ? '플랜을 선택하고 있어요…' : selectionLabel}
          </Button>
          {showExample ? <Button variant="secondary" disabled={savings.impossibleExampleDisabled} title={savings.impossibleExampleReason || undefined} onClick={savings.showImpossibleExample}>달성 불가 예시</Button> : null}
          <Button variant="secondary" onClick={() => navigate(SCREEN.S05, {}, { replace: true })}>결과 홈으로</Button>
        </>
      }
    >
      <GoalCard value={savings.goalKrw} max={savings.sliderMaxKrw} disabled={savings.choosing || savings.maxPossibleKrw < MIN_PLAN_GOAL_KRW} onChange={savings.setGoal} />

      <section className="flex flex-col gap-2.5" aria-labelledby="plan-locks-title">
        <h2 id="plan-locks-title" className="text-body-b">잠금 · 줄이기 어려운 항목</h2>
        {savings.locks.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="줄이기 어려운 항목 잠금">
            {savings.locks.map((lock) => (
              <Chip key={lock.id} showCheck={false} selected={lock.locked} disabled={savings.choosing} onClick={() => savings.toggleLock(lock.id)}>
                {lock.locked ? <><span aria-hidden="true">🔒</span>{lock.label} 잠금</> : lock.label}
              </Chip>
            ))}
          </div>
        ) : (
          <p className="text-caption text-ink-2">잠글 수 있는 감축 항목이 없어요.</p>
        )}
      </section>

      {savings.goalClamped ? (
        <Note tone="warn" icon="alert">
          <p className="text-caption-m">현재 소비 구조에서는 최대 {formatKRW(savings.maxPossibleKrw)}까지 가능해요.</p>
          <p>요청한 월 {formatKRW(savings.requestedGoalKrw)}에 맞추기 어려워 목표와 슬라이더 상한을 조정했어요.</p>
        </Note>
      ) : null}

      {savings.error ? (
        <Note tone="warn" icon="alert">
          <p>{savings.error}</p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={savings.retry}>다시 불러오기</Button>
        </Note>
      ) : savings.plans.length > 0 ? (
        <ul className="flex flex-col gap-5" role="radiogroup" aria-label="저축 플랜" aria-busy={savings.loading}>
          {savings.plans.map((plan) => (
            <SavingsPlanCard key={plan.id} plan={plan} selected={plan.id === savings.selectedPlanId} disabled={disabled} onSelect={savings.selectPlan} />
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
