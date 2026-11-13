import { useEffect, useState } from 'react'
import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import Note from '../components/ui/Note'
import Stepper from '../components/ui/Stepper'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useNavigation } from '../hooks/navigationContext'
import useJobPolling from '../hooks/useJobPolling'
import { toAnalysisJob } from '../api/adapters'
import { USE_MOCK } from '../api/config'
import { getAnalysisStatus } from '../api/sessions'
import { createMockAnalysis } from '../mocks/analysis'
import { getJob, startAnalysisJob } from '../mocks/jobs'
import { formatKRW } from '../utils/format'

const STAGES = [
  { key: 'final_aggregating', label: '최종 집계' },
  { key: 'detecting', label: '반복 패턴 찾기', description: '요일 · 늦은 시간 · 연쇄 · 날씨' },
  { key: 'explaining', label: '설명 문장 쓰기' },
]

const fetchAnalysisJob = (key) => getAnalysisStatus(key.replace('analysis:', '')).then(toAnalysisJob)

const TONE_LABEL = { coach: '코치', friend: '친구', grandma: '할머니' }

// S03-P 확정 후 최종 분석 · snapshot으로만 분석하고 끝나면 S05로 간다
export default function S03FinalizingPage() {
  const { navigate } = useNavigation()
  const { snapshot, settings, setAnalysis } = useAnalysisSession()
  const [mockJobId, setJobId] = useState(null)
  // API 모드: 확정(POST /confirm) 뒤 GET /analysis/status 를 폴링한다
  const jobId = USE_MOCK ? mockJobId : snapshot?.sessionId ? `analysis:${snapshot.sessionId}` : null
  const { job, error } = useJobPolling(jobId, USE_MOCK ? getJob : fetchAnalysisJob)

  useEffect(() => {
    if (!snapshot || !USE_MOCK) return undefined
    let cancelled = false
    // TODO(API): 확정 snapshot을 분석하는 실제 서버 작업으로 교체한다. API 계약은 미정이다.
    startAnalysisJob({ snapshotId: snapshot.id }).then((r) => {
      if (!cancelled) setJobId(r.jobId)
    })
    return () => {
      cancelled = true
    }
  }, [snapshot])

  useEffect(() => {
    if (job?.state !== 'succeeded' || !snapshot) return
    // 분석 완료 후 S05 결과는 아직 목업으로 만든다.
    // TODO(API): S05 명세가 나오면 GET /api/analyses/{analysisId}/result 로 교체 (analysisId = sessionId)
    const scenario = new URLSearchParams(window.location.search).get('demo')
    setAnalysis(createMockAnalysis(snapshot, { scenario }))
    navigate(SCREEN.S05, {}, { replace: true })
  }, [job?.state, snapshot, setAnalysis, navigate])

  if (!snapshot) {
    return (
      <ScreenLayout title="확정한 표가 없어요" showBack={false} footer={<Button onClick={() => navigate(SCREEN.S03, {}, { replace: true })}>검토 화면으로</Button>}>
        <Note tone="gray">S03에서 건수와 합계를 확인한 뒤 분석을 시작해요.</Note>
      </ScreenLayout>
    )
  }

  const current = job?.state === 'succeeded' ? STAGES.length : Math.max(0, STAGES.findIndex((s) => s.key === job?.stage))
  const steps = STAGES.map((s, i) => ({
    label: s.label,
    status: i < current ? 'done' : i === current ? 'run' : 'todo',
    description:
      i === 0
        ? `지출 ${snapshot.summary.expenseCount}건 · ${formatKRW(snapshot.summary.expenseSum)}`
        : i === 2
          ? `${TONE_LABEL[settings.tone]} 말투로`
          : s.description,
  }))

  return (
    <ScreenLayout
      showBack={false}
      tone="surface"
      title={`확정한 ${snapshot.summary.expenseCount}건으로\n최종 분석하고 있어요`}
      description="이제 숫자는 바뀌지 않아요. 원본 캡처 삭제를 시작했어요."
      contentClassName="gap-7"
    >
      <div aria-live="polite">
        <Stepper steps={steps} />
      </div>
      {error ? (
        <Note tone="warn" icon="alert">
          상태를 불러오지 못해서 잠시 뒤 다시 확인하고 있어요.
        </Note>
      ) : null}
      <Note tone="gray">완료되면 결과 홈으로 이동해요. 숫자 요약은 먼저 보여드리고, 문장은 준비되는 대로 채워요.</Note>
    </ScreenLayout>
  )
}
