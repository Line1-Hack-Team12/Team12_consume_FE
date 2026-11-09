export const MIN_PLAN_GOAL_KRW = 10000
export const MAX_PLAN_GOAL_KRW = 500000
export const DEFAULT_PLAN_GOAL_KRW = 50000
export const PLAN_GOAL_KEYBOARD_STEP_KRW = 10000

// F17 하위 태그 잠금. 정기결제 잠금은 제공된 분석 항목별로 추가한다.
export const PLAN_SUBTAG_LOCKS = [
  { id: 'delivery', label: '배달', kind: 'subtag' },
  { id: 'taxi', label: '택시', kind: 'subtag' },
  { id: 'cafe', label: '카페', kind: 'subtag' },
  { id: 'convenience', label: '편의점', kind: 'subtag' },
  { id: 'pub', label: '주점', kind: 'subtag' },
  { id: 'shopping', label: '쇼핑', kind: 'subtag' },
]
