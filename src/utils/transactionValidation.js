// F04 필수값 검증 · 시각은 비워도 된다 (시간 분석에서만 빠짐)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function isRealDate(value) {
  if (!DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** @returns {Record<string, string>} 필드별 오류 문구 (없으면 빈 객체) */
export function validateTransaction(t) {
  const errors = {}
  if (!isRealDate(t.date)) errors.date = '날짜를 확인해 주세요'
  else if (t.slotMonth && !t.date.startsWith(t.slotMonth)) errors.date = '이 캡처의 달과 날짜가 달라요'
  if (t.time && !TIME_RE.test(t.time)) errors.time = '00:00 형식으로 적어주세요'
  if (!t.merchant?.trim()) errors.merchant = '가맹점명을 적어주세요'
  else if (t.merchant.trim().length > 100) errors.merchant = '100자 이내로 적어주세요'
  if (!Number.isInteger(t.amountKrw) || t.amountKrw <= 0) errors.amountKrw = '금액을 원 단위 숫자로 적어주세요'
  if (!t.direction) errors.direction = '방향을 골라주세요'
  if (!t.kind) errors.kind = '종류를 골라주세요'
  if (!t.category) errors.category = '카테고리를 골라주세요'
  return errors
}

export function isTransactionValid(t) {
  return Object.keys(validateTransaction(t)).length === 0
}
