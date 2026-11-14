import { CATEGORIES } from '../constants/limits'
import { formatKRW } from '../utils/format'
import { formatSlotRange } from '../utils/months'

const TONES = ['coach', 'friend', 'grandma']

function categoryBreakdown(rows, totalKrw) {
  const totals = new Map()
  for (const row of rows) {
    const category = CATEGORIES.some((item) => item.value === row.category) ? row.category : 'other'
    totals.set(category, (totals.get(category) ?? 0) + row.amountKrw)
  }
  return [...totals.entries()].map(([category, amountKrw]) => ({
    category,
    label: CATEGORIES.find((item) => item.value === category).label,
    amountKrw,
    sharePercent: totalKrw > 0 ? Math.round((amountKrw / totalKrw) * 100) : 0,
  })).sort((a, b) => b.amountKrw - a.amountKrw)
}

function reportSummary(categories, patterns) {
  const first = categories[0]
  if (!first) return {
    coach: '확정한 기록의 지출 요약을 확인해 보세요.',
    friend: '확정한 기록의 지출을 같이 살펴보자.',
    grandma: '확정한 지출 기록부터 차근차근 보자꾸나.',
  }
  const count = patterns.length
  return {
    coach: `${first.label} 지출 비중이 ${first.sharePercent}%로 가장 커요. ${count > 0 ? `반복 지출 습관 ${count}개가 관찰됐어요.` : '반복 근거가 충분한 습관은 아직 없어요.'}`,
    friend: `${first.label}에 ${first.sharePercent}%로 가장 많이 썼네. ${count > 0 ? `반복 지출 습관 ${count}개가 보였어.` : '반복 근거가 충분한 습관은 아직 없어.'}`,
    grandma: `${first.label}에 ${first.sharePercent}%로 가장 많이 썼구나. ${count > 0 ? `반복 지출 습관 ${count}개가 보였구나.` : '반복 근거가 충분한 습관은 아직 없구나.'}`,
  }
}

function observationsFor(patterns) {
  return patterns.slice(0, 3).map((pattern) => ({
    id: `report-${pattern.id}`,
    patternId: pattern.id,
    icon: pattern.icon,
    copyByTone: Object.fromEntries(TONES.map((tone) => {
      const copy = pattern.copyByTone?.[tone] ?? pattern.copyByTone?.coach
      return [tone, { observation: `${pattern.title} · ${copy?.observation ?? pattern.observation}`, action: copy?.action ?? '' }]
    })),
  }))
}

function recurringFor(analysis, rows, slots) {
  if (slots.length < 2) return null
  if (!Array.isArray(analysis.recurringPayments)) return { status: 'unavailable', items: [], monthlyTotalKrw: null, annualizedTotalKrw: null }
  const byId = new Map(rows.map((row) => [row.id, row]))
  const items = analysis.recurringPayments.flatMap((recurring) => {
    const ids = [...new Set(recurring.evidenceTransactionIds ?? [])]
    const evidence = ids.map((id) => byId.get(id)).filter(Boolean).sort((a, b) => `${a.date}${a.time ?? ''}`.localeCompare(`${b.date}${b.time ?? ''}`))
    if (ids.length !== evidence.length || new Set(evidence.map((row) => row.slotMonth)).size < 2) return []
    const latest = evidence.at(-1)
    if (!recurring.id || !recurring.merchant || !Number.isFinite(recurring.monthlyAmountKrw) || recurring.monthlyAmountKrw <= 0 || recurring.monthlyAmountKrw !== latest.amountKrw) return []
    const increased = recurring.status === 'price_increased' || recurring.priceIncreased === true || recurring.price_increased === true
    const amounts = evidence.map((row) => row.amountKrw)
    // 금액 차이는 후보 자격과 무관하다. 명시 인상 결과가 없으면 10% 범위일 때만 같은 요금제로 표시한다.
    const samePlan = Math.max(...amounts) <= Math.min(...amounts) * 1.1
    return [{
      id: recurring.id,
      label: recurring.merchant,
      monthlyAmountKrw: recurring.monthlyAmountKrw,
      status: increased ? 'price_increased' : samePlan ? 'same_plan' : null,
      historyLabel: evidence.slice(-3).map((row) => formatKRW(row.amountKrw)).join(' → '),
    }]
  })
  if (analysis.recurringPayments.length > 0 && items.length === 0) return { status: 'unavailable', items: [], monthlyTotalKrw: null, annualizedTotalKrw: null }
  const monthlyTotalKrw = items.reduce((sum, item) => sum + item.monthlyAmountKrw, 0)
  return { status: 'ready', items, monthlyTotalKrw, annualizedTotalKrw: monthlyTotalKrw * 12 }
}

