import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { CAUSE_TAGS, MAX_CUSTOM_CAUSE_LENGTH, RESPONSE_STATUSES } from '../constants/patternResponses'
import { isValidReminderTime } from '../constants/reminders'
import { createInitialPatternResponse } from '../mocks/patternResponses'
import { useAnalysisSession } from './analysisSessionContext'

export default function usePatternResponse({ pattern, snapshotId, designPreview = false }) {
  const { snapshot, analysis, patternResponseStore: store } = useAnalysisSession()
  const preview = import.meta.env.DEV && designPreview
  const valid = Boolean(pattern && (preview || (snapshot?.id === snapshotId && analysis?.snapshotId === snapshotId && analysis.patterns.some((item) => item.id === pattern.id))))
  const key = valid ? `${preview ? 'preview' : 'snapshot'}:${snapshotId}:${pattern.id}` : null
  const initial = useMemo(() => createInitialPatternResponse(valid ? pattern : null, { designPreview: preview }), [valid, pattern, preview])
  const empty = useMemo(() => ({ saved: initial, draft: initial, dirty: false, saving: false, error: null, editVersion: 0 }), [initial])
  const getSnapshot = useCallback(() => key ? store.get(key) ?? empty : empty, [store, key, empty])
  const entry = useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
  const response = entry.draft
  const failureMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('responseDemo') : null
  const customError = response.cause_tags.includes('custom')
    ? !response.custom_cause.trim() ? '직접 입력한 이유를 적어 주세요.' : response.custom_cause.length > MAX_CUSTOM_CAUSE_LENGTH ? `직접 입력은 ${MAX_CUSTOM_CAUSE_LENGTH}자까지 가능해요.` : ''
    : ''

  const save = useCallback(() => key ? store.save(key, initial, pattern, { failureMode }) : Promise.resolve(true), [store, key, initial, pattern, failureMode])
  useEffect(() => {
    if (valid && entry.dirty && !entry.saving && !entry.error && !customError) save()
  }, [valid, entry.dirty, entry.saving, entry.error, entry.editVersion, customError, save])

  const update = (replacement) => { if (key) store.update(key, initial, replacement) }
  const latest = () => key ? store.get(key)?.draft ?? initial : initial

  return {
    response,
    saving: entry.saving,
    error: entry.error?.message ?? '',
    customError,
    toggleTag(value) {
      if (!CAUSE_TAGS.some((item) => item.value === value)) return
      const current = latest()
      const cause_tags = current.cause_tags.includes(value) ? current.cause_tags.filter((tag) => tag !== value) : [...current.cause_tags, value]
      update({ ...current, response_status: cause_tags.length > 0 ? 'answered' : 'unanswered', cause_tags, custom_cause: cause_tags.includes('custom') ? current.custom_cause : '' })
    },
    setCustomCause(custom_cause) {
      const current = latest()
      update({ ...current, response_status: 'answered', cause_tags: current.cause_tags.includes('custom') ? current.cause_tags : [...current.cause_tags, 'custom'], custom_cause })
    },
    selectStatus(response_status) {
      if (!RESPONSE_STATUSES.some((item) => item.value === response_status)) return
      const current = latest()
      update({ ...current, response_status, cause_tags: [], custom_cause: '', reminder: { ...current.reminder, state: response_status === 'not_applicable' && current.reminder.state === 'enabled' ? 'paused' : current.reminder.state } })
    },
    setReminderEnabled(enabled) {
      const current = latest()
      if (!key) return false
      if (pattern?.mode === 'server') return false // 카드별 규칙 생성 계약 전에는 로컬 성공 처리하지 않는다.
      if (!enabled) {
        store.disableReminder(key, initial)
        return true
      }
      if (current.response_status === 'not_applicable' || !pattern?.reminderSuggestion || !isValidReminderTime(current.reminder.time)) return false
      update({ ...current, reminder: { ...current.reminder, state: enabled ? 'enabled' : 'disabled' } })
      return true
    },
    setReminderTime(time) {
      if (!key || !pattern?.reminderSuggestion || !isValidReminderTime(time)) return false
      const current = latest()
      update({ ...current, reminder: { ...current.reminder, time } })
      return true
    },
    save,
    retry: save,
  }
}
