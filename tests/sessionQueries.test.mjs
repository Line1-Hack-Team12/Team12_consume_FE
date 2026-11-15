import assert from 'node:assert/strict'
import test from 'node:test'
import { QueryClient } from '@tanstack/react-query'
import { completionSummaryQuery, invalidateSessionQueries, notificationsQuery, savingsPlansQuery } from '../src/api/sessionQueries.js'

function setup(context, handler) {
  const client = new QueryClient()
  const calls = []
  context.after(() => client.clear())
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push(url)
    return handler ? handler(url, init) : Response.json({ data: { plans: [], notifications: [] }, success: true })
  })
  return { client, calls }
}

test('플랜 조건을 왕복하거나 잠금 순서가 달라도 캐시를 재사용한다', async (context) => {
  const { client, calls } = setup(context)
  await client.fetchQuery(savingsPlansQuery(7, 91, 50000, ['식비', '교통']))
  await client.fetchQuery(savingsPlansQuery(7, 91, 60000, []))
  await client.fetchQuery(savingsPlansQuery('7', '91', 50000, ['교통', '식비']))
  assert.equal(calls.length, 2)
})

test('세션과 확정 기록이 다른 플랜·알림·요약은 캐시를 공유하지 않는다', async (context) => {
  const { client, calls } = setup(context)
  for (const [session, snapshot] of [[7, 91], [7, 92], [8, 91]]) {
    await client.fetchQuery(savingsPlansQuery(session, snapshot, 50000, []))
    await client.fetchQuery(notificationsQuery(session, snapshot))
    await client.fetchQuery(completionSummaryQuery(session, snapshot))
  }
  assert.equal(calls.length, 9)
})

test('같은 알림·완료 요약을 동시에 조회하거나 재진입해도 요청을 공유한다', async (context) => {
  const { client, calls } = setup(context)
  for (const options of [notificationsQuery(7, 91), completionSummaryQuery(7, 91)]) {
    await Promise.all([client.fetchQuery(options), client.fetchQuery(options)])
    await client.fetchQuery(options)
  }
  assert.equal(calls.length, 2)
})

test('저장 후 관련 캐시만 갱신하고 다른 확정 기록의 캐시는 유지한다', async (context) => {
  const { client, calls } = setup(context)
  const current = [notificationsQuery(7, 91), completionSummaryQuery(7, 91)]
  const other = completionSummaryQuery(7, 92)
  for (const options of [...current, other]) await client.fetchQuery(options)
  await invalidateSessionQueries(client, 7, 91, ['notifications', 'completion'])
  for (const options of [...current, other]) await client.fetchQuery(options)
  assert.equal(calls.length, 5)
})

test('조회 취소는 실제 fetch까지 전달하고 실패 응답은 자동 반복하지 않는다', async (context) => {
  let requestSignal
  const { client, calls } = setup(context, (_url, { signal }) => {
    requestSignal = signal
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
  })
  const options = savingsPlansQuery(7, 91, 50000, [])
  const pending = client.fetchQuery(options)
  const rejected = assert.rejects(pending)
  await client.cancelQueries({ queryKey: options.queryKey })
  await rejected
  assert.equal(requestSignal.aborted, true)
  context.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url)
    return Response.json({ message: '조회 실패' }, { status: 503 })
  })
  await assert.rejects(client.fetchQuery(options), /조회 실패/)
  assert.equal(calls.length, 2)
})
