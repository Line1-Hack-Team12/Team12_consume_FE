import { CAUSE_TAGS, REMINDER_DISCLAIMER } from '../constants/patternResponses'

// 화면 미리보기용 문구만 구성한다. 태그로 당일 상황을 판정하거나 발송을 예약하지 않는다.
export function buildS06ReminderPreview({ pattern, response, tone = 'coach' }) {
  const tags = response?.cause_tags ?? []
  const labels = tags.map((tag) => tag === 'custom'
    ? response?.custom_cause?.trim()
    : CAUSE_TAGS.find((item) => item.value === tag)?.label).filter(Boolean)
  const heading = labels.length > 0 ? `${labels.join(' · ')} 태그를 반영한 미리보기` : '알림 미리보기'
  if (!pattern) return { heading, message: '', disclaimer: REMINDER_DISCLAIMER }

  // 디자인 전용 문구는 합성 fixture가 명시적으로 제공할 때만 사용한다.
  const previewCopy = pattern.reminderPreview
  const taggedAction = tags.length === 1 && previewCopy?.actionByTag?.[tags[0]]
  if (taggedAction && previewCopy.observation) {
    return { heading, message: `${taggedAction} ${previewCopy.observation}`, disclaimer: REMINDER_DISCLAIMER }
  }

  const context = labels.length > 0 ? `선택한 맥락: ${labels.join(' · ')}. ` : ''
  const action = previewCopy?.action ?? pattern.copyByTone?.[tone]?.action ?? ''
  const observation = previewCopy?.observation ?? `${pattern.title} · ${pattern.observation ?? ''}.`
  return { heading, message: `${context}${action ? `${action} ` : ''}${observation}`, disclaimer: REMINDER_DISCLAIMER }
}
