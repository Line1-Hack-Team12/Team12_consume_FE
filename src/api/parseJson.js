// 문자열 안의 숫자는 건드리지 않고 JSON의 문자열·숫자 토큰만 구분한다.
const JSON_TOKEN = /"(?:[^"\\]|\\[\s\S])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g

export function parseApiJson(text) {
  // JSON.parse 후에는 큰 정수의 원래 끝자리를 복구할 수 없으므로 먼저 문자열로 감싼다.
  // 금액 등 일반 수치와 소수·지수 표기는 기존 number 타입을 유지한다.
  const preserved = text.replace(JSON_TOKEN, (token) => {
    if (token.startsWith('"') || /[.eE]/.test(token) || Number.isSafeInteger(Number(token))) return token
    return JSON.stringify(token)
  })
  return JSON.parse(preserved)
}
