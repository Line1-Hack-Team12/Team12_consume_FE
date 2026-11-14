import { useState } from 'react'
import ScreenLayout from '../components/layout/ScreenLayout'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Note from '../components/ui/Note'
import ProgressBar from '../components/ui/ProgressBar'
import Stepper from '../components/ui/Stepper'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import useJobPolling from '../hooks/useJobPolling'
import { toExtractionJob } from '../api/adapters'
import { USE_MOCK } from '../api/config'
import { getSessionStatus, proceedPartial, resetForReplace, retryFailedFiles } from '../api/sessions'
import { getJob, retryFailedAssets } from '../mocks/jobs'

// API 모드: 폴링 키는 'sessionId#시도번호' · 재시도하면 시도번호를 올려 폴링을 다시 시작한다
const fetchSessionJob = (key) => getSessionStatus(key.split('#')[0]).then(toExtractionJob)

const STAGES = [
  { key: 'reading', label: '캡처 읽기' },
  { key: 'classifying', label: '가맹점 분류' },
  { key: 'deduplicating', label: '중복 정리' },
  { key: 'preliminary_detecting', label: '패턴 후보 찾기' },
]

function stageSteps(job) {
  const finished = job && ['succeeded', 'partial'].includes(job.state)
  const current = finished ? STAGES.length : Math.max(0, STAGES.findIndex((s) => s.key === job?.stage))
  return STAGES.map((s, i) => ({
    label: s.label,
    status: i < current ? 'done' : i === current ? 'run' : 'todo',
    description: i === current ? '진행 중' : undefined,
  }))
}

const FILE_STATUS = {
  succeeded: { icon: 'check', color: 'text-success', text: '완료' },
  running: { icon: 'image', color: 'text-brand', text: '읽는 중' },
  queued: { icon: 'image', color: 'text-ink-3', text: '대기' },
  failed: { icon: 'alert', color: 'text-coral', text: '실패' },
}

