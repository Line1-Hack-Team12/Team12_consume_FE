import { apiRequest } from './client.js'
import { toNotificationRequest, toPatternResponseRequest, toPlanSelectionRequest } from './requestPayloads.js'

export const getAnalysisResult = (id) => apiRequest(`/api/analyses/${id}/result`)
export const getPatternDetail = (analysisId, patternId) => apiRequest(`/api/analyses/${analysisId}/patterns/${patternId}`)
export const getReport = (sessionId) => apiRequest(`/api/sessions/${sessionId}/report`)
export const regenerateNarratives = (analysisId, persona) => apiRequest(`/api/analyses/${analysisId}/narratives`, { method: 'POST', json: { persona } })
export const getSavingsPlans = (sessionId, targetAmount, excludeCategories) => apiRequest(`/api/sessions/${sessionId}/savings-plans`, { query: { targetAmount, excludeCategories } })
export const selectSavingsPlan = (sessionId, plan, targetAmount) => apiRequest(`/api/sessions/${sessionId}/savings-plans/select`, { method: 'POST', json: toPlanSelectionRequest(plan, targetAmount) })
export const getNotifications = (sessionId) => apiRequest(`/api/sessions/${sessionId}/notifications`)
export const updateNotification = (id, input) => apiRequest(`/api/notifications/${id}`, { method: 'PATCH', json: toNotificationRequest(input) })
export const sendDemoNotification = (id) => apiRequest(`/api/notifications/${id}/demo-send`, { method: 'POST' })
export const getCompletionSummary = (sessionId) => apiRequest(`/api/sessions/${sessionId}/completion-summary`)

export async function savePatternResponse({ current, replacement, pattern }) {
  if (replacement.response_status === 'unanswered') throw new Error('태그를 모두 지우는 저장은 아직 지원되지 않아요. 모르겠음·건너뛰기를 선택하거나 태그를 골라 주세요.')
  const saved = await apiRequest(`/api/analyses/${pattern.analysisId}/patterns/${pattern.id}/response`, {
    method: 'PUT', json: toPatternResponseRequest(current, replacement),
  })
  return { ...replacement, revision: saved.revision, response_status: saved.responseStatus.toLowerCase(), cause_tags: saved.causeTags ?? [], custom_cause: saved.customReason ?? '' }
}
