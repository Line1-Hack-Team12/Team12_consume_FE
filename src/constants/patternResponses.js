// F13 원인 응답의 허용값. 특별 응답 상태는 원인 태그와 별도로 저장한다.
export const CAUSE_TAGS = [
  { value: 'overtime', label: '야근' },
  { value: 'rain', label: '비 와서' },
  { value: 'stress', label: '스트레스' },
  { value: 'habit', label: '습관' },
  { value: 'no_specific_reason', label: '그냥' },
  { value: 'custom', label: '직접 입력' },
]

export const RESPONSE_STATUSES = [
  { value: 'unknown', label: '모르겠음' },
  { value: 'not_applicable', label: '해당 없음' },
  { value: 'skipped', label: '건너뛰기' },
]

export const MAX_CUSTOM_CAUSE_LENGTH = 100
export const REMINDER_DISCLAIMER = '과거 기록을 참고한 사전 안내이며 새 결제를 감지한 결과가 아닙니다'
