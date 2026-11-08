// ⚠️ 데모용 목업 · 서버 draft API(GET /sessions/{sid}/draft)가 연결되면 이 파일 대신 응답을 쓴다.
// 고른 슬롯 월에 맞춰 거래 표를 만든다. 숫자는 매번 같은 결과가 나오도록 시드 고정 난수를 쓴다.

const MERCHANTS = [
  { merchant: '배민', category: 'delivery', subcategory: null, min: 15000, max: 29000, night: true },
  { merchant: '쿠팡이츠', category: 'delivery', subcategory: null, min: 14000, max: 26000, night: true },
  { merchant: '스타벅스 역삼', category: 'cafe', subcategory: null, min: 4500, max: 9800 },
  { merchant: '카페 A', category: 'cafe', subcategory: null, min: 4000, max: 7000 },
  { merchant: 'GS25 역삼점', category: 'living', subcategory: '편의점', min: 2500, max: 9000 },
  { merchant: 'CU 선릉점', category: 'living', subcategory: '편의점', min: 2000, max: 8000 },
  { merchant: '카카오T', category: 'transport', subcategory: '택시', min: 6800, max: 18500 },
  { merchant: '지하철', category: 'transport', subcategory: '대중교통', min: 1450, max: 1550 },
  { merchant: '김밥천국', category: 'food', subcategory: '외식', min: 7000, max: 11000 },
  { merchant: '역삼 포차', category: 'food', subcategory: '주점', min: 22000, max: 48000 },
  { merchant: '쿠팡', category: 'shopping', subcategory: '온라인', min: 9000, max: 42000 },
  { merchant: '올리브영', category: 'shopping', subcategory: '오프라인', min: 8000, max: 31000 },
]

function seeded(seedText) {
  let h = 2166136261
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

const pad = (n) => String(n).padStart(2, '0')
const daysIn = (month) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
const roundTo = (n, step) => Math.round(n / step) * step

function makeRow(id, slotMonth, day, time, src, amount, extra = {}) {
  return {
    id,
    slotMonth,
    date: `${slotMonth}-${pad(day)}`,
    time,
    merchant: src.merchant,
    amountKrw: amount,
    direction: 'out',
    kind: 'expense',
    category: src.category,
    subcategory: src.subcategory,
    included: true,
    reviewReasons: [],
    reviewStatus: 'ok', // ok | pending | kept | edited | excluded
    ...extra,
  }
}

/**
 * @param {string[]} slots 분석에 들어간 슬롯 월 (캡처가 있는 달만)
 * @returns {{ revision, transactions, duplicateGroups }}
 */
export function generateMockDraft(slots) {
  const transactions = []
  const duplicateGroups = []
  let seq = 0
  const nextId = () => `tx_${(seq += 1).toString().padStart(3, '0')}`

  slots.forEach((slotMonth, slotIndex) => {
    const rand = seeded(slotMonth)
    const count = 26 + Math.floor(rand() * 6)
    for (let i = 0; i < count; i += 1) {
      const src = MERCHANTS[Math.floor(rand() * MERCHANTS.length)]
      const day = 1 + Math.floor(rand() * daysIn(slotMonth))
      const hour = src.night ? 21 + Math.floor(rand() * 3) : 8 + Math.floor(rand() * 13)
      const time = `${pad(hour)}:${pad(Math.floor(rand() * 60))}`
      const amount = roundTo(src.min + rand() * (src.max - src.min), 100)
      transactions.push(makeRow(nextId(), slotMonth, day, time, src, amount))
    }

    // 시각이 없는 행: 검토 사유가 아니라 시간 분석에서만 빠진다
    transactions.push(makeRow(nextId(), slotMonth, 17, null, MERCHANTS[3], 6000))

    // 입금·이체는 지출 합계에서 빠진다
    transactions.push(
      makeRow(nextId(), slotMonth, 25, '09:00', { merchant: '급여', category: 'other', subcategory: null }, 2400000, {
        direction: 'in',
        kind: 'income',
      }),
    )

    // 같은 슬롯 안 겹친 거래 후보 (기본 merge)
    const a = makeRow(nextId(), slotMonth, 27, '22:05', MERCHANTS[0], 23500, { source: `${Number(slotMonth.slice(5))}월 캡처 A` })
    const b = makeRow(nextId(), slotMonth, 27, '22:05', MERCHANTS[0], 23500, { source: `${Number(slotMonth.slice(5))}월 캡처 B` })
    transactions.push(a, b)
    duplicateGroups.push({ id: `dup_${slotIndex + 1}`, slotMonth, memberIds: [a.id, b.id], representativeId: a.id, decision: 'merge', reviewed: false })
  })

  // 확신이 낮은 행 2개 (첫 슬롯과 마지막 슬롯)
  const lowTargets = [
    { slot: slots[0], day: 7, time: '21:15', src: MERCHANTS[4], amount: 3900, read: 8900 },
    { slot: slots[slots.length - 1], day: 3, time: '22:40', src: MERCHANTS[0], amount: 21000, read: 27000 },
  ]
  lowTargets.forEach(({ slot, day, time, src, amount, read }) => {
    if (!slot) return
    transactions.push(
      makeRow(nextId(), slot, day, time, src, amount, {
        reviewReasons: ['low_confidence'],
        reviewStatus: 'pending',
        readAmountKrw: read,
      }),
    )
  })

  transactions.sort((x, y) => (x.date + (x.time ?? '')).localeCompare(y.date + (y.time ?? '')))
  return { revision: 1, transactions, duplicateGroups }
}

export const REVIEW_REASON_LABEL = {
  low_confidence: '금액이 흐릿해요',
  missing_required: '필수값이 비어 있어요',
  slot_mismatch: '고른 달과 날짜가 달라요',
  unknown_direction: '입금인지 출금인지 모르겠어요',
}

/** 중복 merge에서 대표가 아닌 거래 ID 목록 */
function mergedAwayIds(duplicateGroups) {
  const ids = new Set()
  for (const g of duplicateGroups) {
    if (g.decision === 'merge') g.memberIds.filter((id) => id !== g.representativeId).forEach((id) => ids.add(id))
  }
  return ids
}

/**
 * 검토 화면 요약 · 서버 draft.summary가 생기면 그 값을 쓴다.
 * 지출 = 포함 + 출금 + 지출 종류, 중복 merge는 대표 1건만.
 */
export function summarizeDraft(draft) {
  if (!draft) return { expenseCount: 0, expenseSum: 0, bySlot: {} }
  const away = mergedAwayIds(draft.duplicateGroups)
  const bySlot = {}
  let expenseCount = 0
  let expenseSum = 0
  for (const t of draft.transactions) {
    if (!t.included || away.has(t.id) || t.direction !== 'out' || t.kind !== 'expense') continue
    expenseCount += 1
    expenseSum += t.amountKrw
    bySlot[t.slotMonth] = (bySlot[t.slotMonth] ?? 0) + 1
  }
  return { expenseCount, expenseSum, bySlot }
}
