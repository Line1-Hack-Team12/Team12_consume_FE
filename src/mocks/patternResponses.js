import { CAUSE_TAGS, MAX_CUSTOM_CAUSE_LENGTH, REMINDER_DISCLAIMER, RESPONSE_STATUSES } from '../constants/patternResponses'
import { isValidReminderTime, validateReminderTime } from '../constants/reminders'

const SPECIAL_STATUSES = RESPONSE_STATUSES.map((item) => item.value)
const ALLOWED_TAGS = CAUSE_TAGS.map((item) => item.value)

export function createInitialPatternResponse(pattern, { designPreview = false } = {}) {
  const suggestion = pattern?.reminderSuggestion
  const seed = designPreview || pattern?.mode === 'server' ? pattern?.initialResponse : null
  return {
    revision: seed?.revision ?? 0,
    response_status: seed?.response_status ?? 'unanswered',
    cause_tags: [...(seed?.cause_tags ?? [])],
    custom_cause: seed?.custom_cause ?? '',
    reminder: {
      mode: 'demo',
      state: seed?.reminder?.state ?? 'disabled',
      weekday: suggestion?.weekday ?? null,
      time: suggestion?.time ?? null,
      ...(seed?.reminder?.source ? { source: seed.reminder.source } : {}),
      ...(seed?.reminder?.planId ? { planId: seed.reminder.planId } : {}),
    },
  }
}

export function validatePatternResponse(response, pattern) {
  const status = response.response_status
  if (!['unanswered', 'answered', ...SPECIAL_STATUSES].includes(status)) return '응답 상태를 다시 선택해 주세요.'
  if (response.cause_tags.some((tag) => !ALLOWED_TAGS.includes(tag))) return '원인 태그를 다시 선택해 주세요.'
  if (SPECIAL_STATUSES.includes(status) && response.cause_tags.length > 0) return '특별 응답에는 원인 태그를 함께 저장할 수 없어요.'
  if (status === 'unanswered' && response.cause_tags.length > 0) return '원인 태그와 응답 상태를 다시 확인해 주세요.'
  if (!['disabled', 'enabled', 'paused'].includes(response.reminder.state)) return '알림 상태를 다시 확인해 주세요.'
  if (response.cause_tags.includes('custom')) {
    if (!response.custom_cause.trim()) return '직접 입력한 이유를 적어 주세요.'
    if (response.custom_cause.length > MAX_CUSTOM_CAUSE_LENGTH) return `직접 입력은 ${MAX_CUSTOM_CAUSE_LENGTH}자까지 가능해요.`
  }
  if (response.reminder.state === 'enabled') {
    const suggestion = pattern?.reminderSuggestion
    if (status === 'not_applicable') return '해당 없음으로 답한 습관은 알림을 켤 수 없어요.'
    if (!suggestion || !Number.isInteger(suggestion.weekday) || suggestion.weekday < 0 || suggestion.weekday > 6) return '요일 근거가 없어 알림을 제안할 수 없어요.'
    if (response.reminder.weekday !== suggestion.weekday) return '알림의 요일 근거를 다시 확인해 주세요.'
    const timeError = validateReminderTime(response.reminder.time)
    if (timeError) return timeError
  }
  return ''
}

function responseError(message, kind = 'save') {
  return Object.assign(new Error(message), { kind })
}

// 전체 대체 + revision 검증을 보여주는 메모리 목업이다. 실제 API 경로·계약을 뜻하지 않는다.
export async function saveMockPatternResponse({ current, replacement, expectedRevision, pattern, failureMode = null }) {
  await new Promise((resolve) => setTimeout(resolve, 120))
  if (failureMode === 'error') throw responseError('데모 응답 저장에 실패했어요. 다시 시도해 주세요.')
  if (expectedRevision !== current.revision || failureMode === 'conflict') throw responseError('다른 변경사항과 겹쳤어요. 입력은 유지했으니 다시 저장해 주세요.', 'conflict')
  const message = validatePatternResponse(replacement, pattern)
  if (message) throw responseError(message, 'validation')
  const special = SPECIAL_STATUSES.includes(replacement.response_status)
  return {
    revision: current.revision + 1,
    response_status: replacement.response_status,
    cause_tags: special ? [] : [...new Set(replacement.cause_tags)],
    custom_cause: !special && replacement.cause_tags.includes('custom') ? replacement.custom_cause : '',
    reminder: {
      ...replacement.reminder,
      mode: 'demo',
      state: replacement.response_status === 'not_applicable' && current.reminder.state === 'enabled' ? 'paused' : replacement.reminder.state,
    },
  }
}

