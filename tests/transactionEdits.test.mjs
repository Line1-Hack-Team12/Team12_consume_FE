import assert from 'node:assert/strict'
import test from 'node:test'
import { toTransactionRequest } from '../src/api/requestPayloads.js'
import { saveTransactionEdit } from '../src/api/transactionEdits.js'
import { moveTransactionDate } from '../src/utils/transactionEditing.js'
import { validateTransaction } from '../src/utils/transactionValidation.js'

const original = Object.freeze({
  id: '7', serverId: 7, date: '2026-10-31', slotMonth: '2026-10', time: '21:15',
  merchant: '테스트 매장', amountKrw: 12000, direction: 'out', kind: 'expense', category: 'other', subcategory: null, included: true,
})
const detail = (patch = {}) => ({ transactionId: 7, date: original.date, time: original.time, storeName: original.merchant,
  amount: original.amountKrw, direction: '출금', type: 'expense', category: 'expense', excluded: false, ...patch })

test('기록 월 변경은 일을 유지하고 짧은 달·윤년·연도 변경을 처리한다', () => {
  assert.equal(moveTransactionDate('2026-10-31', '2026-09'), '2026-09-30')
  assert.equal(moveTransactionDate('2026-01-31', '2026-02'), '2026-02-28')
  assert.equal(moveTransactionDate('2024-01-31', '2024-02'), '2024-02-29')
  assert.equal(moveTransactionDate('2026-12-20', '2027-01'), '2027-01-20')
  assert.equal(moveTransactionDate('', '2026-09'), '')
  assert.equal(moveTransactionDate('2026-10-31', ''), '2026-10-31')
})

test('선택 기간 밖이나 비어 있는 기록 월·월과 다른 날짜는 저장할 수 없다', () => {
  const slots = ['2026-09', '2026-10']
  assert.deepEqual(validateTransaction({ ...original, date: '2026-09-30', slotMonth: '2026-09', time: null }, { slots }), {})
  assert.ok(validateTransaction({ ...original, slotMonth: '' }, { slots }).slotMonth)
  assert.ok(validateTransaction({ ...original, slotMonth: '2026-08' }, { slots }).slotMonth)
  assert.ok(validateTransaction({ ...original, slotMonth: '2026-09' }, { slots }).date)
})

test('시각 삭제는 JSON에서 사라지지 않고 빈 문자열로 전송된다', () => {
  const request = JSON.parse(JSON.stringify(toTransactionRequest({ ...original, time: null }, 'EDIT')))
  assert.equal(request.time, '')
  assert.equal(request.date, original.date)
  assert.equal(Object.hasOwn(request, 'slotMonth'), false)
  assert.equal(Object.hasOwn(request, 'subcategory'), false)
})

test('시각 삭제와 월 변경을 저장 후 재조회해 확인한다', async (context) => {
  const next = Object.freeze({ ...original, time: null, slotMonth: '2026-09', date: '2026-09-30' })
  const requests = []
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    requests.push({ url, method: init.method })
    if (init.method === 'PUT') {
      const sent = JSON.parse(init.body)
      assert.equal(sent.time, '')
      assert.equal(sent.date, '2026-09-30')
      return Response.json({ success: true, data: { revision: 8 } })
    }
    return Response.json({ success: true, data: detail({ date: next.date, time: '' }) })
  })
  assert.deepEqual(await saveTransactionEdit(original, next, 'EDIT'), { revision: 8 })
  assert.deepEqual(requests, [{ url: '/api/transactions/7', method: 'PUT' }, { url: '/api/transactions/7', method: 'GET' }])
  assert.equal(original.date, '2026-10-31')
})

test('서버가 시각 삭제·월 변경을 무시하면 성공으로 처리하지 않는다', async (context) => {
  context.mock.method(globalThis, 'fetch', async (_url, init) => Response.json({ success: true, data: init.method === 'PUT' ? {} : detail() }))
  await assert.rejects(saveTransactionEdit(original, { ...original, time: null }, 'EDIT'), /시각 변경/)
  await assert.rejects(saveTransactionEdit(original, { ...original, date: '2026-09-30', slotMonth: '2026-09' }, 'EDIT'), /날짜·기록의 달 변경/)
})

test('서버가 금액·방향·종류·카테고리 수정을 무시하면 구체적인 오류를 돌려준다', async (context) => {
  context.mock.method(globalThis, 'fetch', async (_url, init) => Response.json({ success: true, data: init.method === 'PUT' ? {} : detail() }))
  await assert.rejects(saveTransactionEdit(original, { ...original, amountKrw: 3000 }, 'EDIT'), /금액 변경/)
  await assert.rejects(saveTransactionEdit(original, { ...original, direction: 'in', kind: 'income', category: 'living' }, 'EDIT'), /방향·종류·카테고리 변경/)
})

test('하위 분류는 지원하지 않는 API에 보내지 않는다', async (context) => {
  const fetch = context.mock.method(globalThis, 'fetch', () => { throw new Error('전송되면 안 됨') })
  await assert.rejects(saveTransactionEdit(original, { ...original, subcategory: '택시' }, 'EDIT'), /하위 분류 변경은 현재 서버에서 지원하지/)
  assert.equal(fetch.mock.callCount(), 0)
})

test('제외한 거래를 수정해도 제외 상태를 유지하고 복원 결과도 확인한다', async (context) => {
  context.mock.method(globalThis, 'fetch', async (_url, init) => {
    if (init.method === 'PUT') {
      assert.equal(JSON.parse(init.body).action, 'EXCLUDE')
      return Response.json({ success: true, data: {} })
    }
    return Response.json({ success: true, data: detail({ time: '', excluded: true }) })
  })
  const excluded = { ...original, included: false }
  await saveTransactionEdit(excluded, { ...excluded, time: null }, 'EXCLUDE')
  context.mock.restoreAll()
  context.mock.method(globalThis, 'fetch', async (_url, init) => Response.json({ success: true, data: init.method === 'PUT' ? {} : detail({ excluded: true }) }))
  await assert.rejects(saveTransactionEdit(excluded, original, 'RESTORE'), /포함 여부 변경/)
})

test('재조회에서 다른 거래를 응답하면 저장 성공으로 처리하지 않는다', async (context) => {
  context.mock.method(globalThis, 'fetch', async (_url, init) => Response.json({ success: true, data: init.method === 'PUT' ? {} : detail({ transactionId: 99 }) }))
  await assert.rejects(saveTransactionEdit(original, { ...original, time: null }, 'EDIT'), /저장한 내역을 확인하지/)
})
