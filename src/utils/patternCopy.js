const hasText = (value) => typeof value === 'string' && Boolean(value.trim())

// 화면에 표시할 문구는 선택한 말투를 우선하고, 없는 항목만 기존 문구로 보완한다.
export function getPatternCopy(pattern, tone = 'coach') {
  const preferred = pattern.copyByTone?.[tone]
  const fallback = pattern.copyByTone?.coach
  return Object.fromEntries(['title', 'observation', 'hypothesisQuestion', 'action'].map((key) => [
    key, [preferred?.[key], fallback?.[key], pattern[key]].find(hasText),
  ]))
}
