import { useEffect, useRef, useState } from 'react'
import { getSavingsPlans, selectSavingsPlan } from '../api/analysis'
import { PLAN_SUBTAG_LOCKS } from '../constants/plans'

export default function useServerSavingsPlan({ enabled, sessionId, result }) {
  const [goal, setGoal] = useState(50000)
  const [locked, setLocked] = useState([])
  const [selected, setSelected] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [choosing, setChoosing] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const requestId = useRef(0)
  useEffect(() => {
    if (!enabled || !sessionId) return
    const id = ++requestId.current
    let active = true
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const response = await getSavingsPlans(sessionId, goal, locked)
        if (active && requestId.current === id) setData({ ...response, sessionId, queryKey: JSON.stringify([sessionId, goal, locked]) })
      } catch (err) { if (active) setError(err.message) }
      finally { if (active) setLoading(false) }
    }, 150)
    return () => { active = false; clearTimeout(timer) }
  }, [enabled, sessionId, goal, locked, refresh])
  const current = data?.queryKey === JSON.stringify([sessionId, goal, locked]) ? data : null
  const plans = (current?.plans ?? []).map((p) => ({ id: p.planCode, title: p.title, label: p.planCode.replace('PLAN_', '플랜 '), goalMet: p.isGoalAchieved, monthlySavingsKrw: p.monthlyTotalSaved,
    items: (p.items ?? []).map((item, i) => ({ id: `${p.planCode}-${i}`, kind: item.isSubscription ? 'recurring' : 'subtag', label: item.title, description: item.subDescription, monthlySavingsKrw: item.savedAmount })), eligibleReminderCount: 0 }))
  const locks = PLAN_SUBTAG_LOCKS.map((l) => ({ ...l, id: l.label, supported: current?.availableExcludeCategories?.includes(l.label), locked: locked.includes(l.label) }))
  const recurringLocks = (result?.report?.recurring?.items ?? []).map((item) => ({ id: `recurring:${item.id}`, label: item.label, supported: false, locked: false }))
  return { goalKrw: goal, requestedGoalKrw: goal, sliderMaxKrw: current?.maxTargetAmount ?? 500000, maxPossibleKrw: current?.maxPossibleKrw ?? null, goalClamped: false,
    locks: [...locks, ...recurringLocks], plans, selectedPlanId: selected, loading: loading || (enabled && !current && !error), error, choosing, choiceError: '', notice: current?.guideNotice ?? '',
    eligibleReminderCount: 0, basisLabel: '확정한 기록 기준', unavailableReason: '서버에서 선택 가능한 플랜을 아직 제공하지 않았어요.', impossibleExampleDisabled: true,
    setGoal(value) { setGoal(value); setSelected(null); setLoading(true) },
    toggleLock(id) { if (locks.some((l) => l.id === id && l.supported)) { setLocked((old) => old.includes(id) ? old.filter((x) => x !== id) : [...old, id]); setSelected(null); setLoading(true) } },
    selectPlan: setSelected,
    async confirmSelection() {
      const plan = plans.find((p) => p.id === selected)
      if (!plan || choosing || loading || error) return false
      setChoosing(true)
      try { await selectSavingsPlan(sessionId, plan, goal); return true }
      catch (err) { setError(err.message); return false }
      finally { setChoosing(false) }
    },
    retry() { setRefresh((n) => n + 1) },
  }
}
