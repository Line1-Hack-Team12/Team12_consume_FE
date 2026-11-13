// 백엔드 응답 → 화면이 쓰는 모양으로 바꾸는 함수 모음
// 화면은 목업과 같은 draft 모양을 쓰므로, 여기서만 서버 필드 이름을 다룬다.

const STAGE_KEYS = ['reading', 'classifying', 'deduplicating', 'preliminary_detecting']

/** S02 /status → useJobPolling이 읽는 job 모양 */
export function toExtractionJob(status) {
  const failedById = new Map((status.failedFiles ?? []).map((f) => [f.fileId, f]))
  const perAsset = (status.fileStatuses ?? []).map((f) => {
    const failed = failedById.get(f.fileId)
    const text = f.statusText ?? ''
    const state = failed || text.includes('실패') ? 'failed' : text.includes('완료') ? 'succeeded' : text.includes('대기') ? 'queued' : 'running'
    return { assetId: f.fileId, name: f.fileName, slotMonth: failed?.slotMonth ?? null, status: state, reason: failed?.reason ?? null }
  })
  // 상태 목록에 없고 실패 목록에만 있는 파일도 보여준다
  for (const f of status.failedFiles ?? []) {
    if (!perAsset.some((a) => a.assetId === f.fileId)) perAsset.push({ assetId: f.fileId, name: f.fileName, slotMonth: f.slotMonth, status: 'failed', reason: f.reason })
  }

  const succeeded = perAsset.filter((a) => a.status === 'succeeded').length
  let state = 'running'
  if (['REVIEWING', 'ANALYZING', 'COMPLETED'].includes(status.status)) state = 'succeeded'
  else if (status.status === 'PARTIAL_FAILED') state = succeeded > 0 || (status.completedCount ?? 0) > 0 ? 'partial' : 'failed'

  const runningStep = (status.steps ?? []).find((s) => s.status === 'IN_PROGRESS')
  const stepNumber = runningStep?.stepNumber ?? status.currentStep ?? 1
  return {
    state,
    stage: state === 'running' ? STAGE_KEYS[Math.min(STAGE_KEYS.length, Math.max(1, stepNumber)) - 1] : null,
    perAsset,
    guideMessage: status.guideMessage ?? null,
  }
}

const KIND_MAP = { expense: 'expense', income: 'income', transfer: 'transfer', self_transfer: 'transfer', refund: 'refund', cancel: 'cancel' }

/**
 * S03 /transactions + /review + /duplicates → draft
 * - category: 서버가 아직 7개 카테고리를 주지 않아 'other'로 둔다 (백엔드 F07 분류 연결 후 교체)
 */
export function toDraft({ list, review, duplicates }) {
  const queueItems = review?.lowConfidenceQueue?.items ?? []
  const queueById = new Map(queueItems.map((q) => [String(q.transactionId), q]))

  const transactions = (list?.transactions ?? []).map((t) => {
    const id = String(t.transactionId)
    const q = queueById.get(id)
    const excluded = Boolean(t.excluded ?? t.isExcluded)
    const original = q?.originalAmount
    const suggested = q?.suggestedAmount
    return {
      id,
      serverId: t.transactionId,
      slotMonth: (t.date ?? '').slice(0, 7),
      date: t.date ?? '',
      time: t.time || null,
      merchant: t.storeName ?? '',
      amountKrw: Number(t.amount ?? 0),
      direction: t.direction === '입금' || t.direction === 'in' ? 'in' : 'out',
      kind: KIND_MAP[t.category] ?? 'expense',
      category: 'other',
      subcategory: null,
      included: !excluded,
      reviewReasons: q ? ['low_confidence'] : [],
      reviewStatus: q ? (q.confirmed ?? q.isConfirmed ? 'kept' : 'pending') : 'ok',
      readAmountKrw: q && original != null && suggested != null && original !== suggested ? original : null,
    }
  })

  const duplicateGroups =
    duplicates && duplicates.totalGroupsCount > 0 && (duplicates.items ?? []).length > 1
      ? [
          {
            id: String(duplicates.groupId),
            serverGroupId: duplicates.groupId,
            slotMonth: (duplicates.items[0].date ?? '').slice(0, 7),
            memberIds: duplicates.items.map((i) => String(i.transactionId)),
            representativeId: String(duplicates.items[0].transactionId),
            decision: 'merge',
            reviewed: false,
          },
        ]
      : []
  // 서버가 아직 중복 후보 원본 거래를 목록에 함께 주지 않는 경우를 대비해 출처 라벨만 붙인다
  for (const item of duplicates?.items ?? []) {
    const row = transactions.find((t) => t.id === String(item.transactionId))
    if (row) row.source = item.sourceLabel
  }

  transactions.sort((x, y) => (x.date + (x.time ?? '')).localeCompare(y.date + (y.time ?? '')))
  return {
    revision: 1,
    transactions,
    duplicateGroups,
    serverSummary: list ? { expenseCount: list.totalCount, expenseSum: list.totalExpense } : null,
  }
}

const ANALYSIS_STAGES = ['final_aggregating', 'detecting', 'explaining']

/** S03-P /analysis/status → job 모양 */
export function toAnalysisJob(status) {
  if (status.status === 'COMPLETED') return { state: 'succeeded', stage: null }
  if (status.status === 'FAILED') return { state: 'failed', stage: null }
  const running = (status.steps ?? []).find((s) => s.status === 'IN_PROGRESS')
  const step = running?.stepNumber ?? status.currentStep ?? 1
  return { state: 'running', stage: ANALYSIS_STAGES[Math.min(3, Math.max(1, step)) - 1] }
}
