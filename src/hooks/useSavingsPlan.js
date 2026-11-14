import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { DEFAULT_PLAN_GOAL_KRW, MAX_PLAN_GOAL_KRW, MIN_PLAN_GOAL_KRW } from '../constants/plans'
import { createMockPlanModel } from '../mocks/plans'
import useServerSavingsPlan from './useServerSavingsPlan'
import { useAnalysisSession } from './analysisSessionContext'

export default function useSavingsPlan({ result, designPreview = false }) {
  const { snapshot, analysis, savingsPlanStore: store } = useAnalysisSession()
  const server = useServerSavingsPlan({ enabled: result?.mode === 'server', sessionId: snapshot?.sessionId, result })
  const preview = import.meta.env.DEV && designPreview
  const valid = Boolean(result && (preview || (snapshot?.id === result.snapshotId && analysis?.snapshotId === result.snapshotId)))
  const model = useMemo(() => valid ? createMockPlanModel({ snapshot, analysis: result, designPreview: preview }) : null, [valid, snapshot, result, preview])
  const key = model ? `${preview ? 'preview' : 'snapshot'}:${result.snapshotId}` : null
  const scenario = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('planDemo') : null
  const empty = useMemo(() => ({ goalKrw: DEFAULT_PLAN_GOAL_KRW, requestedGoalKrw: DEFAULT_PLAN_GOAL_KRW, sliderMaxKrw: MAX_PLAN_GOAL_KRW, lockedIds: model?.defaultLockedIds ?? [], response: null, selectedPlanId: null, selectedPlan: null, loading: Boolean(model), error: '', choosing: false, choiceError: '' }), [model])
  const getSnapshot = useCallback(() => key ? store.get(key) ?? empty : empty, [store, key, empty])
  const entry = useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    if (key && model) store.load(key, model, { scenario })
  }, [store, key, model, scenario])

  const refresh = useCallback(() => key && model ? store.load(key, model, { scenario }) : Promise.resolve(false), [store, key, model, scenario])
  const response = entry.response
  const plans = response?.plans ?? []
  const selectedDraft = plans.find((plan) => plan.id === entry.selectedPlanId)
  const maxPossibleKrw = response?.maxPossibleKrw ?? 0
  const impossibleExampleReason = maxPossibleKrw >= MAX_PLAN_GOAL_KRW ? '월 50만 원 범위에서는 달성 불가 예시가 없어요.' : ''

  if (result?.mode === 'server') return server

  return {
    goalKrw: entry.goalKrw,
    requestedGoalKrw: entry.requestedGoalKrw,
    sliderMaxKrw: entry.sliderMaxKrw,
    maxPossibleKrw,
    goalClamped: response?.goalClamped ?? false,
    locks: (model?.locks ?? []).map((lock) => ({ ...lock, locked: entry.lockedIds.includes(lock.id) })),
    plans,
    selectedPlanId: entry.selectedPlanId,
    selectedPlan: entry.selectedPlan,
    notice: selectedDraft?.notice ?? '',
    eligibleReminderCount: selectedDraft?.eligibleReminderCount ?? 0,
    basisLabel: response?.basisLabel ?? model?.basisLabel ?? '',
    loading: entry.loading,
    error: entry.error,
    choosing: entry.choosing,
    choiceError: entry.choiceError,
    unavailableReason: !model ? '확정한 분석 결과가 있어야 데모 플랜을 만들 수 있어요.' : response?.unavailableReason ?? '',
    impossibleExampleReason,
    impossibleExampleDisabled: entry.loading || entry.choosing || Boolean(impossibleExampleReason),
    setGoal(value) { if (key) store.setGoal(key, value, { scenario }) },
    toggleLock(id) { if (key) store.toggleLock(key, id, { scenario }) },
    selectPlan(id) { if (key) store.selectPlan(key, id) },
    confirmSelection() { return key ? store.confirmSelection(key, { scenario }) : Promise.resolve(false) },
    retry: refresh,
    showImpossibleExample() {
      if (!key || impossibleExampleReason) return false
      store.setGoal(key, Math.min(MAX_PLAN_GOAL_KRW, Math.max(MIN_PLAN_GOAL_KRW, maxPossibleKrw + MIN_PLAN_GOAL_KRW)), { scenario })
      return true
    },
  }
}
