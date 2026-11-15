import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, apiRequest } from '../src/api/client.js'
import { parseApiJson } from '../src/api/parseJson.js'

test('큰 정수는 끝자리 손실 없이 문자열로 읽고 일반 수치는 number로 유지한다', () => {
  const data = parseApiJson('{"patternId":6210964112925012238,"negative":-9223372036854775808,"safe":9007199254740991,"unsafe":9007199254740992,"amount":297400,"decimal":1.25,"exponent":1e3,"zero":0,"nested":[6210964112925012239,null,true]}')
  assert.deepEqual(data, {
    patternId: '6210964112925012238', negative: '-9223372036854775808',
    safe: Number.MAX_SAFE_INTEGER, unsafe: '9007199254740992', amount: 297400,
    decimal: 1.25, exponent: 1000, zero: 0, nested: ['6210964112925012239', null, true],
  })
})

test('기존 문자열의 숫자·따옴표·역슬래시는 변경하지 않는다', () => {
  const original = { patternId: '6210964112925012238', text: '숫자 6210964112925012238, "patternId":6210964112925012239, \\ 경로' }
  assert.deepEqual(parseApiJson(JSON.stringify(original)), original)
  assert.throws(() => parseApiJson('{"patternId":6210964112925012238,}'), SyntaxError)
})

test('성공·실패 응답의 큰 정수 ID를 보존하고 비 JSON 응답도 유지한다', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response('{"success":true,"data":{"patternId":6210964112925012238}}'))
  assert.deepEqual(await apiRequest('/test'), { patternId: '6210964112925012238' })
  context.mock.restoreAll()
  context.mock.method(globalThis, 'fetch', async () => new Response('{"success":false,"message":"조회 실패","data":{"patternId":6210964112925012238}}', { status: 404 }))
  await assert.rejects(apiRequest('/test'), (error) => error instanceof ApiError && error.status === 404 && error.body.data.patternId === '6210964112925012238')
  context.mock.restoreAll()
  context.mock.method(globalThis, 'fetch', async () => new Response('plain text'))
  assert.equal(await apiRequest('/test'), 'plain text')
})
