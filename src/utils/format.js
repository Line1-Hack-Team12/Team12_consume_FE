const krw = new Intl.NumberFormat('ko-KR')

export function formatNumber(value) {
  return krw.format(value)
}

/** 1243500 → '1,243,500원' */
export function formatKRW(value) {
  return `${krw.format(value)}원`
}

/** '2026-09-07' → '09.07' */
export function formatShortDate(date) {
  const [, m, d] = date.split('-')
  return `${m}.${d}`
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** '2026-09-10' → '09.10 (목)' */
export function formatDateWithWeekday(date) {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${formatShortDate(date)} (${weekday})`
}

export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