export function buildReminderPreview({ pattern, response, tone = 'coach' }) {
  if (!pattern) return REMINDER_DISCLAIMER
  const labels = response.cause_tags.map((tag) => tag === 'custom' ? response.custom_cause.trim() : CAUSE_TAGS.find((item) => item.value === tag)?.label).filter(Boolean)
  const context = labels.length > 0 ? `선택한 맥락: ${labels.join(' · ')}. ` : ''
  const observation = pattern.observation
  const opening = tone === 'friend' ? '지난 기록을 같이 돌아보자.' : tone === 'grandma' ? '지난 소비 기록을 한번 보자꾸나.' : '지난 소비 기록을 돌아볼 시간이에요.'
  return `${opening} ${context}${pattern.title} · ${observation}. ${REMINDER_DISCLAIMER}`
}

function initialRecord(response) {
  return { saved: response, draft: response, dirty: false, saving: false, error: null, editVersion: 0 }
}

// Provider마다 하나씩 생성한다. 원인 응답은 브라우저 영구 저장소·모듈 전역에 보관하지 않는다.
export function createPatternResponseStore({ saveResponse } = {}) {
  const entries = new Map()
  const listeners = new Set()
  const pending = new Map()
  const failedOnce = new Set()
  const disableVersions = new Map()
  const externalRuleVersions = new Map()
  let activeSnapshotId = null
  const emit = () => listeners.forEach((listener) => listener())
  const replace = (key, record) => { entries.set(key, record); emit() }
  const isActive = (key) => key.startsWith('preview:') || key.startsWith(`snapshot:${activeSnapshotId}:`)
  const version = (versions, key) => versions.get(key) ?? 0
  const bump = (versions, key) => versions.set(key, version(versions, key) + 1)

  const store = {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    get(key) { return entries.get(key) },
    update(key, fallback, response) {
      const entry = entries.get(key) ?? initialRecord(fallback)
      replace(key, { ...entry, draft: { ...response, revision: entry.saved.revision }, dirty: true, error: null, editVersion: entry.editVersion + 1 })
    },
    disableReminder(key, fallback) {
      const entry = entries.get(key) ?? initialRecord(fallback)
      // 규칙 해제는 미완성 원인 입력과 별개로 즉시 반영하고, 입력 중인 내용은 보존한다.
      const changesRule = entry.saved.reminder.state !== 'disabled' || entry.draft.reminder.state !== 'disabled' || entry.saving
      const revision = entry.saved.revision + (changesRule ? 1 : 0)
      const disable = (response) => ({ ...response, revision, reminder: { ...response.reminder, state: 'disabled' } })
      bump(disableVersions, key)
      replace(key, { ...entry, saved: disable(entry.saved), draft: disable(entry.draft), saving: false, error: null, editVersion: entry.editVersion + 1 })
    },
    setSnapshot(snapshotId) {
      activeSnapshotId = snapshotId
      for (const [key, entry] of entries) {
        if (key.startsWith('preview:') || isActive(key)) continue
        if (entry.saved.reminder.state !== 'enabled' && entry.draft.reminder.state !== 'enabled') continue
        const pause = (response) => ({ ...response, revision: entry.saved.revision + 1, reminder: { ...response.reminder, state: 'paused' } })
        bump(externalRuleVersions, key)
        replace(key, { ...entry, saved: pause(entry.saved), draft: pause(entry.draft), dirty: false, saving: false, editVersion: entry.editVersion + 1 })
      }
    },
    enableFromPlan({ snapshotId, patterns, designPreview = false, planId }) {
      const enabled = []
      for (const pattern of patterns) {
        const key = `${designPreview ? 'preview' : 'snapshot'}:${snapshotId}:${pattern.id}`
        if (!isActive(key) || !pattern.reminderSuggestion) continue
        const entry = entries.get(key) ?? initialRecord(createInitialPatternResponse(pattern, { designPreview }))
        if (entry.draft.response_status === 'not_applicable' || entry.saved.response_status === 'not_applicable') continue
        const suggestion = pattern.reminderSuggestion
        const time = isValidReminderTime(entry.draft.reminder.time) ? entry.draft.reminder.time : suggestion.time
        const reminder = { mode: 'demo', state: 'enabled', weekday: suggestion.weekday, time, source: 'plan', planId }
        if (validatePatternResponse({ ...entry.draft, reminder }, pattern)) continue
        const revision = entry.saved.revision + 1
        bump(externalRuleVersions, key)
        replace(key, { ...entry, saved: { ...entry.saved, revision, reminder }, draft: { ...entry.draft, revision, reminder }, editVersion: entry.editVersion + 1 })
        enabled.push(pattern.id)
      }
      return enabled
    },
    save(key, fallback, pattern, { failureMode = null } = {}) {
      if (pending.has(key)) return pending.get(key)
      if (!entries.get(key)?.dirty) return Promise.resolve(true)
      const run = async () => {
        while (entries.get(key)?.dirty) {
          const entry = entries.get(key) ?? initialRecord(fallback)
          const disableVersion = version(disableVersions, key)
          const externalRuleVersion = version(externalRuleVersions, key)
          if (!isActive(key)) {
            replace(key, { ...entry, saving: false, error: responseError('확정한 기록이 바뀌었어요. 새 결과에서 다시 답해 주세요.') })
            return false
          }
          replace(key, { ...entry, saving: true, error: null })
          const failureKey = `${key}:${failureMode}`
          const fail = failureMode && !failedOnce.has(failureKey) ? failureMode : null
          if (fail) failedOnce.add(failureKey)
          try {
            const transport = pattern.mode === 'server' ? saveResponse : saveMockPatternResponse
            if (!transport) throw responseError('응답 저장 연결을 확인해 주세요.')
            const outcome = await transport({ current: entry.saved, replacement: entry.draft, expectedRevision: entry.saved.revision, pattern, failureMode: fail })
              .then((saved) => ({ saved }), (error) => ({ error }))
            const latest = entries.get(key)
            // 로컬 해제 뒤의 이전 응답(성공·실패 모두)은 버린다. 다시 켠 경우도 최신 입력만 저장한다.
            const locallySuperseded = isActive(key) && disableVersion !== version(disableVersions, key)
              && externalRuleVersion === version(externalRuleVersions, key)
            if (locallySuperseded) {
              if (validatePatternResponse(latest.draft, pattern)) {
                replace(key, { ...latest, saving: false, error: null })
                return false
              }
              continue
            }
            if (outcome.error) throw outcome.error
            if (!isActive(key)) throw responseError('확정 기록이나 응답이 바뀌었어요. 입력은 유지했으니 다시 저장해 주세요.', 'conflict')
            if (latest.saved.revision !== entry.saved.revision) {
              throw responseError('확정 기록이나 응답이 바뀌었어요. 입력은 유지했으니 다시 저장해 주세요.', 'conflict')
            }
            const saved = outcome.saved
            const unchanged = latest.editVersion === entry.editVersion
            replace(key, { ...latest, saved, draft: unchanged ? saved : { ...latest.draft, revision: saved.revision }, dirty: !unchanged, saving: !unchanged, error: null })
          } catch (error) {
            const latest = entries.get(key)
            // 충돌 후에도 사용자의 최신 입력을 유지하며, 다음 시도는 최신 revision을 사용한다.
            const saved = error.kind === 'conflict' && fail === 'conflict' && latest.saved.revision === entry.saved.revision
              ? { ...latest.saved, revision: latest.saved.revision + 1 } : latest.saved
            replace(key, { ...latest, saved, draft: { ...latest.draft, revision: saved.revision }, saving: false, error })
            return false
          }
        }
        return true
      }
      const task = run().finally(() => pending.delete(key))
      pending.set(key, task)
      return task
    },
  }
  return store
}
