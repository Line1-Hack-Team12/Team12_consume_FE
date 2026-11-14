import { useEffect, useState } from 'react'
import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import Note from '../components/ui/Note'
import Stepper from '../components/ui/Stepper'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import useJobPolling from '../hooks/useJobPolling'
import { toAnalysisJob } from '../api/adapters'
import { toAnalysisResult } from '../api/analysisAdapters'
import { getAnalysisResult, getPatternDetail, getReport } from '../api/analysis'
import { USE_MOCK } from '../api/config'
import { getAnalysisStatus } from '../api/sessions'
import { createMockAnalysis } from '../mocks/analysis'
import { getJob, startAnalysisJob } from '../mocks/jobs'
import { formatKRW } from '../utils/format'

const STAGES = [{ key: 'final_aggregating', label: '최종 집계' }, { key: 'detecting', label: '반복 패턴 찾기' }, { key: 'explaining', label: '설명 문장 쓰기' }]
const fetchJob = (key) => getAnalysisStatus(key.split('#')[0]).then(toAnalysisJob)

export default function S03FinalizingPage() {
  const { navigate } = useAppNavigation()
  const { snapshot, settings, setAnalysis } = useAnalysisSession()
  const [mockId, setMockId] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [resultAttempt, setResultAttempt] = useState(0)
  const [resultError, setResultError] = useState('')
  const jobId = USE_MOCK ? mockId : snapshot?.sessionId ? `${snapshot.sessionId}#${attempt}` : null
  const { job, error, polls } = useJobPolling(jobId, USE_MOCK ? getJob : fetchJob)

  useEffect(() => {
    if (!snapshot || !USE_MOCK) return
    let active = true
    startAnalysisJob({ snapshotId: snapshot.id }).then((r) => { if (active) setMockId(r.jobId) })
    return () => { active = false }
  }, [snapshot, attempt])

  useEffect(() => {
    if (!snapshot || !(job?.state === 'succeeded' || (job?.state === 'failed' && job.failureStage === 'explaining'))) return
    let active = true
    const load = async () => {
      try {
        if (USE_MOCK) {
          setAnalysis(createMockAnalysis(snapshot, { scenario: new URLSearchParams(window.location.search).get('demo') }))
        } else {
          const response = await getAnalysisResult(snapshot.analysisId ?? snapshot.sessionId)
          const [report, ...details] = await Promise.allSettled([
            getReport(snapshot.sessionId), ...(response.cards ?? []).map((card) => getPatternDetail(response.analysisId, card.patternId)),
          ])
          if (!active) return
          const result = toAnalysisResult(response, { snapshot, tone: settings.tone, report: report.status === 'fulfilled' ? report.value : null, details: details.filter((r) => r.status === 'fulfilled').map((r) => r.value) })
          setAnalysis(result)
        }
        if (active) navigate(SCREEN.S05, {}, { replace: true })
      } catch (err) { if (active) setResultError(err.message) }
    }
    load()
    return () => { active = false }
  }, [job?.state, job?.failureStage, snapshot, settings.tone, setAnalysis, navigate, resultAttempt])

  if (!snapshot) return <ScreenLayout title="확정한 표가 없어요" footer={<Button onClick={() => navigate(SCREEN.S03)}>검토 화면으로</Button>}><Note>건수와 합계를 확인한 뒤 분석을 시작해 주세요.</Note></ScreenLayout>
  const failed = job?.state === 'failed'
  const current = job?.state === 'succeeded' ? 3 : Math.max(0, STAGES.findIndex((s) => s.key === job?.stage))
  return <ScreenLayout showBack={false} title={failed ? '최종 분석을 마치지 못했어요' : '확정한 기록을 분석하고 있어요'}
    footer={failed || resultError || polls > 15 ? <>
      {resultError ? <Button onClick={() => { setResultError(''); setResultAttempt((n) => n + 1) }}>같은 확정 기록의 결과 다시 불러오기</Button> : <Button onClick={() => setAttempt((n) => n + 1)}>분석 상태 다시 확인</Button>}
      <Button variant="secondary" onClick={() => navigate(SCREEN.S03)}>검토 화면으로</Button>
    </> : undefined}>
    <Note tone="gray">검토한 지출 {snapshot.summary.expenseCount}건 · {formatKRW(snapshot.summary.expenseSum)}. 최종 결과는 서버가 확정한 기록을 기준으로 표시해요.</Note>
    <Stepper steps={STAGES.map((s, i) => ({ label: s.label, status: i < current ? 'done' : i === current ? 'run' : 'todo' }))} />
    {failed || error || resultError ? <Note tone="warn"><p role="alert">{resultError || job?.message || error?.message || '기록은 유지돼요. 같은 확정 기록의 상태를 다시 확인해 주세요.'}</p></Note> : null}
    {polls > 15 ? <Note tone="warn">분석이 예상보다 오래 걸리고 있어요. 완료 상태를 계속 확인 중이에요.</Note> : null}
    <Note tone="gray">완료되면 결과 홈으로 이동해요. 원본 파일은 확정 후 삭제 대상이며, 실제 삭제 완료 여부는 서버에서 처리해요.</Note>
  </ScreenLayout>
}
