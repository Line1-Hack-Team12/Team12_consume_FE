import assert from 'node:assert/strict'
import test from 'node:test'
import { toReport } from '../src/api/analysisAdapters.js'
import { formatShortMonth, formatSlotRange } from '../src/utils/months.js'

test('서버 리포트의 월 이름을 그대로 표시하며 YYYY-MM 슬롯도 지원한다', () => {
  const raw = [{ month: '8월', amount: 903190 }, { month: '9월', amount: 776290 }, { month: '10월', amount: 944190 }]
  const report = toReport({ monthlyTrend: { monthlyAmounts: raw } }, ['2026-08', '2026-09', '2026-10'])
  assert.deepEqual(report.months.map((item) => formatShortMonth(item.month)), ['8월', '9월', '10월'])
  assert.deepEqual(report.months.map((item) => item.amountKrw), [903190, 776290, 944190])
  assert.equal(formatShortMonth('2026-08'), '8월')
  assert.equal(formatShortMonth('2026-12'), '12월')
  assert.equal(formatShortMonth(' 08월 '), '8월')
  assert.equal(formatSlotRange(['2026-08']), '8월')
  assert.equal(formatSlotRange(['2026-08', '2026-09', '2026-10']), '8~10월')
})

test('월이 없거나 잘못된 값이면 NaN 대신 월 정보 없음으로 표시한다', () => {
  for (const value of [undefined, null, '', '잘못된 월', '2026-00', '2026-13', '0월', '13월']) {
    assert.equal(formatShortMonth(value), '월 정보 없음')
  }
})
