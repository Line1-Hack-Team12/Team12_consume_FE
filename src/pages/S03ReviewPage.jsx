import ScreenLayout from '../components/layout/ScreenLayout'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Checkbox from '../components/ui/Checkbox'
import Icon from '../components/ui/Icon'
import IconBox from '../components/ui/IconBox'
import Note from '../components/ui/Note'
import SummaryCard from '../components/ui/SummaryCard'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useNavigation } from '../hooks/navigationContext'
import { REVIEW_REASON_LABEL, summarizeDraft } from '../mocks/draft'
import { formatKRW, formatShortDate } from '../utils/format'
import { formatSlotRange } from '../utils/months'
import { isTransactionValid } from '../utils/transactionValidation'
import { gateState, pendingQueue, reviewQueue } from './S03/reviewSelectors'

const VISIBLE_QUEUE = 3

// S03 읽어온 숫자 확인 · 검토 큐를 모두 처리하면 같은 화면이 S03-R(확인 완료) 상태가 된다
export default function S03ReviewPage() {
  const { navigate } = useNavigation()
  const { draft, confirmed, setConfirmed, updateTransaction, setSnapshot } = useAnalysisSession()

  if (!draft) {
    return (
      <ScreenLayout title="검토할 내역이 없어요" footer={<Button onClick={() => navigate(SCREEN.S01, {}, { replace: true })}>캡처 올리러 가기</Button>}>
        <Note tone="gray">캡처를 읽은 뒤에 이 화면에서 숫자를 확인해요.</Note>
      </ScreenLayout>
    )
  }

  const summary = summarizeDraft(draft)
  const slots = Object.keys(summary.bySlot).sort()
  const queue = reviewQueue(draft)
  const pending = pendingQueue(draft)
  const gate = gateState(draft, summary)
  const dupCount = draft.duplicateGroups.length
  const mergedCount = draft.duplicateGroups.filter((g) => g.decision === 'merge').length
  const reviewDone = pending.length === 0

  const keep = (t) => {
    if (!isTransactionValid(t)) {
      navigate(SCREEN.S03_E, { id: t.id })
      return
    }
    updateTransaction(t.id, { reviewStatus: 'kept' })
  }
  const exclude = (t) => updateTransaction(t.id, { included: false, reviewStatus: 'excluded' })

  const confirm = () => {
    // TODO(API): POST /sessions/{sid}/snapshots { expected_revision, confirmation: true }
    setSnapshot({
      id: `sn_${draft.revision}`,
      sourceRevision: draft.revision,
      summary,
      slots,
      transactions: draft.transactions,
      duplicateGroups: draft.duplicateGroups,
    })
    navigate(SCREEN.S03_P, {}, { replace: true })
  }

  return (
    <ScreenLayout
      title={reviewDone ? '건수와 합계 확인 완료' : '읽어온 숫자 확인'}
      footer={
        <>
          <Checkbox checked={confirmed} disabled={!gate.canConfirm} onChange={setConfirmed}>
            건수와 합계를 확인했어요
          </Checkbox>
          {!gate.canConfirm ? <p className="text-caption text-ink-3">{gate.reason}</p> : null}
          <Button disabled={!confirmed || !gate.canConfirm} onClick={confirm}>
            계속 · 확정하고 분석
          </Button>
          {reviewDone ? (
            <Button variant="secondary" onClick={() => navigate(SCREEN.S03_T)}>
              전체 표 다시 수정
            </Button>
          ) : null}
        </>
      }
    >
      <SummaryCard caption={`업로드한 ${formatSlotRange(slots)} 기록 기준 · 슬롯 ${slots.length}개`} amount={`${summary.expenseCount}건 · ${formatKRW(summary.expenseSum)}`} badge="검토 중" />

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
            <h2 className="text-heading">확신이 낮은 행 {pending.length}개</h2>
            <Badge tone="coral">확인 필요</Badge>
          </div>
          <ul className="flex flex-col gap-2.5">
            {pending.slice(0, VISIBLE_QUEUE).map((t) => (
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
                  <Button size="sm" variant="secondary" onClick={() => keep(t)}>
                    그대로 두기
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => exclude(t)}>
                    제외
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {pending.length > VISIBLE_QUEUE ? <p className="text-caption text-ink-3">처리하면 남은 {pending.length - VISIBLE_QUEUE}개가 이어서 보여요</p> : null}
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
        <Note tone="gray">계속하면 확정한 기록으로 패턴을 계산해요. 원본 이미지 삭제가 시작돼요.</Note>
      )}
    </ScreenLayout>
  )
}
