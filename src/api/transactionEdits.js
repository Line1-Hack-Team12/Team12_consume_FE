import { getTransaction, updateTransaction } from './sessions.js'

const LABELS = {
  date: '날짜', time: '시각', merchant: '가맹점명', amountKrw: '금액', direction: '방향',
  kind: '종류', category: '카테고리', subcategory: '하위 분류', slotMonth: '기록의 달', included: '포함 여부',
}

function storedFields(transaction) {
  return {
    date: transaction.date,
    time: transaction.time || null,
    merchant: transaction.storeName ?? transaction.merchant,
    amountKrw: Number(transaction.amount ?? transaction.amountKrw ?? transaction.amount_krw),
    direction: ['입금', 'in'].includes(transaction.direction) ? 'in' : ['출금', 'out'].includes(transaction.direction) ? 'out' : 'unknown',
    kind: transaction.kind ?? transaction.type,
    category: transaction.category,
    subcategory: transaction.subcategory ?? null,
    // 현재 API는 행별 기록 월을 받지 않는다. 날짜를 바꾸고 조회된 날짜의 월로 확인한다.
    slotMonth: transaction.slotMonth ?? transaction.slot_month ?? transaction.date?.slice(0, 7),
    included: !(transaction.excluded ?? transaction.isExcluded ?? false),
  }
}

export async function saveTransactionEdit(before, next, action) {
  if ((before.subcategory ?? null) !== (next.subcategory ?? null)) {
    throw new Error('하위 분류 변경은 현재 서버에서 지원하지 않아요. 기존 하위 분류를 유지해 주세요.')
  }
  const result = await updateTransaction(before.serverId, next, action)
  const changed = Object.keys(LABELS).filter((key) => (before[key] ?? null) !== (next[key] ?? null))
  if (changed.length) {
    const saved = await getTransaction(before.serverId)
    if (!saved || String(saved.transactionId ?? saved.id) !== String(before.serverId)) {
      throw new Error('저장한 내역을 확인하지 못했어요. 입력은 유지했으니 다시 저장해 주세요.')
    }
    const actual = storedFields(saved)
    const missing = changed.filter((key) => (actual[key] ?? null) !== (next[key] ?? null))
    if (missing.length) {
      throw new Error(`서버에서 ${missing.map((key) => LABELS[key]).join('·')} 변경을 반영하지 못했어요. 입력은 유지했으니 다시 확인해 주세요.`)
    }
  }
  return result
}