// 확정 snapshot으로 만드는 교체 가능한 리포트 목업이다. 운영용 집계·정기결제 탐지 API가 아니다.
// rows는 createMockAnalysis의 포함 지출·중복 판정 결과를 그대로 받아 화면에서 재집계하지 않는다.
export function createMockReport({ snapshot, analysis, rows }) {
  const slots = [...analysis.slots].sort()
  const categories = categoryBreakdown(rows, analysis.totalKrw)
  const missingTimeCount = rows.filter((row) => !row.time).length
  const recurring = recurringFor(analysis, rows, slots)
  const partialRecurring = recurring?.status === 'ready' && recurring.items.length < (analysis.recurringPayments?.length ?? 0)
  return {
    periodLabel: `${formatSlotRange(slots)} 업로드 기록`,
    totalKrw: analysis.totalKrw,
    summaryByTone: reportSummary(categories, analysis.patterns),
    categories,
    months: slots.map((month) => ({ month, amountKrw: rows.filter((row) => row.slotMonth === month).reduce((sum, row) => sum + row.amountKrw, 0) })),
    monthComparison: analysis.monthComparison,
    observations: observationsFor(analysis.patterns),
    recurring,
    limitations: [
      '업로드 없는 날은 0원으로 추정하지 않아요.',
      missingTimeCount > 0 ? `시각 미상 ${missingTimeCount}건은 시간 분석에서 제외됐어요.` : '시각 미상 거래는 없어요.',
      '날씨 자료가 연결되지 않아 날씨 비교는 생략했어요.',
      ...(partialRecurring ? ['일부 정기결제 자료는 근거를 확인할 수 없어 제외했어요.'] : []),
      ...(snapshot.summary.expenseSum !== analysis.totalKrw ? ['리포트와 확정 기록의 합계가 달라 다시 확인이 필요해요.'] : []),
    ],
  }
}

// Figma S08 전용 합성 예시다. 현재 파일·snapshot·정기결제 탐지 결과로 사용하지 않는다.
export const S08_PREVIEW_REPORT = {
  periodLabel: '8~10월 업로드 기록',
  totalKrw: 1243500,
  summaryByTone: {
    coach: '소비가 배달과 교통에 집중됐어요.',
    friend: '배달과 교통에 소비가 몰렸네.',
    grandma: '배달과 교통에 소비가 몰렸구나.',
  },
  categories: [
    { category: 'delivery', label: '배달', amountKrw: 385485, sharePercent: 31 },
    { category: 'transport', label: '교통', amountKrw: 223830, sharePercent: 18 },
    { category: 'food', label: '식비', amountKrw: 198960, sharePercent: 16 },
    { category: 'cafe', label: '카페', amountKrw: 161655, sharePercent: 13 },
    { category: 'shopping', label: '쇼핑', amountKrw: 124350, sharePercent: 10 },
    { category: 'living', label: '생활', amountKrw: 87045, sharePercent: 7 },
    { category: 'other', label: '기타', amountKrw: 62175, sharePercent: 5 },
  ],
  months: [
    { month: '2026-08', amountKrw: 350000 },
    { month: '2026-09', amountKrw: 421462 },
    { month: '2026-10', amountKrw: 472038 },
  ],
  monthComparison: { month: '2026-10', changePercent: 12 },
  observations: [{
    id: 'report-preview-night-delivery',
    patternId: 'preview-night-delivery',
    icon: 'moon',
    copyByTone: {
      coach: { observation: '목요일 밤 배달이 반복됐어요.', action: '주문 전에 냉장고를 확인해 보세요.' },
      friend: { observation: '목요일 밤에 배달이 반복됐네.', action: '주문 전에 냉장고를 확인해 보자.' },
      grandma: { observation: '목요일 밤에 배달이 반복됐구나.', action: '주문 전에 냉장고부터 확인해 보렴.' },
    },
  }],
  recurring: {
    status: 'ready',
    items: [
      { id: 'preview-youtube', label: '유튜브 프리미엄', monthlyAmountKrw: 14900, status: 'price_increased', historyLabel: '10,450 → 14,900 → 14,900원' },
      { id: 'preview-other-recurring', label: '다른 구독', monthlyAmountKrw: 9900, status: 'same_plan', historyLabel: '같은 요금 유지' },
    ],
    monthlyTotalKrw: 24800,
    annualizedTotalKrw: 297600,
  },
  limitations: [
    '업로드 없는 날은 0원으로 추정하지 않아요.',
    '시각 미상 2건은 시간 분석에서 제외됐어요.',
  ],
}
