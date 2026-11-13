import { apiRequest } from './client'

// S01~S03 연동 · 노션 API 명세서와 Swagger(/swagger-ui) 기준
// 백엔드 응답을 그대로 돌려주고, 화면용 변환은 adapters.js에서 한다.

const PERSONA = { coach: 'COACH', friend: 'FRIEND', grandma: 'GRANDMOTHER' }

/** S01 세션 생성 + 캡처 업로드 · 응답: sessionId */
export function createSession({ settings, assets }) {
  const form = new FormData()
  assets.forEach((a) => form.append('files', a.file, a.name))
  return apiRequest('/api/sessions', {
    method: 'POST',
    form,
    query: {
      monthsCount: settings.monthCount,
      lastMonth: settings.lastMonth,
      region: settings.region || undefined,
      // 급여일 '말일'은 숫자 계약이 없어 보내지 않는다 (P2 기능)
      payday: /^\d+$/.test(settings.payday ?? '') ? Number(settings.payday) : undefined,
      persona: PERSONA[settings.tone] ?? 'COACH',
      aiConsent: true,
      slotMonths: assets.map((a) => a.slotMonth),
    },
  })
}

export const getSessionStatus = (sessionId, opts) => apiRequest(`/api/sessions/${sessionId}/status`, opts)
export const retryFailedFiles = (sessionId, fileIds) =>
  apiRequest(`/api/sessions/${sessionId}/retry-failed`, { method: 'POST', query: { fileIds }, json: {} })
export const resetForReplace = (sessionId) => apiRequest(`/api/sessions/${sessionId}/reset-for-replace`, { method: 'POST' })
export const proceedPartial = (sessionId) => apiRequest(`/api/sessions/${sessionId}/proceed-partial`, { method: 'POST' })

export const getReview = (sessionId) => apiRequest(`/api/sessions/${sessionId}/review`)
export const confirmReviewQueue = (sessionId, confirmedItems) =>
  apiRequest(`/api/sessions/${sessionId}/review/queue/confirm`, { method: 'POST', json: { confirmedItems } })
export const checkReview = (sessionId) => apiRequest(`/api/sessions/${sessionId}/review/check`, { method: 'POST' })
export const getTransactions = (sessionId) => apiRequest(`/api/sessions/${sessionId}/transactions`)
export const getDuplicates = (sessionId) => apiRequest(`/api/sessions/${sessionId}/duplicates`)
export const resolveDuplicate = (sessionId, groupId, resolution) =>
  apiRequest(`/api/sessions/${sessionId}/duplicates/resolve`, { method: 'POST', json: { groupId, resolution } })
export const confirmSession = (sessionId) => apiRequest(`/api/sessions/${sessionId}/confirm`, { method: 'POST' })
export const getAnalysisStatus = (sessionId, opts) => apiRequest(`/api/sessions/${sessionId}/analysis/status`, opts)

/**
 * S03-E 수정 · 그대로 두기 · 제외 · 복원
 * action: 'EDIT' | 'KEEP' | 'EXCLUDE' | 'RESTORE' (서버는 'EXCLUDE'만 제외로 처리하고 나머지는 포함으로 둔다)
 * 서버가 날짜·시각·가맹점·금액을 그대로 덮어쓰므로 바뀌지 않은 값도 함께 보낸다.
 */
export function updateTransaction(serverId, t, action) {
  return apiRequest(`/api/transactions/${serverId}`, {
    method: 'PUT',
    json: {
      date: t.date,
      time: t.time ?? null,
      storeName: t.merchant,
      amount: t.amountKrw,
      direction: t.direction === 'in' ? '입금' : '출금',
      type: t.kind,
      category: t.category,
      action,
    },
  })
}
