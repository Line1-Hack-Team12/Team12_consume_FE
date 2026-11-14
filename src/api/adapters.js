import { CATEGORIES, KINDS } from '../constants/limits.js'

const STAGES = ['reading', 'classifying', 'deduplicating', 'preliminary_detecting']
const normalize = (value) => String(value ?? '').toLowerCase()
const terminal = ['succeeded', 'partial', 'failed', 'no_transactions']

export function toExtractionJob(status) {
  const failedById = new Map((status.failedFiles ?? []).map((f) => [String(f.fileId), f]))
  const perAsset = (status.perAsset ?? status.fileStatuses ?? status.assets ?? []).map((f) => {
    const id = f.assetId ?? f.fileId ?? f.id
    const failed = failedById.get(String(id))
    const code = normalize(f.status ?? f.state)
    const text = f.statusText ?? ''
    const state = code === 'skipped' || text.includes('건너') ? 'skipped'
      : failed || code === 'failed' || text.includes('실패') ? 'failed'
        : ['succeeded', 'completed'].includes(code) || text.includes('완료') ? 'succeeded'
          : code === 'queued' || text.includes('대기') ? 'queued' : 'running'
    return { assetId: id, name: f.name ?? f.fileName, slotMonth: f.slotMonth ?? failed?.slotMonth, kind: f.kind,
      status: state, reason: f.reason ?? failed?.reason ?? f.errorMessage, errorCode: f.errorCode ?? failed?.errorCode,
      retryable: f.retryable ?? failed?.retryable ?? !['PASSWORD_REQUIRED', 'INVALID_PASSWORD', 'UNSUPPORTED_FORMAT', 'OUTPUT_TRUNCATED', 'REFUSED'].includes(f.errorCode ?? failed?.errorCode) }
  })
  for (const f of status.failedFiles ?? []) {
    if (!perAsset.some((a) => String(a.assetId) === String(f.fileId))) perAsset.push({ assetId: f.fileId, name: f.fileName, slotMonth: f.slotMonth, status: 'failed', reason: f.reason, errorCode: f.errorCode, retryable: f.retryable ?? true })
  }
  const code = normalize(status.state ?? status.status)
  let state = terminal.includes(code) ? code : 'running'
  if (['reviewing', 'completed'].includes(code)) state = 'succeeded'
  if (code === 'partial_failed') state = perAsset.some((a) => a.status === 'succeeded') ? 'partial' : 'failed'
  if (perAsset.length && perAsset.every((a) => a.status === 'skipped')) state = 'no_transactions'
  const running = (status.steps ?? []).find((s) => s.status === 'IN_PROGRESS')
  return { state, stage: terminal.includes(state) ? null : status.stage ?? STAGES[Math.min(4, Math.max(1, running?.stepNumber ?? status.currentStep ?? 1)) - 1],
    perAsset, guideMessage: status.guideMessage, autoRetryCount: status.autoRetryCount, result: status.result }
}

const QUEUE_FLAGS = ['date_missing', 'merchant_missing', 'unknown_direction', 'low_confidence', 'month_mismatch', 'unknown_kind']
const directionOf = (value) => ['입금', 'in'].includes(value) ? 'in' : ['출금', 'out'].includes(value) ? 'out' : 'unknown'
const hasKind = (value) => KINDS.some((k) => k.value === value)

export function toDraft({ list, review, duplicates }, { slots = [], assetSlots = {} } = {}) {
  const queueItems = review?.reviewQueue?.items ?? review?.lowConfidenceQueue?.items ?? []
  const queueById = new Map(queueItems.map((q) => [String(q.transactionId ?? q.id), q]))
  const transactions = (list?.transactions ?? []).map((t) => {
    const id = String(t.transactionId ?? t.id)
    const q = queueById.get(id)
    const sourceAssetId = t.sourceAssetId ?? t.source_asset_id
    const date = t.date ?? ''
    // category에 kind를 담는 기존 응답도 지원하되 방향 unknown은 보존한다.
    const kind = hasKind(t.kind ?? t.type) ? t.kind ?? t.type : hasKind(t.category) ? t.category : 'unknown'
    const direction = directionOf(t.direction)
    const slotMonth = t.slotMonth ?? t.slot_month ?? q?.slotMonth ?? assetSlots[sourceAssetId] ?? (slots.includes(date.slice(0, 7)) ? date.slice(0, 7) : slots.length === 1 ? slots[0] : '')
    const flags = [...new Set([...(t.flags ?? []), ...(q?.flags ?? [])])]
    if (!date) flags.push('date_missing')
    if (!(t.storeName ?? t.merchant)?.trim()) flags.push('merchant_missing')
    if (direction === 'unknown') flags.push('unknown_direction')
    if (kind === 'unknown') flags.push('unknown_kind')
    if (slotMonth && date && !date.startsWith(slotMonth)) flags.push('month_mismatch')
    if (t.confidence === 'low') flags.push('low_confidence')
    const reviewReasons = [...new Set(flags.filter((f) => QUEUE_FLAGS.includes(f)))]
    if (q && !reviewReasons.length) reviewReasons.push('low_confidence')
    return { id, serverId: t.transactionId ?? t.id, date, slotMonth, sourceAssetId, sourceRowId: t.sourceRowId ?? t.source_row_id,
      time: t.time || null, merchant: t.storeName ?? t.merchant ?? '', amountKrw: Math.abs(Number(t.amount ?? t.amount_krw ?? 0)),
      direction, kind, category: CATEGORIES.some((c) => c.value === t.category) ? t.category : 'other', subcategory: t.subcategory ?? null,
      revision: t.revision, included: !(t.excluded ?? t.isExcluded ?? false), reviewReasons,
      reviewStatus: q?.confirmed || q?.isConfirmed || t.reviewConfirmed ? 'kept' : reviewReasons.length ? 'pending' : 'ok',
      readAmountKrw: q?.originalAmount !== q?.suggestedAmount ? q?.originalAmount : null }
  })
  const groups = duplicates?.groups ?? (duplicates?.totalGroupsCount > 0 ? [duplicates] : [])
  const duplicateGroups = groups.filter((g) => (g.items ?? g.memberIds ?? []).length > 1).map((g) => ({
    id: String(g.groupId ?? g.id), serverGroupId: g.groupId ?? g.id, slotMonth: g.slotMonth,
    memberIds: (g.memberIds ?? g.items.map((i) => i.transactionId)).map(String),
    representativeId: String(g.representativeId ?? g.items?.find((i) => i.kind === 'file')?.transactionId ?? g.items?.[0]?.transactionId ?? g.memberIds?.[0]),
    decision: g.decision === 'separate' ? 'separate' : 'merge', reviewed: false,
  }))
  transactions.sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')))
  return { revision: list?.revision ?? review?.revision ?? null, transactions, duplicateGroups, slots,
    skippedCount: review?.skippedCount ?? 0, failedCount: review?.failedCount ?? 0 }
}

export function toAnalysisJob(status) {
  const code = normalize(status.state ?? status.status)
  const state = code === 'completed' || code === 'succeeded' ? 'succeeded' : code === 'failed' ? 'failed' : 'running'
  const step = (status.steps ?? []).find((s) => s.status === 'IN_PROGRESS')?.stepNumber ?? status.currentStep ?? 1
  return { state, stage: status.stage ?? ['final_aggregating', 'detecting', 'explaining'][Math.min(3, Math.max(1, step)) - 1],
    analysisId: status.analysisId, failureStage: status.failureStage, message: status.message ?? status.errorMessage }
}
