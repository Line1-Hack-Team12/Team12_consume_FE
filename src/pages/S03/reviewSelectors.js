import { isTransactionValid } from '../../utils/transactionValidation'

// S03 검토 게이트 계산 (F04·F06)

export function reviewQueue(draft) {
  return draft.transactions.filter((t) => t.reviewReasons.length > 0)
}

export function pendingQueue(draft) {
  return reviewQueue(draft).filter((t) => t.reviewStatus === 'pending')
}

export function invalidIncluded(draft) {
  return draft.transactions.filter((t) => t.included && !isTransactionValid(t))
}

/**
 * 확인 체크를 켤 수 있는지
 * 검토 큐 완료 + 포함 행 필수값 유효 + 유효 포함 지출 1건 이상
 */
export function gateState(draft, summary) {
  const pending = pendingQueue(draft).length
  const invalid = invalidIncluded(draft).length
  const reason = pending
    ? `확인이 필요한 내역 ${pending}개를 먼저 처리해 주세요`
    : invalid
      ? `필수값이 빠진 내역 ${invalid}개를 고쳐주세요`
      : summary.expenseCount === 0
        ? '분석할 지출이 1건 이상 있어야 해요'
        : ''
  return { canConfirm: !reason, reason, pending, invalid }
}
