import assert from 'node:assert/strict'
import test from 'node:test'
import { toDraft } from '../src/api/adapters.js'
import { confirmReviewedDraft, fetchReviewDraft, ReviewConflictError } from '../src/api/reviewConfirmation.js'
import { draftChanges, recoverReviewDraft, sameReviewDraft } from '../src/utils/draftConflict.js'
import { gateState } from '../src/pages/S03/reviewSelectors.js'
import { summarizeDraft } from '../src/utils/transactions.js'

const slots = ['2026-10']
const row = (id = 1, extra = {}) => ({ transactionId: id, date: '2026-10-10', time: '21:15', storeName: `테스트 ${id}`,
  amount: 1000, direction: 'out', kind: 'expense', category: 'other', ...extra })
const draft = (rows = [row()], review = { reviewQueue: { items: [] } }) => toDraft({ list: { transactions: rows }, review, duplicates: { groups: [] } }, { slots })
const response = (data, status = 200) => Response.json({ success: status < 400, data, message: status >= 400 ? '요청 실패' : '' }, { status })

test('확정 비교는 순서·로컬 revision·검토 완료 표시를 무시하고 실제 거래값을 비교한다', () => {
  const before = draft([row(1), row(2)])
  const latest = draft([row(2), row(1)])
  before.revision = 9
  before.transactions[0].reviewStatus = 'kept'
  assert.equal(sameReviewDraft(before, latest), true)
  latest.transactions[0].amountKrw = 2000
  assert.equal(sameReviewDraft(before, latest), false)
})

test('변경·추가·삭제된 거래와 중복 결정 변경을 탐지한다', () => {
  const before = draft([row(1), row(2)])
  const latest = draft([row(1, { time: '', amount: 3000 }), row(3)])
  const changes = draftChanges(before, latest)
  assert.equal(changes.length, 3)
  assert.equal(changes.find((change) => change.id === '1').before.amountKrw, 1000)
  assert.equal(changes.find((change) => change.id === '2').current, undefined)
  assert.equal(changes.find((change) => change.id === '3').before, undefined)
  const group = { id: 'a', memberIds: ['1', '2'], representativeId: '1', decision: 'merge', reviewed: false }
  before.duplicateGroups = [group]
  latest.transactions = before.transactions
  latest.duplicateGroups = [{ ...group, decision: 'separate' }]
  assert.equal(sameReviewDraft(before, latest), false)
})

test('최신 표 복구는 바뀐 행만 재검토하게 하고 이전 수정값을 덮어쓰지 않는다', () => {
  const before = draft([row(1), row(2)])
  before.transactions[0].reviewStatus = 'kept'
  const latest = draft([row(1), row(2, { amount: 8000 }), row(3)])
  const recovered = recoverReviewDraft(before, latest)
  assert.equal(recovered.transactions[0].reviewStatus, 'kept')
  assert.equal(recovered.transactions[1].reviewStatus, 'pending')
  assert.ok(recovered.transactions[1].reviewReasons.includes('server_changed'))
  assert.equal(recovered.transactions[2].reviewStatus, 'pending')
  assert.equal(gateState(recovered, summarizeDraft(recovered)).canConfirm, false)
  assert.equal(before.transactions[1].amountKrw, 1000)
  assert.equal(latest.transactions[1].reviewStatus, 'ok')
  recovered.transactions.forEach((item) => { item.reviewStatus = 'kept' })
  assert.equal(sameReviewDraft(recovered, latest), true)
  assert.equal(gateState(recovered, summarizeDraft(recovered)).canConfirm, true)
})

test('서버가 삭제한 행은 복구 표에 다시 생성하지 않고 이전 표에 보관한다', () => {
  const before = draft([row(1), row(2)])
  const recovered = recoverReviewDraft(before, draft([row(2)]))
  assert.deepEqual(recovered.transactions.map((item) => item.id), ['2'])
  assert.equal(before.transactions.length, 2)
})

