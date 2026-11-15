/** 기록 월을 바꿀 때 날짜의 일은 유지하고, 새 달에 없는 일은 그 달의 말일로 맞춘다. */
export function moveTransactionDate(date, month) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return date
  const [year, mon] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate()
  const day = Math.min(Number(date.slice(8, 10)), lastDay)
  return `${month}-${String(day).padStart(2, '0')}`
}
