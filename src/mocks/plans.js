import { DEFAULT_PLAN_GOAL_KRW, MAX_PLAN_GOAL_KRW, MIN_PLAN_GOAL_KRW, PLAN_SUBTAG_LOCKS } from '../constants/plans'
import { createInitialPatternResponse, validatePatternResponse } from './patternResponses'

// S09 Figma 확인용 별도 합성 자료다. 실제 snapshot·구독 탐지 결과가 아니다.
export const S09_PREVIEW_MODEL = {
  mode: 'demo',
  basisLabel: '디자인 미리보기용 합성 소비 기준',
  defaultLockedIds: ['cafe'],
  locks: [
    ...PLAN_SUBTAG_LOCKS.filter((item) => ['delivery', 'taxi', 'cafe'].includes(item.id)),
    { id: 'recurring:preview-youtube', label: '유튜브 프리미엄', kind: 'recurring' },
  ],
  categoryMonthlyKrw: { delivery: 84000, transport: 96000, living: 40000, cafe: 12000 },
  candidates: [
    { id: 'preview-cut-delivery', kind: 'pattern', label: '목요일 밤 배달', lockId: 'delivery', category: 'delivery', beforeCount: 4, afterCount: 2, monthlySavingsKrw: 42000, patternId: 'preview-night-delivery', recurringId: null, evidenceTransactionIds: ['plan-preview-delivery-1', 'plan-preview-delivery-2'], painScore: 0.5 },
    { id: 'preview-cut-taxi', kind: 'pattern', label: '택시', lockId: 'taxi', category: 'transport', beforeCount: 8, afterCount: 4, monthlySavingsKrw: 48000, patternId: 'preview-rain-taxi', recurringId: null, evidenceTransactionIds: ['plan-preview-taxi-1', 'plan-preview-taxi-2', 'plan-preview-taxi-3', 'plan-preview-taxi-4'], painScore: 0.5 },
    { id: 'preview-cut-cafe', kind: 'subtag', label: '카페', lockId: 'cafe', category: 'cafe', beforeCount: 4, afterCount: 2, monthlySavingsKrw: 6000, patternId: null, recurringId: null, evidenceTransactionIds: ['plan-preview-cafe-1', 'plan-preview-cafe-2'], painScore: 0.5 },
    { id: 'preview-cancel-youtube', kind: 'recurring', label: '유튜브 프리미엄', lockId: 'recurring:preview-youtube', category: 'living', beforeCount: null, afterCount: null, monthlySavingsKrw: 14900, patternId: null, recurringId: 'preview-youtube', evidenceTransactionIds: ['plan-preview-youtube'], painScore: 0.2 },
  ],
  evidence: [
    ...[1, 2].map((index) => ({ id: `plan-preview-delivery-${index}`, amountKrw: 21000 })),
    ...[1, 2, 3, 4].map((index) => ({ id: `plan-preview-taxi-${index}`, amountKrw: 12000 })),
    ...[1, 2].map((index) => ({ id: `plan-preview-cafe-${index}`, amountKrw: 3000 })),
    { id: 'plan-preview-youtube', amountKrw: 14900 },
  ],
}

function subtag(row) {
  if (row.category === 'delivery') return 'delivery'
  if (row.category === 'transport' && row.subcategory === '택시') return 'taxi'
  if (row.category === 'cafe') return 'cafe'
  if (row.category === 'living' && row.subcategory === '편의점') return 'convenience'
  if (row.category === 'food' && row.subcategory === '주점') return 'pub'
  if (row.category === 'shopping') return 'shopping'
  return null
}

function expenseRows(snapshot) {
  const mergedAway = new Set((snapshot.duplicateGroups ?? []).filter((group) => group.decision === 'merge').flatMap((group) => group.memberIds.filter((id) => id !== group.representativeId)))
  return snapshot.transactions.filter((row) => row.included && row.direction === 'out' && row.kind === 'expense' && !mergedAway.has(row.id))
}

