import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { TextField } from '../components/ui/Field'
import Note from '../components/ui/Note'
import ProgressBar from '../components/ui/ProgressBar'
import Stepper from '../components/ui/Stepper'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import useJobPolling from '../hooks/useJobPolling'
import { toExtractionJob } from '../api/adapters'
import { USE_MOCK } from '../api/config'
import { CAN_RETRY_WITH_FILES, getSessionStatus, proceedPartial, resetForReplace, retryFailedFiles } from '../api/sessions'
import { getJob, retryFailedAssets } from '../mocks/jobs'
import { buildSlots, formatMonth } from '../utils/months'

const fetchSessionJob = (key) => getSessionStatus(key.split('#')[0]).then(toExtractionJob)
const STAGES = ['내역 읽기', '가맹점 분류', '중복 정리', '패턴 후보 찾기']
const KEYS = ['reading', 'classifying', 'deduplicating', 'preliminary_detecting']
const STATUS = { succeeded: '완료', failed: '읽기 실패', skipped: '거래가 없어 건너뜀', queued: '대기', running: '읽는 중' }

export default function S02ExtractionPage({ params }) {
  const { navigate } = useAppNavigation()
  const { settings, files, bankFiles, consent, setDraft, sessionId: contextId, loadDraftFromServer } = useAnalysisSession()
  const sessionId = params?.sessionId ?? contextId
  const [mockJobId, setMockJobId] = useState(params?.jobId)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [emptyMonths, setEmptyMonths] = useState([])
  const [noRows, setNoRows] = useState(false)
  const [passwords, setPasswords] = useState({})
  const reviewStarted = useRef(null)
  const retrying = useRef(false)
  const autoRetries = useRef(0)
  const autoJob = useRef(null)
  const jobId = USE_MOCK ? mockJobId : sessionId ? `${sessionId}#${attempt}` : null
  const { job, error } = useJobPolling(jobId, USE_MOCK ? getJob : fetchSessionJob)
  const assets = job?.perAsset ?? []
  const failed = assets.filter((a) => a.status === 'failed')
  const succeeded = assets.filter((a) => a.status === 'succeeded').length
  const finished = job && ['succeeded', 'partial', 'failed', 'no_transactions'].includes(job.state)
  const slots = buildSlots(settings.lastMonth, settings.monthCount)
  const originals = useMemo(() => [...bankFiles, ...Object.entries(files).flatMap(([slotMonth, list]) => list.map((f) => ({ ...f, slotMonth })))], [bankFiles, files])
  const originalFor = (asset) => {
    const matches = originals.filter((f) => f.name === asset.name && f.status === 'accepted')
    return matches.length === 1 ? matches[0] : null
  }

  const goReview = useCallback(async () => {
    setBusy(true); setActionError('')
    try {
      if (!USE_MOCK && job.state === 'partial') await proceedPartial(sessionId)
      const draft = USE_MOCK ? job.result?.draft : await loadDraftFromServer(sessionId)
      if (!draft?.transactions?.length) { setNoRows(true); return }
      const next = { ...draft, skippedCount: job.perAsset.filter((a) => a.status === 'skipped').length, failedCount: job.perAsset.filter((a) => a.status === 'failed').length }
      setDraft(next)
      const selected = buildSlots(settings.lastMonth, settings.monthCount)
      const covered = new Set(next.transactions.map((t) => t.slotMonth || t.date?.slice(0, 7)))
      const empty = selected.filter((month) => !covered.has(month))
      if (bankFiles.some((f) => f.status === 'accepted') && empty.length) setEmptyMonths(empty)
      else navigate(SCREEN.S03, {}, { replace: true })
    } catch (err) { setActionError(err.message) }
    finally { setBusy(false) }
  }, [job, sessionId, settings.lastMonth, settings.monthCount, bankFiles, loadDraftFromServer, navigate, setDraft])

  useEffect(() => {
    if (job?.state !== 'succeeded' || reviewStarted.current === jobId) return
    reviewStarted.current = jobId
    goReview()
  }, [job?.state, jobId, goReview])

  const retry = useCallback(async (automatic = false) => {
    if (retrying.current) return
    retrying.current = true; setBusy(true); setActionError('')
    try {
      if (USE_MOCK) setMockJobId((await retryFailedAssets(mockJobId)).jobId)
      else {
        const all = [...bankFiles, ...Object.entries(files).flatMap(([slotMonth, list]) => list.map((f) => ({ ...f, slotMonth })))]
        for (const asset of job.perAsset.filter((a) => a.status === 'failed' && a.retryable !== false)) {
          const matches = all.filter((f) => f.name === asset.name && f.status === 'accepted')
          if (matches.length !== 1) throw new Error('다시 읽을 원본을 확인할 수 없어요. 파일 교체를 선택해 주세요.')
          const original = matches[0]
          if (automatic && original.kind === 'file') continue
          await retryFailedFiles(sessionId, [asset.assetId], { settings, consent, assets: [{ ...original, password: passwords[asset.assetId] ?? '' }] })
        }
        setAttempt((n) => n + 1)
      }
      setPasswords({})
    } catch (err) { setActionError(err.message) }
    finally { retrying.current = false; setBusy(false) }
  }, [bankFiles, files, job, mockJobId, sessionId, settings, consent, passwords])

  useEffect(() => {
    const targets = job?.perAsset?.filter((a) => a.status === 'failed') ?? []
    if ((!USE_MOCK && !CAN_RETRY_WITH_FILES) || !['partial', 'failed'].includes(job?.state) || !targets.length || autoRetries.current >= 2 || actionError || autoJob.current === jobId) return
    // 파일 암호는 보관하지 않으므로 은행 파일은 암호를 다시 입력한 뒤 수동 재시도한다.
    if (!targets.every((a) => a.retryable === true && originals.filter((f) => f.name === a.name).length === 1 && originals.find((f) => f.name === a.name)?.kind === 'image')) return
    let active = true
    queueMicrotask(() => {
      if (!active || autoJob.current === jobId) return
      autoRetries.current++
      autoJob.current = jobId
      retry(true)
    })
    return () => { active = false }
  }, [job, jobId, originals, actionError, retry])

  const replace = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (!USE_MOCK) await resetForReplace(sessionId)
      navigate(SCREEN.S01, {}, { replace: true })
    } catch (err) { setActionError(err.message); setBusy(false) }
  }

  if (!jobId) return <ScreenLayout title="진행 중인 작업이 없어요" footer={<Button onClick={() => navigate(SCREEN.S01)}>내역 올리러 가기</Button>}><Note>설정 화면에서 내역을 선택해 주세요.</Note></ScreenLayout>
  const noTransactions = noRows || job?.state === 'no_transactions'
  const current = finished ? 4 : Math.max(0, KEYS.indexOf(job?.stage))
  const completed = assets.filter((a) => ['succeeded', 'failed', 'skipped'].includes(a.status)).length
  const progress = finished ? 1 : assets.length ? Math.min(0.95, completed / assets.length * 0.6 + current / 4 * 0.4) : 0
  const hasBank = bankFiles.some((f) => f.status === 'accepted')

  return <ScreenLayout showBack={false}
    title={noTransactions ? '결제 내역을 찾지 못했어요' : failed.length ? '읽지 못한 내역을 확인해 주세요' : hasBank ? '거래내역을 읽고 있어요' : '캡처를 읽고 있어요'}
    description={noTransactions ? '거래 날짜와 금액이 있는 내역 파일이나 캡처로 교체해 주세요.' : '읽기가 끝나면 내역을 검토하는 화면으로 이동해요.'}
    footer={<>
      {actionError ? <p role="alert" className="text-caption text-danger-ink">{actionError}</p> : null}
      {noTransactions ? <Button disabled={busy} onClick={replace}>내역 교체하기</Button> : <>
        {(USE_MOCK || CAN_RETRY_WITH_FILES) && failed.some((a) => a.retryable !== false) ? <Button disabled={busy} onClick={() => retry()}>{busy ? '다시 읽는 중…' : '실패한 파일만 다시 읽기'}</Button> : null}
        {finished && succeeded > 0 ? <Button disabled={busy} onClick={goReview}>{busy ? '불러오는 중…' : '성공한 내역으로 검토'}</Button> : null}
        {failed.length > 0 ? <Button variant="secondary" disabled={busy} onClick={replace}>파일·암호 교체하기</Button> : null}
      </>}
    </>}>
    <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4" aria-live="polite">
      <p className="text-body-b">{completed} / {assets.length || '–'}개 확인</p>
      <ProgressBar value={progress} label="전체 진행" />
      <Stepper steps={STAGES.map((label, i) => ({ label: i === 0 ? hasBank ? '거래내역 읽기' : '캡처 읽기' : label, status: i < current ? 'done' : i === current ? 'run' : 'todo' }))} />
    </section>
    <ul className="flex flex-col gap-3">
      {assets.map((asset) => <li key={asset.assetId} className="min-w-0 rounded-xl bg-surface p-3">
        <p className="truncate text-body-b" title={asset.name}>{asset.name}</p>
        <p className="text-caption text-ink-2">{STATUS[asset.status] ?? '확인 중'}</p>
        {asset.reason ? <p className="text-caption text-danger-ink">{asset.reason}</p> : null}
        {(USE_MOCK || CAN_RETRY_WITH_FILES) && asset.status === 'failed' && asset.retryable !== false && originalFor(asset)?.kind === 'file'
          ? <TextField label="다시 읽을 파일의 열기 암호" type="password" autoComplete="off" value={passwords[asset.assetId] ?? ''} onChange={(e) => setPasswords((prev) => ({ ...prev, [asset.assetId]: e.target.value }))} /> : null}
      </li>)}
    </ul>
    {hasBank ? <Note tone="gray">선택한 기간: {slots.map(formatMonth).join(', ')}. 파일에서 읽은 월별 내역은 검토 화면에서 확인할 수 있어요.</Note> : null}
    {error ? <Note tone="warn">서버 상태를 다시 확인하고 있어요. 연결이 계속 안 되면 잠시 후 다시 시도해 주세요.</Note> : null}
    <ConfirmDialog open={emptyMonths.length > 0} title={`${emptyMonths.map(formatMonth).join(', ')} 내역이 없어요`} confirmLabel="빈 달을 빼고 진행" cancelLabel="내역 추가하기"
      onConfirm={() => navigate(SCREEN.S03, {}, { replace: true })} onCancel={() => navigate(SCREEN.S01, {}, { replace: true })}>
      비어 있는 달은 분석과 월 환산에서 제외돼요. 그대로 진행할까요?
    </ConfirmDialog>
  </ScreenLayout>
}
