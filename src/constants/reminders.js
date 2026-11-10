// F14: 시각 선택·검증만 담당한다. 스케줄과 발송 판정은 서버 연동 이후의 책임이다.
export const REMINDER_EARLIEST_TIME = '08:00'
export const REMINDER_LATEST_TIME = '22:00'
export const REMINDER_TIME_STEP_MINUTES = 30
export const REMINDER_TIME_OPTIONS = Array.from({ length: 28 }, (_, index) => {
  const minutes = 8 * 60 + index * REMINDER_TIME_STEP_MINUTES
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

export function validateReminderTime(time) {
  if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return '알림 시각을 다시 선택해 주세요.'
  if (time < REMINDER_EARLIEST_TIME || time >= REMINDER_LATEST_TIME) return '알림은 방해금지 시간인 22:00~08:00 밖에서만 켤 수 있어요.'
  return ''
}

export function isValidReminderTime(time) {
  return validateReminderTime(time) === ''
}
