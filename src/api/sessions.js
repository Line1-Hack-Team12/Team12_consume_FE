import { apiRequest } from './client.js'
import { toFileUploadQuery, toReviewQueueRequest, toSessionQuery, toTransactionRequest } from './requestPayloads.js'

// 배포 Swagger /v3/api-docs 기준. 미정 필드는 실제 요청에 추가하지 않는다.

export function unsupportedSessionInput({ settings, assets }) {
  const reasons = []
  // Swagger의 filePassword는 요청당 하나이므로 서로 다른 암호를 함께 보낼 수 없다.
  const passwords = new Set(assets.filter((asset) => asset.kind === 'file' && asset.password).map((asset) => asset.password))
  if (passwords.size > 1) reasons.push('함께 올리는 엑셀 파일의 암호는 같아야 해요. 암호가 다른 파일은 암호를 해제한 뒤 추가해 주세요.')
  if (settings.payday === 'last') reasons.push('급여일 말일 지정은 아직 지원하지 않아요. 날짜를 선택하거나 급여일을 비워 주세요.')
  else if (settings.payday && (!/^\d+$/.test(String(settings.payday)) || Number(settings.payday) < 1 || Number(settings.payday) > 31)) reasons.push('급여일은 1~31일 중 골라 주세요.')
  return reasons.join(' ')
}

function uploadForm({ settings, assets, consent }) {
  if (!consent) throw new Error('외부 AI 전송에 동의해야 분석할 수 있어요.')
  const reason = unsupportedSessionInput({ settings, assets })
  if (reason) throw new Error(reason)
  const form = new FormData()
  assets.forEach((asset) => form.append('files', asset.file, asset.name))
  return form
}

export function createSession(input) {
  return apiRequest('/api/sessions', {
    method: 'POST',
    form: uploadForm(input),
    query: toSessionQuery(input.settings, input.assets, input.consent),
  })
}

export function appendFiles(sessionId, input) {
  return apiRequest(`/api/sessions/${sessionId}/files`, { method: 'POST', form: uploadForm(input), query: toFileUploadQuery(input.settings, input.assets) })
}

export const getSessionStatus = (sessionId, opts) => apiRequest(`/api/sessions/${sessionId}/status`, opts)
// Swagger는 JSON 안의 files를 binary로 선언한다. 실제 바이너리 인코딩/전송 방식 확정 전에는 성공으로 간주하지 않는다.
export const CAN_RETRY_WITH_FILES = false
export function retryFailedFiles() {
  throw new Error('파일을 다시 읽는 기능은 아직 준비 중이에요. 파일 교체하기로 다시 올려 주세요.')
}
export const resetForReplace = (sessionId) => apiRequest(`/api/sessions/${sessionId}/reset-for-replace`, { method: 'POST' })
export const proceedPartial = (sessionId) => apiRequest(`/api/sessions/${sessionId}/proceed-partial`, { method: 'POST' })
export const getReview = (sessionId) => apiRequest(`/api/sessions/${sessionId}/review`)
export const confirmReviewQueue = (sessionId, confirmedItems) => apiRequest(`/api/sessions/${sessionId}/review/queue/confirm`, { method: 'POST', json: toReviewQueueRequest(confirmedItems) })
export const checkReview = (sessionId) => apiRequest(`/api/sessions/${sessionId}/review/check`, { method: 'POST' })
export const getTransactions = (sessionId) => apiRequest(`/api/sessions/${sessionId}/transactions`)
export const getTransaction = (id) => apiRequest(`/api/transactions/${id}`)
export const getDuplicates = (sessionId) => apiRequest(`/api/sessions/${sessionId}/duplicates`)
export const resolveDuplicate = (sessionId, groupId, resolution) => apiRequest(`/api/sessions/${sessionId}/duplicates/resolve`, { method: 'POST', json: { groupId, resolution } })
export const confirmSession = (sessionId) => apiRequest(`/api/sessions/${sessionId}/confirm`, { method: 'POST' })
export const getAnalysisStatus = (sessionId, opts) => apiRequest(`/api/sessions/${sessionId}/analysis/status`, opts)

export function updateTransaction(serverId, transaction, action) {
  return apiRequest(`/api/transactions/${serverId}`, {
    method: 'PUT',
    json: toTransactionRequest(transaction, action),
  })
}
