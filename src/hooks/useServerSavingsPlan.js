import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { selectSavingsPlan } from '../api/analysis'
import { invalidateSessionQueries, savingsPlansQuery } from '../api/sessionQueries'
import { MAX_PLAN_GOAL_KRW, MIN_PLAN_GOAL_KRW, PLAN_SUBTAG_LOCKS } from '../constants/plans'
import { useAnalysisSession } from './analysisSessionContext'

export default function useServerSavingsPlan({ enabled, sessionId, result }) {
  const { setServerPlanSelection } = useAnalysisSession()
  const [goal, setGoal] = useState(50000)
  const [locked, setLocked] = useState([])
  const [selected, setSelected] = useState(null)
  const client = useQueryClient()
  const selectionLock = useRef(false)
  const snapshotId = result?.snapshotId
  const options = savingsPlansQuery(sessionId, snapshotId, goal, locked)
  const inputKey = JSON.stringify(options.queryKey)
  const [settledKey, setSettledKey] = useState(null)
  useEffect(() => {
    const timer = setTimeout(() => setSettledKey(inputKey), 150)
    return () => clearTimeout(timer)
  }, [inputKey])
  const query = useQuery({ ...options, enabled: enabled && sessionId != null && snapshotId != null && settledKey === inputKey })
  const selection = useMutation({
    mutationFn: (plan) => selectSavingsPlan(sessionId, plan, goal),
    retry: false,
    onSuccess: async (_response, plan) => {
      setServerPlanSelection({ sessionId, snapshotId, goalKrw: goal, plan })
      await invalidateSessionQueries(client, sessionId, snapshotId, ['notifications', 'completion'])
    },
  })
  const current = query.data
  const loading = enabled && (settledKey !== inputKey || query.isPending || query.isFetching)
  const error = query.error?.message ?? ''
  const choosing = selection.isPending
  const selectedPlanId = selected?.key === inputKey ? selected.id : null
  const plans = (current?.plans ?? []).map((p) => ({ id: p.planCode, title: p.title, label: p.planCode.replace('PLAN_', '플랜 '), goalMet: p.isGoalAchieved, monthlySavingsKrw: p.monthlyTotalSaved,
    items: (p.items ?? []).map((item, i) => ({ id: `${p.planCode}-${i}`, kind: item.isSubscription ? 'recurring' : 'subtag', label: item.title, description: item.subDescription, monthlySavingsKrw: item.savedAmount })), eligibleReminderCount: 0 }))
  const locks = PLAN_SUBTAG_LOCKS.map((l) => ({ ...l, id: l.label, supported: current?.availableExcludeCategories?.includes(l.label), locked: locked.includes(l.label) }))
  const recurringLocks = (result?.report?.recurring?.items ?? []).map((item) => ({ id: `recurring:${item.id}`, label: item.label, supported: false, locked: false }))
  return { goalKrw: goal, requestedGoalKrw: goal, sliderMaxKrw: Math.max(goal, current?.maxTargetAmount ?? MAX_PLAN_GOAL_KRW), maxPossibleKrw: current?.maxPossibleKrw ?? null,
    locks: [...locks, ...recurringLocks], plans, selectedPlanId, loading: loading && !error, error, choosing, choiceError: selection.error?.message ?? '', notice: current?.guideNotice ?? '',
    eligibleReminderCount: 0, basisLabel: '확정한 기록 기준', unavailableReason: '서버에서 선택 가능한 플랜을 아직 제공하지 않았어요.', impossibleExampleDisabled: true,
    setGoal(value) {
      if (!Number.isFinite(value)) return
      setGoal(Math.max(MIN_PLAN_GOAL_KRW, Math.min(MAX_PLAN_GOAL_KRW, Math.round(value))))
      setSelected(null); selection.reset()
    },
    toggleLock(id) { if (locks.some((l) => l.id === id && l.supported)) { setLocked((old) => old.includes(id) ? old.filter((x) => x !== id) : [...old, id]); setSelected(null); selection.reset() } },
    selectPlan(id) { setSelected({ id, key: inputKey }); selection.reset() },
    async confirmSelection() {
      const plan = plans.find((p) => p.id === selectedPlanId)
      if (!plan || selectionLock.current || choosing || loading || error) return false
      selectionLock.current = true
      try { await selection.mutateAsync(plan); return true }
      catch { return false }
      finally { selectionLock.current = false }
    },
    retry: query.refetch,
  }
}
