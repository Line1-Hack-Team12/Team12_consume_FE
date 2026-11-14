import { toDraft } from './adapters.js'
import { confirmSession, getDuplicates, getReview, getTransactions } from './sessions.js'
import { sameReviewDraft } from '../utils/draftConflict.js'

export class ReviewConflictError extends Error {
  constructor(latestDraft = null, refreshError = null) {
    super('검토 중 내역이 변경돼 확정을 멈췄어요. 이전 검토 내용은 보관했으니 최신 표를 불러와 다시 확인해 주세요.')
    this.name = 'ReviewConflictError'
    this.latestDraft = latestDraft
    this.refreshError = refreshError
  }
}

export async function fetchReviewDraft(sessionId, slots) {
  // 중복 조회 실패도 확정을 중단한다. 확인하지 못한 중복을 빈 목록으로 취급하지 않는다.
  const [list, review, duplicates] = await Promise.all([getTransactions(sessionId), getReview(sessionId), getDuplicates(sessionId)])
  if (!Array.isArray(list?.transactions) || !review || typeof review !== 'object' || !duplicates || typeof duplicates !== 'object') {
    throw new Error('최신 검토 내역을 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.')
  }
  return toDraft({ list, review, duplicates }, { slots })
}

export async function confirmReviewedDraft(sessionId, draft, slots) {
  const latest = await fetchReviewDraft(sessionId, slots)
  if (!sameReviewDraft(draft, latest)) throw new ReviewConflictError(latest)
  try {
    // 현재 배포 API에는 expectedRevision 입력이 없다. 문서에 없는 필드는 전송하지 않는다.
    return await confirmSession(sessionId)
  } catch (error) {
    if (![409, 412].includes(error.status)) throw error
    let refreshed
    try {
      refreshed = await fetchReviewDraft(sessionId, slots)
    } catch (refreshError) {
      throw new ReviewConflictError(null, refreshError.message)
    }
    throw new ReviewConflictError(refreshed)
  }
}
