import { useState } from 'react'
import ScreenLayout from '../components/layout/ScreenLayout'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Checkbox from '../components/ui/Checkbox'
import Icon from '../components/ui/Icon'
import IconBox from '../components/ui/IconBox'
import Note from '../components/ui/Note'
import SummaryCard from '../components/ui/SummaryCard'
import { TextField } from '../components/ui/Field'
import { USE_MOCK } from '../api/config'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import { REVIEW_REASON_LABEL, summarizeDraft } from '../mocks/draft'
import { formatKRW, formatShortDate } from '../utils/format'
import { formatSlotRange } from '../utils/months'
import { isTransactionValid } from '../utils/transactionValidation'
import { gateState, pendingQueue, reviewQueue } from './S03/reviewSelectors'

const VISIBLE_QUEUE = 3
const EXPAND_QUEUE_THRESHOLD = 5

function MissingDateGroup({ rows, onUpdate, disabled }) {
  const [date, setDate] = useState('')
  const [error, setError] = useState('')
  const apply = async () => {
    if (!date || rows.some((t) => t.slotMonth && !date.startsWith(t.slotMonth))) {
      setError('캡처를 올린 달에 해당하는 날짜를 골라 주세요. 다른 달의 거래는 개별 수정에서 옮길 수 있어요.')
      return
    }
    for (const row of rows) {
      if (!(await onUpdate(row.id, { date, slotMonth: row.slotMonth || date.slice(0, 7), reviewStatus: 'edited' }))) return
    }
  }
  return <div className="flex flex-col gap-2 rounded-xl bg-brand-tint p-3">
    <p className="text-caption-m">같은 캡처의 날짜 없는 {rows.length}행은 며칠 거래인가요?</p>
    <TextField label="이 캡처의 날짜" type="date" value={date} disabled={disabled} onChange={(e) => { setDate(e.target.value); setError('') }} error={error} />
    <Button size="sm" disabled={disabled || !date} onClick={apply}>날짜 한 번에 적용</Button>
  </div>
}

