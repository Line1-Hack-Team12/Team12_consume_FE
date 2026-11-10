import { CAUSE_TAGS, MAX_CUSTOM_CAUSE_LENGTH } from '../constants/patternResponses'
import { isValidReminderTime } from '../constants/reminders'

const ALLOWED_TAGS = new Set(CAUSE_TAGS.map((item) => item.value))

function isAnswered(response) {
  if (!response || !Array.isArray(response.cause_tags)) return false
  if (['unknown', 'not_applicable'].includes(response.response_status)) return response.cause_tags.length === 0
  if (response.response_status !== 'answered' || response.cause_tags.length === 0) return false
  if (response.cause_tags.some((tag) => !ALLOWED_TAGS.has(tag))) return false
  return !response.cause_tags.includes('custom') || (typeof response.custom_cause === 'string'
    && response.custom_cause.trim().length > 0 && response.custom_cause.length <= MAX_CUSTOM_CAUSE_LENGTH)
}

function isEnabledReminder(pattern, entry) {
  const saved = entry?.saved
  const draft = entry?.draft ?? saved
  const reminder = saved?.reminder
  const suggestion = pattern.reminderSuggestion
  if (reminder?.mode !== 'demo' || reminder.state !== 'enabled') return false
  // 해제와 '해당 없음'은 다른 응답을 저장하는 중에도 즉시 반영한다.
  if (draft?.reminder?.state !== 'enabled' || draft.response_status === 'not_applicable' || saved.response_status === 'not_applicable') return false
  return Boolean(suggestion && Number.isInteger(suggestion.weekday) && suggestion.weekday >= 0 && suggestion.weekday <= 6
    && reminder.weekday === suggestion.weekday && isValidReminderTime(reminder.time))
}

// 현재 분석의 저장된 응답과 확정 플랜만 요약한다. 거래·절감액을 다시 계산하지 않는다.
export function summarizeCompletion({ patterns, entries, scope, snapshotId, planSelection = null }) {
  let answeredCount = 0
  let enabledReminderCount = 0
  let planReminderCount = 0
  const unsavedPatternIds = []
  patterns.forEach((pattern, index) => {
    const entry = entries[index]
    if (isAnswered(entry?.saved)) answeredCount += 1
    if (isEnabledReminder(pattern, entry)) {
      enabledReminderCount += 1
      if (entry.saved.reminder.source === 'plan') planReminderCount += 1
    }
    if (entry?.dirty || entry?.saving || entry?.error) unsavedPatternIds.push(pattern.id)
  })
  const plan = planSelection?.scope === scope && planSelection.snapshotId === snapshotId ? planSelection.plan : null
  const selectedPlan = plan && typeof plan.label === 'string' && Number.isFinite(plan.monthlySavingsKrw) && plan.monthlySavingsKrw >= 0
    ? { label: plan.label.replace(/^플랜\s+/, ''), monthlySavingsKrw: plan.monthlySavingsKrw }
    : null

  return {
    patternCount: patterns.length,
    answeredCount,
    enabledReminderCount,
    planReminderCount,
    selectedPlan,
    hasUnsavedResponses: unsavedPatternIds.length > 0,
    unsavedPatternIds,
  }
}

// useSyncExternalStore는 읽을 때마다 새 배열을 반환하면 반복 렌더된다.
// 관련 record 참조가 바뀔 때에만 새 스냅샷을 만들고, 다른 분석의 변경은 무시한다.
export function createCompletionSnapshotReader({ patterns, scope, fallbackEntries, getResponseEntry, getPlanEntry }) {
  let snapshot = null
  return () => {
    const entries = patterns.map((pattern, index) => getResponseEntry(`${scope}:${pattern.id}`) ?? fallbackEntries[index])
    const planEntry = scope ? getPlanEntry(scope) : undefined
    if (snapshot && snapshot.planEntry === planEntry && entries.every((entry, index) => entry === snapshot.entries[index])) return snapshot
    snapshot = { entries, planEntry }
    return snapshot
  }
}
