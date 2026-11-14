// F07 검토용 합계. 최종 탐지·분석 수치는 서버 응답을 사용한다.
export function expenseImpact(t) {
  if (!t.included || t.direction === 'unknown' || t.kind === 'unknown' || t.kind === 'self_transfer') return 0
  if (['refund', 'cancel'].includes(t.kind)) return -Math.abs(t.amountKrw)
  return t.direction === 'out' && ['expense', 'transfer'].includes(t.kind) ? Math.abs(t.amountKrw) : 0
}

export function summarizeDraft(draft) {
  const summary = { expenseCount: 0, expenseSum: 0, validCount: 0, bySlot: {} }
  if (!draft) return summary
  const away = new Set(draft.duplicateGroups.filter((g) => g.decision === 'merge').flatMap((g) => g.memberIds.filter((id) => id !== g.representativeId)))
  for (const t of draft.transactions) {
    if (!t.included || away.has(t.id)) continue
    if (t.slotMonth) summary.bySlot[t.slotMonth] = (summary.bySlot[t.slotMonth] ?? 0) + 1
    if (t.date && t.merchant?.trim() && t.amountKrw > 0) summary.validCount++
    const amount = expenseImpact(t)
    if (amount > 0) summary.expenseCount++
    summary.expenseSum += amount
  }
  return summary
}