// S03 읽어온 숫자 확인 · 검토 큐를 모두 처리하면 같은 화면이 S03-R(확인 완료) 상태가 된다
export default function S03ReviewPage() {
  const { navigate } = useAppNavigation()
  const { draft, confirmed, setConfirmed, updateTransaction, setSnapshot, confirmReview, sessionId, syncError, syncBusy, clearSyncError } = useAnalysisSession()
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  if (!draft) {
    return (
      <ScreenLayout title="검토할 내역이 없어요" footer={<Button onClick={() => navigate(SCREEN.S01, {}, { replace: true })}>파일 올리러 가기</Button>}>
        <Note tone="gray">파일을 읽은 뒤에 이 화면에서 숫자를 확인해요.</Note>
      </ScreenLayout>
    )
  }

  const summary = summarizeDraft(draft)
  const slots = Object.keys(summary.bySlot).sort()
  const queue = reviewQueue(draft)
  const pending = pendingQueue(draft)
  // 전체 검토 대상 수로 판단해, 처리 중 남은 행이 줄어도 다시 접히지 않게 한다.
  const visibleQueue = queue.length > EXPAND_QUEUE_THRESHOLD ? pending : pending.slice(0, VISIBLE_QUEUE)
  const hiddenQueueCount = pending.length - visibleQueue.length
  const gate = gateState(draft, summary)
  const dupCount = draft.duplicateGroups.length
  const mergedCount = draft.duplicateGroups.filter((g) => g.decision === 'merge').length
  const reviewDone = pending.length === 0
  const dateGroups = Object.values(pending.filter((t) => !t.date && t.sourceAssetId).reduce((groups, row) => {
    const key = `${row.sourceAssetId}:${row.slotMonth}`
    ;(groups[key] ??= []).push(row)
    return groups
  }, {})).filter((rows) => rows.length > 1)

  const keep = (t) => {
    if (!isTransactionValid(t)) {
      navigate(SCREEN.S03_E, { id: t.id })
      return
    }
    updateTransaction(t.id, { reviewStatus: 'kept' })
  }
  const exclude = (t) => updateTransaction(t.id, { included: false, reviewStatus: 'excluded' })

  const confirm = async () => {
    if (confirming || syncBusy || syncError || !confirmed || !gate.canConfirm) return
    setConfirming(true)
    setConfirmError('')
    let serverSnapshotId
    try {
      // API 모드: POST /api/sessions/{sid}/confirm · 목업 모드에서는 바로 통과
      const res = await confirmReview()
      serverSnapshotId = res?.snapshotId ?? null
      if (!USE_MOCK && serverSnapshotId == null) throw new Error('서버의 확정 기록 ID가 없어요. 다시 확인해 주세요.')
      setSnapshot({
        id: USE_MOCK ? `sn_${crypto.randomUUID()}` : String(serverSnapshotId),
        analysisId: res?.analysisId ?? sessionId,
        sessionId, sourceRevision: draft.revision, summary, slots,
        transactions: draft.transactions, duplicateGroups: draft.duplicateGroups,
      })
    } catch (err) {
      setConfirmError(err.message)
      setConfirming(false)
      return
    }
    setConfirming(false)
    navigate(SCREEN.S03_P, {}, { replace: true })
  }

  return (
    <ScreenLayout
      title={reviewDone ? '건수와 합계 확인 완료' : '읽어온 숫자 확인'}
      footer={
        <>
          <Checkbox checked={confirmed} disabled={!gate.canConfirm || syncBusy || Boolean(syncError)} onChange={setConfirmed}>
            건수와 합계를 확인했어요
          </Checkbox>
          {!gate.canConfirm ? <p className="text-caption text-ink-3">{gate.reason}</p> : null}
          {confirmError ? <p role="alert" className="text-caption text-danger-ink">{confirmError}</p> : null}
          <Button disabled={!confirmed || !gate.canConfirm || confirming || syncBusy || Boolean(syncError)} onClick={confirm}>
            {confirming ? '확정하는 중…' : '계속 · 확정하고 분석'}
          </Button>
          {reviewDone ? (
            <Button variant="secondary" onClick={() => navigate(SCREEN.S03_T)}>
              전체 표 다시 수정
            </Button>
          ) : null}
        </>
      }
    >
      {syncError ? (
        <Note tone="danger" icon="alert">
          <p>{syncError}</p>
          <button type="button" className="mt-1 text-caption-m underline" onClick={clearSyncError}>
            닫기
          </button>
        </Note>
      ) : null}
      <SummaryCard caption={`업로드한 ${formatSlotRange(slots)} 기록 기준 · 슬롯 ${slots.length}개`} amount={`${summary.expenseCount}건 · ${formatKRW(summary.expenseSum)}`} badge="검토 중" />
      {draft.skippedCount > 0 || draft.failedCount > 0 ? <Note tone="gray">{draft.skippedCount || 0}개는 거래 내역이 아니어서 건너뛰었고, {draft.failedCount || 0}개는 읽지 못했어요. 성공한 내역으로 검토해요.</Note> : null}

      {reviewDone ? (
        <section className="flex flex-col gap-2.5 rounded-[18px] bg-surface p-[18px]">
          <h2 className="flex items-center gap-2 text-heading">
            <Icon name="check" size={18} className="text-success" />
            검토 완료
          </h2>
          {[
            ['낮은 확신 행', `${queue.length}건`],
            ['중복 후보', `${dupCount}건`],
            ['필수값 오류', `${gate.invalid}건`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-body text-ink-2">{k}</span>
              <span className="text-body-b">{v}</span>
            </div>
          ))}
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-[18px] bg-surface p-[18px]">
          <div className="flex items-center justify-between">
            <h2 className="text-heading">확인이 필요한 행 {pending.length}개</h2>
            <Badge tone="coral">확인 필요</Badge>
          </div>
          {dateGroups.map((rows) => <MissingDateGroup key={`${rows[0].sourceAssetId}:${rows.length}`} rows={rows} onUpdate={updateTransaction} disabled={syncBusy} />)}
          <ul className="flex flex-col gap-2.5">
            {visibleQueue.map((t) => (
              <li key={t.id} className="flex flex-col gap-2.5 rounded-xl bg-canvas px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-b">{t.merchant}</p>
                    <p className="text-caption text-ink-3">
                      {formatShortDate(t.date)} {t.time ?? '시각 없음'} · {t.reviewReasons.map((r) => REVIEW_REASON_LABEL[r]).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    {t.readAmountKrw ? <p className="text-caption text-ink-3 line-through">{formatKRW(t.readAmountKrw)}</p> : null}
                    <p className="text-body-b text-coral-ink">{formatKRW(t.amountKrw)}?</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="tonal" onClick={() => navigate(SCREEN.S03_E, { id: t.id })}>
                    수정
                  </Button>
                  <Button disabled={syncBusy} size="sm" variant="secondary" onClick={() => keep(t)}>
                    그대로 두기
                  </Button>
                  <Button disabled={syncBusy} size="sm" variant="secondary" onClick={() => exclude(t)}>
                    제외
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {hiddenQueueCount > 0 ? <p className="text-caption text-ink-3">처리하면 남은 {hiddenQueueCount}개가 이어서 보여요</p> : null}
        </section>
      )}

      {dupCount > 0 ? (
        <section className="flex flex-col gap-3 rounded-[18px] bg-surface p-[18px]">
          <div className="flex items-center gap-3">
            <IconBox name="sparkle" size={18} className="p-2" />
            <p className="flex-1 text-body-b">
              {mergedCount > 0 ? `중복 후보 ${dupCount}건 중 ${mergedCount}건을 같은 거래로 묶었어요` : `중복 후보 ${dupCount}건을 모두 따로 포함했어요`}
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate(SCREEN.E02, { index: 0 })}>
            펼쳐서 중복 확인
          </Button>
        </section>
      ) : null}

      {!reviewDone ? (
        <Button variant="secondary" onClick={() => navigate(SCREEN.S03_T)}>
          수정하기 · 전체 표 보기
        </Button>
      ) : (
        <Note tone="gray">계속하면 확정한 기록으로 패턴을 계산해요. 원본 파일 삭제가 시작돼요.</Note>
      )}
    </ScreenLayout>
  )
}