test('동일한 표는 한 번 확정하고 문서에 없는 expectedRevision을 전송하지 않는다', async (context) => {
  let confirms = 0
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    if (url.endsWith('/transactions')) return response({ transactions: [row()] })
    if (url.endsWith('/review')) return response({ reviewQueue: { items: [] } })
    if (url.endsWith('/duplicates')) return response({ groups: [] })
    assert.equal(url, '/api/sessions/7/confirm')
    assert.equal(init.method, 'POST')
    assert.equal(init.body, undefined)
    confirms++
    return response({ snapshotId: 91 })
  })
  assert.deepEqual(await confirmReviewedDraft(7, draft(), slots), { snapshotId: 91 })
  assert.equal(confirms, 1)
})

test('확정 직전 표가 달라지면 POST 없이 충돌로 처리한다', async (context) => {
  let writes = 0
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    if (init.method === 'POST') writes++
    return response(url.endsWith('/transactions') ? { transactions: [row(1, { amount: 4000 })] } : url.endsWith('/review') ? { reviewQueue: { items: [] } } : { groups: [] })
  })
  await assert.rejects(confirmReviewedDraft(7, draft(), slots), (error) => error instanceof ReviewConflictError && error.latestDraft.transactions[0].amountKrw === 4000)
  assert.equal(writes, 0)
})

for (const status of [409, 412]) {
  test(`서버 ${status} 충돌은 최신 표를 조회하며 자동으로 재확정하지 않는다`, async (context) => {
    let reads = 0
    let writes = 0
    context.mock.method(globalThis, 'fetch', async (url, init) => {
      if (init.method === 'POST') { writes++; return response({}, status) }
      if (url.endsWith('/transactions')) { reads++; return response({ transactions: [row(1, { amount: reads > 1 ? 9000 : 1000 })] }) }
      return response(url.endsWith('/review') ? { reviewQueue: { items: [] } } : { groups: [] })
    })
    await assert.rejects(confirmReviewedDraft(7, draft(), slots), (error) => error instanceof ReviewConflictError && error.latestDraft.transactions[0].amountKrw === 9000)
    assert.equal(writes, 1)
    assert.equal(reads, 2)
  })
}

test('충돌 뒤 최신 조회 실패도 충돌 상태를 유지하고 이전 입력을 바꾸지 않는다', async (context) => {
  const before = draft()
  let conflicted = false
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    if (init.method === 'POST') { conflicted = true; return response({}, 409) }
    if (conflicted) return response({}, 503)
    return response(url.endsWith('/transactions') ? { transactions: [row()] } : url.endsWith('/review') ? { reviewQueue: { items: [] } } : { groups: [] })
  })
  await assert.rejects(confirmReviewedDraft(7, before, slots), (error) => error instanceof ReviewConflictError && error.latestDraft === null && Boolean(error.refreshError))
  assert.equal(before.transactions[0].amountKrw, 1000)
})

test('중복 조회 실패는 빈 목록으로 넘어가지 않고 확정을 중단한다', async (context) => {
  let writes = 0
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    if (init.method === 'POST') writes++
    if (url.endsWith('/duplicates')) return response({}, 503)
    return response(url.endsWith('/transactions') ? { transactions: [row()] } : { reviewQueue: { items: [] } })
  })
  await assert.rejects(confirmReviewedDraft(7, draft(), slots), /요청 실패/)
  assert.equal(writes, 0)
})

test('잘못된 최신 거래 목록을 빈 거래 표로 취급하지 않는다', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => response({}))
  await assert.rejects(fetchReviewDraft(7, slots), /최신 검토 내역/)
})

test('일반 서버 오류는 충돌로 오인하거나 자동 재확정하지 않는다', async (context) => {
  let writes = 0
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    if (init.method === 'POST') { writes++; return response({}, 502) }
    return response(url.endsWith('/transactions') ? { transactions: [row()] } : url.endsWith('/review') ? { reviewQueue: { items: [] } } : { groups: [] })
  })
  await assert.rejects(confirmReviewedDraft(7, draft(), slots), (error) => error.status === 502 && !(error instanceof ReviewConflictError))
  assert.equal(writes, 1)
})
