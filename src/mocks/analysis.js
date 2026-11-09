import { CATEGORIES } from '../constants/limits'
import { formatKRW } from '../utils/format'
import { addMonths, formatShortMonth, formatSlotRange } from '../utils/months'

// S05 데모 전용 결과 어댑터다. 실제 분석·설명 API 계약이 정해지면 서버 결과로 교체한다.
// 아래 샘플 선택은 화면 시연을 위한 예시이며 운영용 탐지·근거 등급 규칙이 아니다.
// 비·연쇄 지출은 연결된 근거가 없으므로 만들어내지 않는다.
const EXAMPLES = [
  {
    key: 'night-delivery',
    title: '늦은 밤의 배달',
    icon: 'moon',
    iconTone: 'brand',
    select: (row) => row.category === 'delivery' && row.time && row.time >= '21:00',
    question: '늦은 시간에 배달을 주문한 날, 보통 어떤 일이 있었나요?',
    action: '다음 주문 전에는 냉장고를 한 번 확인해 보세요.',
    friendQuestion: '늦게 배달을 주문한 날엔 보통 무슨 일이 있었어?',
    friendAction: '다음 주문 전엔 냉장고를 한 번 확인해 보자.',
    grandmaQuestion: '늦은 시간에 배달시킨 날에는 무슨 일이 있었니?',
    grandmaAction: '다음에 주문하기 전에는 냉장고부터 한번 열어보렴.',
    recommendedTags: ['overtime', 'stress', 'habit'],
  },
  {
    key: 'taxi',
    title: '반복되는 택시 이용',
    icon: 'sparkle',
    iconTone: 'coral',
    select: (row) => row.category === 'transport' && row.subcategory === '택시',
    question: '택시를 이용한 날에는 어떤 사정이 있었나요?',
    action: '다음 이동 전에 대중교통 경로를 한 번 확인해 보세요.',
    friendQuestion: '택시를 탄 날에는 어떤 일이 있었어?',
    friendAction: '다음에 이동할 땐 대중교통 경로부터 한번 보자.',
    grandmaQuestion: '택시를 탔던 날에는 어떤 사정이 있었니?',
    grandmaAction: '다음에는 대중교통으로 갈 수 있는지 한번 보렴.',
    recommendedTags: ['stress', 'habit', 'no_specific_reason'],
  },
  {
    key: 'weekend-cafe',
    title: '주말의 카페',
    icon: 'sparkle',
    iconTone: 'success',
    select: (row) => {
      if (row.category !== 'cafe') return false
      const weekday = new Date(`${row.date}T00:00:00Z`).getUTCDay()
      return weekday === 0 || weekday === 6
    },
    question: '주말에 카페를 찾을 때는 보통 어떤 계획이 있나요?',
    action: '다음 주말에는 카페 방문 횟수를 한 번 정해 보세요.',
    friendQuestion: '주말에 카페를 갈 땐 보통 어떤 계획이 있어?',
    friendAction: '다음 주말엔 카페에 몇 번 갈지 한번 정해 보자.',
    grandmaQuestion: '주말에 카페 갈 때는 보통 무슨 계획이 있니?',
    grandmaAction: '다음 주말에는 카페에 몇 번 갈지 정해 보렴.',
    recommendedTags: ['habit', 'stress', 'no_specific_reason'],
  },
]

function includedExpenses(snapshot) {
  const merged = new Set()
  for (const group of snapshot.duplicateGroups ?? []) {
    if (group.decision !== 'merge') continue
    for (const id of group.memberIds) {
      if (id !== group.representativeId) merged.add(id)
    }
  }
  return snapshot.transactions.filter(
    (row) => row.included && !merged.has(row.id) && row.direction === 'out' && row.kind === 'expense',
  )
}

function topCategories(rows, totalKrw) {
  const sums = new Map()
  for (const row of rows) sums.set(row.category, (sums.get(row.category) ?? 0) + row.amountKrw)
  return [...sums.entries()]
    .map(([category, amountKrw]) => ({
      category,
      label: CATEGORIES.find((item) => item.value === category)?.label ?? '기타',
      amountKrw,
      sharePercent: totalKrw > 0 ? Math.round((amountKrw / totalKrw) * 100) : 0,
    }))
    .sort((a, b) => b.amountKrw - a.amountKrw)
    .slice(0, 2)
}

function monthComparison(rows, slots) {
  if (slots.length < 2) return null
  const month = slots[slots.length - 1]
  const previous = slots[slots.length - 2]
  // 업로드하지 않은 달을 0원으로 간주하거나 건너뛰어 전월 대비로 표시하지 않는다.
  if (addMonths(previous, 1) !== month) return null
  const sumFor = (slot) => rows.filter((row) => row.slotMonth === slot).reduce((sum, row) => sum + row.amountKrw, 0)
  const previousSum = sumFor(previous)
  if (previousSum <= 0) return null
  return { month, changePercent: Math.round(((sumFor(month) - previousSum) / previousSum) * 100) }
}

