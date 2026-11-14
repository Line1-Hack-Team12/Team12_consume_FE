// 화면 상태 → 배포 Swagger 요청 DTO. 화면의 추가 상태는 이 경계를 넘어 전송하지 않는다.
const PERSONA = { coach: 'COACH', friend: 'FRIEND', grandma: 'GRANDMOTHER' }

export const toSlotMonths = (settings, assets) => assets.map((asset) => asset.slotMonth ?? settings.lastMonth)

export function toFileUploadQuery(settings, assets) {
  return {
    slotMonths: toSlotMonths(settings, assets),
    ownerName: settings.ownerName?.trim() || undefined,
    filePassword: assets.find((asset) => asset.kind === 'file' && asset.password)?.password || undefined,
  }
}

export function toSessionQuery(settings, assets, consent) {
  return {
    monthsCount: settings.monthCount,
    lastMonth: settings.lastMonth,
    region: settings.region || undefined,
    payday: settings.payday ? Number(settings.payday) : undefined,
    persona: PERSONA[settings.tone] ?? 'COACH',
    aiConsent: consent,
    ...toFileUploadQuery(settings, assets),
  }
}

export function toTransactionRequest(transaction, action) {
  return {
    date: transaction.date,
    time: transaction.time || undefined,
    storeName: transaction.merchant,
    amount: transaction.amountKrw,
    direction: transaction.direction === 'in' ? '입금' : transaction.direction === 'out' ? '출금' : 'unknown',
    type: transaction.kind,
    category: transaction.category,
    action,
  }
}

export function toPatternResponseRequest(current, replacement) {
  return {
    causeTags: replacement.cause_tags,
    customReason: replacement.custom_cause || undefined,
    responseStatus: replacement.response_status.toUpperCase(),
    expectedRevision: current.revision,
  }
}

export function toPlanSelectionRequest(plan, targetAmount) {
  return { targetAmount, planCode: plan.id, planTitle: plan.title, monthlySavedAmount: plan.monthlySavingsKrw, enableDemoNotification: true }
}

export function toNotificationRequest({ alertTime, isEnabled }) {
  return { alertTime, isEnabled }
}

export function toReviewQueueRequest(items) {
  return { confirmedItems: items.map(({ transactionId, applySuggested }) => ({ transactionId, applySuggested })) }
}
