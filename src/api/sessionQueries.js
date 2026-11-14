import { getCompletionSummary, getNotifications, getSavingsPlans } from './analysis.js'

// 화면 재진입 시 메모리 캐시를 재사용한다. 저장 성공 시 관련 조회를 무효화한다.
const cacheOptions = { staleTime: 60_000, gcTime: 5 * 60_000, retry: false, refetchOnWindowFocus: false }
const scopeKey = (sessionId, snapshotId) => ['session', String(sessionId), 'snapshot', String(snapshotId)]

export function savingsPlansQuery(sessionId, snapshotId, goal, locked) {
  const categories = [...locked].sort()
  return {
    ...cacheOptions,
    queryKey: [...scopeKey(sessionId, snapshotId), 'plans', goal, categories],
    queryFn: ({ signal }) => getSavingsPlans(sessionId, goal, categories, { signal }),
  }
}

export function notificationsQuery(sessionId, snapshotId) {
  return {
    ...cacheOptions,
    queryKey: [...scopeKey(sessionId, snapshotId), 'notifications'],
    queryFn: ({ signal }) => getNotifications(sessionId, { signal }),
  }
}

export function completionSummaryQuery(sessionId, snapshotId) {
  return {
    ...cacheOptions,
    queryKey: [...scopeKey(sessionId, snapshotId), 'completion'],
    queryFn: ({ signal }) => getCompletionSummary(sessionId, { signal }),
  }
}

export function invalidateSessionQueries(client, sessionId, snapshotId, resources) {
  return Promise.all(resources.map((resource) => client.invalidateQueries({
    queryKey: [...scopeKey(sessionId, snapshotId), resource],
  })))
}