// 운영용 플랜 탐색기가 아니다. 기존 합성 거래로 횟수 감축 예시를 만드는 교체 가능한 목업이다.
// 마지막 업로드 월의 실제 거래만 사용하고, 정기결제 → 패턴 → 하위 태그로 근거를 한 번씩 귀속한다.
export function createMockPlanModel({ snapshot, analysis, designPreview = false }) {
  if (designPreview) return { ...S09_PREVIEW_MODEL, snapshotId: analysis.snapshotId, patterns: analysis.patterns, isDesignPreview: true }
  if (!snapshot || snapshot.id !== analysis?.snapshotId || analysis.mode !== 'demo') return null
  const rows = expenseRows(snapshot)
  const latestMonth = [...snapshot.slots].sort().at(-1)
  const categoryMonthlyKrw = {}
  for (const row of rows.filter((item) => item.slotMonth === latestMonth)) categoryMonthlyKrw[row.category] = (categoryMonthlyKrw[row.category] ?? 0) + row.amountKrw
  const remainingBudget = Object.fromEntries(Object.entries(categoryMonthlyKrw).map(([category, amount]) => [category, Math.floor(amount * 0.6)]))
  const assigned = new Set()
  const candidates = []
  const recurringLocks = []

  const reserve = (ids) => {
    const available = rows.filter((row) => ids.includes(row.id) && !assigned.has(row.id))
    available.forEach((row) => assigned.add(row.id))
    return available
  }
  const addReduction = ({ id, kind, label, lockId, patternId = null, sourceRows }) => {
    const monthlyRows = sourceRows.filter((row) => row.slotMonth === latestMonth).sort((a, b) => a.amountKrw - b.amountKrw)
    const beforeCount = monthlyRows.length
    const category = monthlyRows[0]?.category
    const maxRemoved = Math.floor(beforeCount * 0.5)
    const removed = []
    let savings = 0
    for (const row of monthlyRows) {
      if (removed.length >= maxRemoved) break
      if (savings + row.amountKrw > (remainingBudget[category] ?? 0)) continue
      if (row.category !== category) continue
      removed.push(row)
      savings += row.amountKrw
    }
    if (savings <= 0) return
    remainingBudget[category] -= savings
    candidates.push({ id, kind, label, lockId, category, beforeCount, afterCount: beforeCount - removed.length, monthlySavingsKrw: savings, patternId, recurringId: null, evidenceTransactionIds: removed.map((row) => row.id), painScore: removed.length / beforeCount })
  }

  // 명시적으로 제공된 목업 정기결제만 소비한다. 프론트에서 정기결제를 새로 탐지하지 않는다.
  for (const recurring of snapshot.slots.length >= 2 ? analysis.recurringPayments ?? [] : []) {
    const source = reserve(recurring.evidenceTransactionIds ?? [])
    const latest = [...source].sort((a, b) => b.date.localeCompare(a.date))[0]
    const lockId = `recurring:${recurring.id}`
    recurringLocks.push({ id: lockId, label: recurring.merchant, kind: 'recurring' })
    if (!latest || !Number.isFinite(recurring.monthlyAmountKrw) || new Set(source.map((row) => row.slotMonth)).size < 2 || recurring.monthlyAmountKrw > latest.amountKrw || recurring.monthlyAmountKrw <= 0 || recurring.monthlyAmountKrw > (remainingBudget[latest.category] ?? 0)) continue
    remainingBudget[latest.category] -= recurring.monthlyAmountKrw
    candidates.push({ id: `cancel-${recurring.id}`, kind: 'recurring', label: recurring.merchant, lockId, category: latest.category, beforeCount: null, afterCount: null, monthlySavingsKrw: recurring.monthlyAmountKrw, patternId: null, recurringId: recurring.id, evidenceTransactionIds: [latest.id], painScore: 0.2 })
  }
  for (const pattern of analysis.patterns) {
    const sourceRows = reserve(pattern.evidenceTransactionIds)
    const lockId = subtag(sourceRows[0] ?? {})
    if (!lockId) continue
    addReduction({ id: `cut-${pattern.id}`, kind: 'pattern', label: pattern.title, lockId, patternId: pattern.id, sourceRows })
  }
  for (const lock of PLAN_SUBTAG_LOCKS) {
    const sourceRows = reserve(rows.filter((row) => subtag(row) === lock.id).map((row) => row.id))
    addReduction({ id: `cut-subtag-${lock.id}`, kind: 'subtag', label: lock.label, lockId: lock.id, sourceRows })
  }
  return {
    mode: 'demo', snapshotId: snapshot.id, patterns: analysis.patterns, defaultLockedIds: [],
    basisLabel: `${Number(latestMonth?.slice(5))}월의 확정한 예시 거래 기준`,
    locks: [...PLAN_SUBTAG_LOCKS, ...recurringLocks], categoryMonthlyKrw, candidates,
    evidence: rows.map(({ id, amountKrw }) => ({ id, amountKrw })),
  }
}

