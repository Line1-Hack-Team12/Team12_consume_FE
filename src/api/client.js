import { API_BASE } from './config'

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function buildQuery(query) {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v))
    else params.append(key, value)
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

/**
 * 백엔드 요청 공통 함수
 * - 응답이 { success, message, data } 형태면 data만 돌려준다. 아니면 응답 본문을 그대로 돌려준다.
 * - 실패하면 ApiError를 던진다. message는 사용자에게 보여줄 수 있는 문장이다.
 */
export async function apiRequest(path, { method = 'GET', query, json, form, signal } = {}) {
  const init = { method, signal, headers: { Accept: 'application/json' } }
  if (json !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(json)
  } else if (form) {
    init.body = form
  }

  let res
  try {
    res = await fetch(`${API_BASE}${path}${buildQuery(query)}`, init)
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.')
  }

  const text = await res.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok || (body && typeof body === 'object' && body.success === false)) {
    const message = (body && typeof body === 'object' && body.message) || '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
    throw new ApiError(message, { status: res.status, body })
  }

  if (body && typeof body === 'object' && 'success' in body && 'data' in body) return body.data
  return body
}
