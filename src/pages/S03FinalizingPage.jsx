import { useEffect, useRef, useState } from 'react'
import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import Note from '../components/ui/Note'
import Stepper from '../components/ui/Stepper'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import useJobPolling from '../hooks/useJobPolling'
import { toAnalysisJob } from '../api/adapters'
import { assertAnalysisScope, loadFinalAnalysis } from '../api/analysisRecovery'
import { USE_MOCK } from '../api/config'
import { getAnalysisStatus } from '../api/sessions'
import { createMockAnalysis } from '../mocks/analysis'
import { getJob, startAnalysisJob } from '../mocks/jobs'
import { formatKRW } from '../utils/format'

const STAGES = [{ key: 'final_aggregating', label: '최종 집계' }, { key: 'detecting', label: '반복 패턴 찾기' }, { key: 'explaining', label: '설명 문장 쓰기' }]

export default function S03FinalizingPage() {
  const { navigate } = useAppNavigation()
  const { snapshot, analysis, settings, setAnalysis } = useAnalysisSession()
  const [mockId, setMockId] = useState(null)
  const [statusAttempt, setStatusAttempt] = useState(0)
  const [resultAttempt, setResultAttempt] = useState(0)
  const [outcome, setOutcome] = useState({ key: null, error: '' })
  const retryLock = useRef(false)
  const jobId = USE_MOCK ? mockId : snapshot?.sessionId ? `${snapshot.sessionId}#${statusAttempt}` : null
  const fetchJob = async (requestKey) => {
    const response = await getAnalysisStatus(requestKey.split('#')[0])
    assertAnalysisScope(response, snapshot)
    return toAnalysisJob(response)
  }
  const { job, error, polls } = useJobPolling(jobId, USE_MOCK ? getJob : fetchJob)
  // 배포된 결과 GET이 분석 자료를 직접 반환하므로 상태 표시가 멈춰도 결과를 조회한다.
  const canLoad = USE_MOCK ? job?.state === 'succeeded' : polls > 0 && error?.name !== 'AnalysisScopeError'
  const analysisId = job?.analysisId ?? snapshot?.analysisId ?? snapshot?.sessionId
  const explanationFailed = job?.state === 'failed' && job.failureStage === 'explaining'
  const key = `${snapshot?.id}:${analysisId}:${settings.tone}:${statusAttempt}:${resultAttempt}:${explanationFailed}`
  const loading = canLoad && outcome.key !== key
  const resultError = outcome.key === key ? outcome.error : ''

  useEffect(() => {
    if (!snapshot || !USE_MOCK) return
    let active = true
    startAnalysisJob({ snapshotId: snapshot.id }).then((r) => { if (active) setMockId(r.jobId) })
    return () => { active = false }
  }, [snapshot, statusAttempt])

  useEffect(() => {
    if (!snapshot || !canLoad) return
    let active = true
    const controller = new AbortController()
    const load = async () => {
      try {
        const result = USE_MOCK ? createMockAnalysis(snapshot, { scenario: new URLSearchParams(window.location.search).get('demo') })
          : await loadFinalAnalysis(snapshot, { tone: settings.tone, analysisId, signal: controller.signal })
        if (!active) return
        if (explanationFailed && result.mode === 'server') result.recovery.narrativesIncomplete = true
        setAnalysis(result)
        navigate(SCREEN.S05, {}, { replace: true })
      } catch (err) {
        if (active) setOutcome({ key, error: err.message })
      } finally { if (active) retryLock.current = false }
    }
    load()
    return () => { active = false; controller.abort() }
  }, [snapshot, canLoad, analysisId, settings.tone, setAnalysis, navigate, key, explanationFailed])

  const retryResult = () => {
    if (loading || retryLock.current) return
    retryLock.current = true
    setResultAttempt((n) => n + 1)
  }

  if (!snapshot) return <ScreenLayout title="확정한 표가 없어요" footer={<Button onClick={() => navigate(SCREEN.S03)}>검토 화면으로</Button>}><Note>건수와 합계를 확인한 뒤 분석을 시작해 주세요.</Note></ScreenLayout>
  const failed = job?.state === 'failed'
  const cached = analysis?.snapshotId === snapshot.id
  const current = job?.state === 'succeeded' ? 3 : Math.max(0, STAGES.findIndex((stage) => stage.key === (job?.failureStage ?? job?.stage)))
  return <ScreenLayout showBack={false} title={resultError || failed ? '분석 결과를 확인해 주세요' : '확정한 기록을 분석하고 있어요'}
    footer={<>
      <Button disabled={loading || !canLoad} onClick={retryResult}>{loading ? '결과를 불러오는 중…' : '같은 확정 기록의 결과 다시 불러오기'}</Button>
      {failed || error || polls > 15 ? <Button variant="secondary" disabled={loading} onClick={() => setStatusAttempt((n) => n + 1)}>분석 상태 다시 확인</Button> : null}
      {cached ? <Button variant="secondary" disabled={loading} onClick={() => navigate(SCREEN.S05, {}, { replace: true })}>저장된 결과 보기</Button> : null}
      <Button variant="secondary" onClick={() => navigate(SCREEN.S03)}>검토 화면으로</Button>
    </>}>
    <Note tone="gray">검토한 지출 {snapshot.summary.expenseCount}건 · {formatKRW(snapshot.summary.expenseSum)}. 확정한 기록은 유지되며, 결과를 다시 불러와도 재확정하지 않아요.</Note>
    <Stepper steps={STAGES.map((s, i) => ({ label: s.label, status: i < current ? 'done' : i === current ? 'run' : 'todo' }))} />
    {failed || error || resultError ? <Note tone="warn"><p role="alert">{resultError || job?.message || error?.message || '분석 결과를 불러오지 못했어요. 확정한 기록을 유지한 채 다시 확인할 수 있어요.'}</p></Note> : null}
    {failed && job.failureStage !== 'explaining' ? <Note tone="gray">분석 작업을 다시 실행하는 기능은 아직 지원하지 않아요. 같은 확정 기록의 결과와 처리 상태를 다시 확인할 수 있어요.</Note> : null}
    {polls > 15 ? <Note tone="warn">분석이 예상보다 오래 걸리고 있어요. 완료 상태를 계속 확인 중이에요.</Note> : null}
    <Note tone="gray">결과를 받으면 결과 홈으로 이동해요. 원본 파일 삭제는 서버에서 처리해요.</Note>
  </ScreenLayout>
}