function responseFor(model, pattern, responseStore) {
  const scope = `${model.isDesignPreview ? 'preview' : 'snapshot'}:${model.snapshotId}:${pattern.id}`
  return responseStore?.get(scope)?.draft ?? createInitialPatternResponse(pattern, { designPreview: model.isDesignPreview })
}

function eligiblePatterns(model, items, responseStore) {
  return model.patterns.filter((pattern) => {
    if (!items.some((item) => item.kind === 'pattern' && item.patternId === pattern.id) || !pattern.reminderSuggestion) return false
    const response = responseFor(model, pattern, responseStore)
    return response.response_status !== 'not_applicable' && !validatePatternResponse({ ...response, reminder: { ...response.reminder, state: 'enabled' } }, pattern)
  })
}

export function buildMockPlans({ model, requestedGoalKrw, lockedIds, responseStore, empty = false }) {
  const available = empty ? [] : model.candidates.filter((item) => !lockedIds.includes(item.lockId))
  const maxPossibleKrw = available.reduce((sum, item) => sum + item.monthlySavingsKrw, 0)
  const goalClamped = requestedGoalKrw > maxPossibleKrw
  const goalKrw = Math.max(MIN_PLAN_GOAL_KRW, Math.min(requestedGoalKrw, maxPossibleKrw))
  const unavailableReason = maxPossibleKrw < MIN_PLAN_GOAL_KRW ? '현재 기록과 잠금 조건으로는 월 1만 원 이상의 플랜을 만들 수 없어요. 잠금을 풀거나 기록을 더해 주세요.' : ''
  const recurring = available.filter((item) => item.kind === 'recurring')
  const focusItems = available.filter((item) => item.kind !== 'recurring')
  const focusOrder = [...focusItems].sort((a, b) => {
    const aLock = PLAN_SUBTAG_LOCKS.findIndex((lock) => lock.id === a.lockId)
    const bLock = PLAN_SUBTAG_LOCKS.findIndex((lock) => lock.id === b.lockId)
    return aLock - bLock
  })
  const plans = []
  const seen = new Set()
  for (const focus of focusOrder.length > 0 ? focusOrder : [null]) {
    if (unavailableReason || plans.length >= 3) break
    const items = [...(focus ? [focus] : []), ...recurring]
    for (const next of focusOrder) {
      if (items.reduce((sum, item) => sum + item.monthlySavingsKrw, 0) >= goalKrw) break
      if (next !== focus) items.push(next)
    }
    const signature = items.map((item) => item.id).sort().join('|')
    if (seen.has(signature)) continue
    seen.add(signature)
    const monthlySavingsKrw = items.reduce((sum, item) => sum + item.monthlySavingsKrw, 0)
    const reminders = eligiblePatterns(model, items, responseStore)
    const focusLabel = PLAN_SUBTAG_LOCKS.find((lock) => lock.id === focus?.lockId)?.label ?? '고정비'
    const pain = items.reduce((sum, item) => {
      const pattern = model.patterns.find((entry) => entry.id === item.patternId)
      const tagged = pattern && responseFor(model, pattern, responseStore).cause_tags.length > 0
      return sum + item.painScore * (tagged ? 0.5 : 1)
    }, 0) / Math.max(1, items.length)
    plans.push({
      id: `plan-${focus?.id ?? 'recurring'}`, label: `플랜 ${String.fromCharCode(65 + plans.length)}`, title: `${focusLabel} 중심`,
      items, monthlySavingsKrw, painLabel: pain <= 0.35 ? '여유' : pain <= 0.5 ? '보통' : '빡빡', goalMet: monthlySavingsKrw >= goalKrw,
      eligibleReminderCount: reminders.length,
      notice: reminders.length > 0
        ? model.isDesignPreview
          ? '목요일 밤 배달은 따로 계산했어요. 선택하면 해당 패턴의 demo 알림이 켜져요. 구독 해지는 행동 체크만 남겨요.'
          : `${reminders.map((pattern) => pattern.title).join(' · ')}은 따로 계산했어요. 선택하면 해당 패턴의 demo 알림이 켜져요. 구독 해지는 행동 체크만 남겨요.`
        : '감축 항목은 한 번씩만 계산했어요. 요일·시각 근거가 없는 항목에는 알림을 만들지 않고, 구독 해지는 행동 체크만 남겨요.',
    })
  }
  return { mode: 'demo', snapshotId: model.snapshotId, goalKrw, requestedGoalKrw, maxPossibleKrw, goalClamped, plans, unavailableReason, basisLabel: model.basisLabel }
}