function summaryCopy(categories, comparison) {
  const first = categories[0]
  if (!first) {
    return {
      coach: '확정한 기록의 지출 요약을 확인해 보세요.',
      friend: '확정한 기록의 지출을 함께 살펴보자.',
      grandma: '확정한 지출 기록부터 차근차근 보자꾸나.',
    }
  }
  const fact = `${first.label} 지출 비중이 ${first.sharePercent}%로 가장 커요.`
  if (!comparison) {
    return {
      coach: fact,
      friend: `${first.label}에 ${first.sharePercent}%로 가장 많이 썼네.`,
      grandma: `${first.label}에 ${first.sharePercent}%로 가장 많이 썼구나.`,
    }
  }
  const change = comparison.changePercent
  const month = formatShortMonth(comparison.month)
  const direction = change > 0 ? '늘었어요' : change < 0 ? '줄었어요' : '같아요'
  const changeFact = change === 0 ? `${month} 지출은 전월과 ${direction}.` : `${month} 지출은 전월보다 ${Math.abs(change)}% ${direction}.`
  return {
    coach: changeFact,
    friend: change === 0 ? `${month}에는 전월과 같은 금액을 썼네.` : `${month}에는 전월보다 ${Math.abs(change)}% ${change > 0 ? '더 썼네' : '덜 썼네'}.`,
    grandma: change === 0 ? `${month}에도 전월만큼 썼구나.` : `${month} 지출이 전월보다 ${Math.abs(change)}% ${change > 0 ? '늘었구나' : '줄었구나'}.`,
  }
}

function examplePattern(example, rows, snapshotId, slots) {
  const evidence = rows.filter(example.select)
  if (evidence.length === 0) return null
  const observedDays = new Set(evidence.map((row) => row.date)).size
  const sumKrw = evidence.reduce((sum, row) => sum + row.amountKrw, 0)
  const observation = `서로 다른 ${observedDays}일 관찰`
  const monthlyAmountKrw = Math.round(sumKrw / Math.max(1, slots.length))
  return {
    id: `${snapshotId}_${example.key}`,
    title: example.title,
    observation,
    amountLabel: '월 환산',
    monthlyAmountKrw,
    basis: `${formatSlotRange(slots)} 합계 ÷ 채워진 ${slots.length}개월`,
    evidenceGrade: 'normal',
    icon: example.icon,
    iconTone: example.iconTone,
    evidenceTransactionIds: evidence.map((row) => row.id),
    observedDays,
    sumKrw,
    chainedSumKrw: 0,
    directMonthlyKrw: monthlyAmountKrw,
    chainedMonthlyKrw: 0,
    directDescription: `직접 지출 ${evidence.length}건`,
    chainedDescription: '연결된 후속 지출 근거 없음',
    totalBasis: `${formatSlotRange(slots)} 합계 ${formatKRW(sumKrw)} ÷ ${slots.length}개월`,
    associationNote: '함께 관찰된 지출이 원인 관계를 뜻하지는 않아요.',
    evidence: evidence.map(({ id, date, time, merchant, amountKrw }) => ({ id, date, time, merchant, amountKrw })),
    recommendedTags: example.recommendedTags,
    reminderSuggestion: null,
    copyByTone: {
      coach: { observation, hypothesisQuestion: example.question, action: example.action },
      friend: { observation: `서로 다른 ${observedDays}일에 보였어`, hypothesisQuestion: example.friendQuestion, action: example.friendAction },
      grandma: { observation: `서로 다른 ${observedDays}일에 보였구나`, hypothesisQuestion: example.grandmaQuestion, action: example.grandmaAction },
    },
  }
}

/** 확정 snapshot만 사용하는 합성 데모 응답. 실제 API의 응답 형식을 확정하는 계약이 아니다. */
export function createMockAnalysis(snapshot, { scenario = null } = {}) {
  const rows = includedExpenses(snapshot)
  const slots = [...snapshot.slots].sort()
  const categories = topCategories(rows, snapshot.summary.expenseSum)
  const comparison = monthComparison(rows, slots)
  const candidates = scenario === 'empty' ? [] : EXAMPLES.map((example) => examplePattern(example, rows, snapshot.id, slots)).filter(Boolean)
  const patterns = candidates.filter((item) => item.observedDays >= 2).sort((a, b) => b.monthlyAmountKrw - a.monthlyAmountKrw)

  return {
    mode: 'demo',
    snapshotId: snapshot.id,
    slots,
    periodLabel: `업로드한 ${formatSlotRange(slots)} 기록 기준`,
    expenseCount: snapshot.summary.expenseCount,
    totalKrw: snapshot.summary.expenseSum,
    topCategories: categories,
    monthComparison: comparison,
    summaryByTone: summaryCopy(categories, comparison),
    patterns,
    lockedPatterns: candidates.filter((item) => item.observedDays === 1),
    emptyReason: patterns.length === 0 ? 'NO_SUPPORTED_PATTERN' : null,
  }
}