// S02 캡처를 읽고 있어요 · partial/failed는 같은 화면에서 E04 상태로 보여준다
export default function S02ExtractionPage({ params }) {
  const { navigate } = useAppNavigation()
  const { setDraft, sessionId: contextSessionId, loadDraftFromServer } = useAnalysisSession()
  const sessionId = params?.sessionId ?? (USE_MOCK ? null : contextSessionId)
  const [mockJobId, setMockJobId] = useState(params?.jobId ?? null)
  const [attempt, setAttempt] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const jobId = USE_MOCK ? mockJobId : sessionId ? `${sessionId}#${attempt}` : null
  const { job, error } = useJobPolling(jobId, USE_MOCK ? getJob : fetchSessionJob)

  if (!jobId) {
    return (
      <ScreenLayout title="진행 중인 작업이 없어요" footer={<Button onClick={() => navigate(SCREEN.S01, {}, { replace: true })}>설정으로 돌아가기</Button>}>
        <Note tone="gray">새로고침하면 진행 상태를 다시 불러와야 해요. 서버 연동 후에는 job ID로 이어서 볼 수 있어요.</Note>
      </ScreenLayout>
    )
  }

  const perAsset = job?.perAsset ?? []
  const total = perAsset.length
  const done = perAsset.filter((a) => a.status === 'succeeded' || a.status === 'failed').length
  const succeeded = perAsset.filter((a) => a.status === 'succeeded').length
  const failed = perAsset.filter((a) => a.status === 'failed')
  const finished = job && ['succeeded', 'partial', 'failed'].includes(job.state)
  const stageIndex = finished ? STAGES.length : Math.max(0, STAGES.findIndex((s) => s.key === job?.stage))
  const progress = total ? (done / total) * 0.6 + (Math.max(0, stageIndex - 1) / (STAGES.length - 1)) * 0.4 : 0

  const goReview = async () => {
    if (USE_MOCK) {
      setDraft(job.result.draft)
      navigate(SCREEN.S03, {}, { replace: true })
      return
    }
    setBusy(true)
    setActionError('')
    try {
      if (job.state === 'partial') await proceedPartial(sessionId)
      await loadDraftFromServer(sessionId)
      navigate(SCREEN.S03, {}, { replace: true })
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const retry = async () => {
    setRetrying(true)
    setActionError('')
    try {
      if (USE_MOCK) {
        const next = await retryFailedAssets(mockJobId)
        setMockJobId(next.jobId)
      } else {
        await retryFailedFiles(sessionId, failed.map((a) => a.assetId))
        setAttempt((n) => n + 1)
      }
    } catch (err) {
      setActionError(err.message)
    } finally {
      setRetrying(false)
    }
  }

  const replace = async () => {
    if (!USE_MOCK) {
      try {
        await resetForReplace(sessionId)
      } catch (err) {
        setActionError(err.message)
        return
      }
    }
    navigate(SCREEN.S01, {}, { replace: true })
  }

  // E04 일부 캡처를 읽지 못했어요 / 전체 실패
  if (job && (job.state === 'partial' || job.state === 'failed')) {
    const allFailed = job.state === 'failed'
    return (
      <ScreenLayout
        title={allFailed ? '캡처를 읽지 못했어요' : '일부 캡처를\n읽지 못했어요'}
        showBack={false}
        footer={
          <>
            {actionError ? <p role="alert" className="text-center text-caption text-danger-ink">{actionError}</p> : null}
            {!allFailed ? <Button disabled={busy} onClick={goReview}>{busy ? '불러오는 중…' : `성공한 ${succeeded}장으로 검토`}</Button> : null}
            <Button variant={allFailed ? 'primary' : 'secondary'} disabled={retrying} onClick={retry}>
              {retrying ? '다시 읽는 중…' : '실패한 파일만 다시 시도'}
            </Button>
            <Button variant="secondary" onClick={replace}>
              캡처 교체하기
            </Button>
          </>
        }
      >
        <section className="flex flex-col gap-3 rounded-[18px] bg-surface p-[18px]">
          <div className="flex items-center justify-between">
            <h2 className="text-heading">
              {total}장 중 {succeeded}장 완료
            </h2>
            <Badge tone="coral">{failed.length}장 실패</Badge>
          </div>
          <ul className="flex flex-col gap-2">
            {failed.map((a) => (
              <li key={a.assetId} className="flex items-center gap-2.5 rounded-xl bg-coral-tint px-3.5 py-3">
                <Icon name="alert" size={18} className="text-coral" />
                <div className="min-w-0">
                  <p className="truncate text-body-b">{a.name}</p>
                  <p className="text-caption text-ink-2">{a.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <Note tone="gray">
          {allFailed
            ? '거래가 보이는 결제 내역 화면인지 확인한 뒤 다시 시도하거나 캡처를 바꿔주세요.'
            : `성공한 ${succeeded}장의 거래는 그대로 유지돼요. 다시 시도해도 같은 거래가 중복으로 생기지 않아요.`}
        </Note>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout
      title="캡처를 읽고 있어요"
      description="보통 30초 안에 끝나요. 화면을 나가도 이어서 진행돼요."
      showBack={false}
      footer={
        <>
          {actionError ? <p role="alert" className="text-center text-caption text-danger-ink">{actionError}</p> : null}
          <Button disabled={!finished || busy} onClick={goReview}>
            {busy ? '불러오는 중…' : finished ? '읽어온 내역 확인하기' : '읽는 중…'}
          </Button>
        </>
      }
    >
      <section className="flex flex-col gap-3 rounded-[18px] bg-surface p-[18px]" aria-live="polite">
        <div className="flex items-center justify-between">
          <h2 className="text-heading">
            {done} / {total || '–'}장 완료
          </h2>
          <span className="text-body-b text-brand">{Math.round(progress * 100)}%</span>
        </div>
        <ProgressBar value={progress} label="전체 진행" />
        <Stepper steps={stageSteps(job)} />
      </section>

      <section className="rounded-[18px] bg-surface px-[18px] pt-3.5 pb-1.5">
        <h2 className="text-heading">파일별 상태</h2>
        <ul>
          {perAsset.map((a) => {
            const s = FILE_STATUS[a.status]
            return (
              <li key={a.assetId} className="flex items-center gap-2.5 py-3">
                <Icon name={s.icon} size={18} className={s.color} />
                <span className="min-w-0 flex-1 truncate text-body-m">{a.name}</span>
                <span className={`text-caption-m ${a.status === 'running' ? 'text-brand' : 'text-ink-2'}`}>{s.text}</span>
              </li>
            )
          })}
          {perAsset.length === 0 ? <li className="py-3 text-caption text-ink-3">파일 목록을 불러오는 중이에요</li> : null}
        </ul>
      </section>

      {error ? (
        <Note tone="warn" icon="alert">
          상태를 불러오지 못해서 잠시 뒤 다시 확인하고 있어요.
        </Note>
      ) : null}
      <Note tone="gray">성공한 파일은 유지하고, 실패한 파일만 다시 시도할 수 있어요.</Note>
    </ScreenLayout>
  )
}