function planError(message) { return new Error(message) }
function initialEntry(model) {
  return { goalKrw: DEFAULT_PLAN_GOAL_KRW, requestedGoalKrw: DEFAULT_PLAN_GOAL_KRW, sliderMaxKrw: MAX_PLAN_GOAL_KRW, hasClamped: false, lockedIds: [...model.defaultLockedIds], response: null, selectedPlanId: null, selectedPlan: null, loading: false, error: '', choosing: false, choiceError: '', requestId: 0 }
}

// 실제 플랜·알림 API 계약 대신 Provider 안에서만 사용하는 합성 응답 저장소다.
export function createSavingsPlanStore({ responseStore }) {
  const entries = new Map()
  const models = new Map()
  const listeners = new Set()
  const failures = new Set()
  const choices = new Map()
  let activeSnapshotId = null
  let selectedPlan = null
  const emit = () => listeners.forEach((listener) => listener())
  const replace = (key, entry) => { entries.set(key, entry); emit() }
  const active = (key) => key.startsWith('preview:') || key === `snapshot:${activeSnapshotId}`
  const failOnce = (key, scenario) => {
    const failureKey = `${key}:${scenario}`
    if (failures.has(failureKey)) return false
    failures.add(failureKey)
    return true
  }
  const store = {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    get(key) { return entries.get(key) },
    getSelectedPlan() { return selectedPlan },
    setActionChecked(id, checked) {
      if (!selectedPlan || !active(selectedPlan.scope)) return
      selectedPlan = { ...selectedPlan, actionChecks: selectedPlan.actionChecks.map((item) => item.id === id ? { ...item, state: checked ? 'done' : 'todo' } : item) }
      const entry = entries.get(selectedPlan.scope)
      if (entry) replace(selectedPlan.scope, { ...entry, selectedPlan })
    },
    setSnapshot(snapshotId) {
      activeSnapshotId = snapshotId
      if (selectedPlan?.scope.startsWith('snapshot:') && selectedPlan.snapshotId !== snapshotId) { selectedPlan = null; emit() }
    },
    async load(key, model, { scenario = null } = {}) {
      models.set(key, model)
      const current = entries.get(key) ?? initialEntry(model)
      const requestId = current.requestId + 1
      replace(key, { ...current, loading: true, error: '', choiceError: '', requestId })
      await new Promise((resolve) => setTimeout(resolve, 120))
      if (entries.get(key)?.requestId !== requestId || !active(key)) return false
      if (scenario === 'error' && failOnce(key, scenario)) {
        replace(key, { ...entries.get(key), loading: false, error: '데모 플랜을 불러오지 못했어요. 다시 시도해 주세요.' })
        return false
      }
      const response = buildMockPlans({ model, requestedGoalKrw: current.requestedGoalKrw, lockedIds: current.lockedIds, responseStore, empty: scenario === 'empty' })
      const latest = entries.get(key)
      const selectedPlanId = response.plans.some((plan) => plan.id === latest.selectedPlanId) ? latest.selectedPlanId : response.plans[0]?.id ?? null
      replace(key, { ...latest, response, goalKrw: response.goalKrw, hasClamped: latest.hasClamped || response.goalClamped, sliderMaxKrw: latest.hasClamped || response.goalClamped ? Math.max(MIN_PLAN_GOAL_KRW, Math.min(MAX_PLAN_GOAL_KRW, response.maxPossibleKrw)) : MAX_PLAN_GOAL_KRW, selectedPlanId, loading: false, error: '' })
      return true
    },
    setGoal(key, value, options) {
      const model = models.get(key)
      const entry = entries.get(key)
      if (!model || !entry || !Number.isFinite(Number(value))) return
      const goal = Math.max(MIN_PLAN_GOAL_KRW, Math.min(MAX_PLAN_GOAL_KRW, Math.round(Number(value))))
      replace(key, { ...entry, goalKrw: goal, requestedGoalKrw: goal, choiceError: '' })
      store.load(key, model, options)
    },
    toggleLock(key, lockId, options) {
      const model = models.get(key)
      const entry = entries.get(key)
      if (!model?.locks.some((lock) => lock.id === lockId) || !entry) return
      const lockedIds = entry.lockedIds.includes(lockId) ? entry.lockedIds.filter((id) => id !== lockId) : [...entry.lockedIds, lockId]
      replace(key, { ...entry, lockedIds, choiceError: '' })
      store.load(key, model, options)
    },
    selectPlan(key, id) {
      const entry = entries.get(key)
      if (entry?.loading || entry?.choosing || !entry?.response?.plans.some((plan) => plan.id === id)) return
      replace(key, { ...entry, selectedPlanId: id, choiceError: '' })
    },
    confirmSelection(key, { scenario = null } = {}) {
      if (choices.has(key)) return choices.get(key)
      const entry = entries.get(key)
      const model = models.get(key)
      const plan = entry?.response?.plans.find((item) => item.id === entry.selectedPlanId)
      if (!entry || !model || !plan || entry.loading || !active(key) || !plan.goalMet) return Promise.resolve(false)
      const signature = `${plan.id}:${entry.goalKrw}:${[...entry.lockedIds].sort().join(',')}:${plan.items.map((item) => item.id).sort().join(',')}`
      if (entry.selectedPlan?.signature === signature) return Promise.resolve(true)
      replace(key, { ...entry, choosing: true, choiceError: '' })
      const task = (async () => {
        await new Promise((resolve) => setTimeout(resolve, 120))
        const latest = entries.get(key)
        if (!active(key) || latest.requestId !== entry.requestId || latest.selectedPlanId !== entry.selectedPlanId || latest.loading) throw planError('목표나 잠금 조건이 바뀌었어요. 플랜을 다시 확인해 주세요.')
        if (scenario === 'choice-error' && failOnce(key, scenario)) throw planError('데모 플랜 선택을 저장하지 못했어요. 다시 시도해 주세요.')
        const reminders = eligiblePatterns(model, plan.items, responseStore)
        const reminderPatternIds = responseStore.enableFromPlan({ snapshotId: model.snapshotId, patterns: reminders, designPreview: model.isDesignPreview, planId: plan.id })
        const selection = {
          mode: 'demo', scope: key, snapshotId: model.snapshotId, signature, goalKrw: entry.goalKrw, lockedIds: [...entry.lockedIds], plan,
          reminderPatternIds,
          actionChecks: plan.items.filter((item) => item.kind === 'recurring').map((item) => ({ id: item.recurringId, label: `${item.label} 해지 확인`, state: 'todo', kind: 'recurring' })),
        }
        selectedPlan = selection
        replace(key, { ...latest, selectedPlan: selection, choosing: false, choiceError: '' })
        return true
      })().catch((error) => { replace(key, { ...entries.get(key), choosing: false, choiceError: error.message }); return false }).finally(() => choices.delete(key))
      choices.set(key, task)
      return task
    },
  }
  return store
}
