import { SELECTABLE_MONTH_RANGE, TIME_ZONE } from '../constants/limits.js'

// 'YYYY-MM' 문자열을 다루는 순수 함수 모음

/** Asia/Seoul 기준 이번 달 'YYYY-MM' */
export function getCurrentMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  const year = parts.find((p) => p.type === 'year').value
  const month = parts.find((p) => p.type === 'month').value
  return `${year}-${month}`
}

export function addMonths(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const index = y * 12 + (m - 1) + delta
  const year = Math.floor(index / 12)
  const mon = (index % 12) + 1
  return `${year}-${String(mon).padStart(2, '0')}`
}

/** 이번 달보다 과거인지 (이번 달·미래 달은 선택 불가) */
export function isSelectableLastMonth(month, now = new Date()) {
  return Boolean(month) && month < getCurrentMonth(now)
}

/** 마지막 달 드롭다운 옵션: 지난달부터 과거로 */
export function getSelectableMonths(now = new Date(), range = SELECTABLE_MONTH_RANGE) {
  const current = getCurrentMonth(now)
  return Array.from({ length: range }, (_, i) => addMonths(current, -(i + 1)))
}

/** 마지막 달에서 앞으로 이어지는 연속 슬롯 (오래된 달부터) */
export function buildSlots(lastMonth, monthCount) {
  if (!lastMonth) return []
  return Array.from({ length: monthCount }, (_, i) => addMonths(lastMonth, i - (monthCount - 1)))
}

export function formatMonth(month) {
  const [y, m] = month.split('-').map(Number)
  return `${y}년 ${m}월`
}

export function formatShortMonth(month) {
  return `${Number(month.split('-')[1])}월`
}

/** 슬롯 범위 문구: '8~10월' / '2025년 12월~2026년 1월' */
export function formatSlotRange(slots) {
  if (slots.length === 0) return ''
  const first = slots[0]
  const last = slots[slots.length - 1]
  if (first === last) return formatShortMonth(first)
  if (first.slice(0, 4) === last.slice(0, 4)) return `${Number(first.slice(5))}~${Number(last.slice(5))}월`
  return `${formatMonth(first)}~${formatMonth(last)}`
}
