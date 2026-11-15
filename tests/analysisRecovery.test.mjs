import assert from 'node:assert/strict'
import test from 'node:test'
import { toAnalysisJob } from '../src/api/adapters.js'
import { AnalysisScopeError, applyAnalysisNarratives, assertAnalysisScope, loadFinalAnalysis } from '../src/api/analysisRecovery.js'

const snapshot = Object.freeze({ id: '91', sessionId: 7, analysisId: 7, slots: ['2026-10'], summary: { expenseCount: 2, expenseSum: 5000 } })
const card = { patternId: 11, observedDays: 2, sumKrw: 4000, chainedSumKrw: 1000, evidenceGrade: 'NORMAL' }
const response = (extra = {}) => ({ analysisId: 7, snapshotId: 91, summary: { totalExpenseKrw: 5000, transactionCount: 2, overallComment: '' }, cards: [card], ...extra })
const json = (data, status = 200) => Response.json({ success: status < 400, data, message: status >= 400 ? '일시 오류' : '' }, { status })
const complete = (extra = {}) => ({ analysisId: 7, status: 'AI', overallComment: '새 총평', narratives: [{ patternId: 11, observation: '관찰 문장', hypothesisQuestion: '원인 질문', action: '행동 제안' }], ...extra })

test('실패 단계와 세션·확정 기록 식별자를 상태 응답에서 유지한다', () => {
  const job = toAnalysisJob({ sessionId: 7, snapshotId: 91, status: 'ANALYZING', currentStep: 3, steps: [{ stepNumber: 3, status: 'FAILED' }] })
  assert.equal(job.state, 'failed')
  assert.equal(job.failureStage, 'explaining')
  assert.equal(job.snapshotId, 91)
  assert.equal(toAnalysisJob({ status: 'FAILED', currentStep: 3 }).failureStage, 'explaining')
  assert.equal(toAnalysisJob({ status: 'FAILED', failureStage: 'final_aggregating' }).failureStage, 'final_aggregating')
})

test('다른 확정 기록·세션·분석 응답은 섞지 않는다', () => {
  assert.throws(() => assertAnalysisScope({ snapshotId: 92 }, snapshot), AnalysisScopeError)
  assert.throws(() => assertAnalysisScope({ sessionId: 8 }, snapshot), AnalysisScopeError)
  assert.throws(() => assertAnalysisScope({ analysisId: 8 }, snapshot, 7), AnalysisScopeError)
})

test('결과 조회 실패는 확정 기록을 유지하고 재확정·재실행 요청을 보내지 않는다', async (context) => {
  const calls = []
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push([url, init.method])
    return json({}, 503)
  })
  await assert.rejects(loadFinalAnalysis(snapshot), /일시 오류/)
  assert.deepEqual(calls, [['/api/analyses/7/result', 'GET']])
  assert.equal(snapshot.id, '91')
  assert.equal(snapshot.summary.expenseSum, 5000)
})

test('설명·리포트·일부 상세 실패가 있어도 서버가 반환한 수치는 보존한다', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url) => url.endsWith('/result') ? json(response()) : json({}, 503))
  const result = await loadFinalAnalysis(snapshot)
  assert.equal(result.snapshotId, '91')
  assert.equal(result.totalKrw, 5000)
  assert.equal(result.patterns[0].sumKrw, 4000)
  assert.equal(result.patterns[0].chainedSumKrw, 1000)
  assert.deepEqual(result.recovery, { narrativesIncomplete: true, reportUnavailable: true, missingDetails: ['11'] })
})

test('잘못된 결과의 수치나 snapshot은 부가 자료 요청 전에 거부한다', async (context) => {
  let calls = 0
  context.mock.method(globalThis, 'fetch', async () => { calls++; return json(response({ snapshotId: 92 })) })
  await assert.rejects(loadFinalAnalysis(snapshot), AnalysisScopeError)
  assert.equal(calls, 1)
  context.mock.restoreAll()
  context.mock.method(globalThis, 'fetch', async () => json(response({ summary: { transactionCount: 2 } })))
  await assert.rejects(loadFinalAnalysis(snapshot), /확정 지출 합계/)
})

test('다른 카드의 상세 자료와 다른 확정 기록의 리포트는 사용하지 않는다', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url) => json(url.endsWith('/result') ? response() : url.endsWith('/report') ? { snapshotId: 92 } : { analysisId: 7, patternId: 99 }))
  const result = await loadFinalAnalysis(snapshot)
  assert.equal(result.report, null)
  assert.deepEqual(result.recovery.missingDetails, ['11'])
  assert.equal(result.patterns[0].evidence.length, 0)
})

test('요청 취소는 부분 성공 결과로 바꾸지 않는다', async (context) => {
  const controller = new AbortController()
  context.mock.method(globalThis, 'fetch', async (url) => {
    if (url.endsWith('/result')) return json(response())
    controller.abort()
    return json({})
  })
  await assert.rejects(loadFinalAnalysis(snapshot, { signal: controller.signal }), { name: 'AbortError' })
})

async function resultFixture(context) {
  context.mock.method(globalThis, 'fetch', async (url) => json(url.endsWith('/result') ? response() : url.endsWith('/report') ? {} : {
    analysisId: 7, patternId: 11, ...card, evidenceTransactions: [{ transactionId: 1, date: '2026-10-10', amountKrw: 4000 }],
  }))
  return loadFinalAnalysis(snapshot)
}

test('설명만 재생성할 때 숫자·근거·리포트·사용자 응답을 변경하지 않는다', async (context) => {
  const original = await resultFixture(context)
  const updated = applyAnalysisNarratives(original, complete({ totalKrw: 1, snapshotId: 1, summary: { totalExpenseKrw: 1 } }), 'friend')
  assert.equal(updated.totalKrw, original.totalKrw)
  assert.equal(updated.snapshotId, original.snapshotId)
  assert.equal(updated.patterns[0].sumKrw, 4000)
  assert.equal(updated.patterns[0].evidence, original.patterns[0].evidence)
  assert.equal(updated.patterns[0].initialResponse, original.patterns[0].initialResponse)
  assert.equal(updated.report, original.report)
  assert.equal(updated.patterns[0].copyByTone.friend.action, '행동 제안')
  assert.equal(updated.recovery.narrativesIncomplete, false)
  assert.equal(original.recovery.narrativesIncomplete, true)
})

test('기본 문장 대체와 일부 문장 누락은 완전한 설명 복구로 표시하지 않는다', async (context) => {
  const original = await resultFixture(context)
  assert.equal(applyAnalysisNarratives(original, complete({ status: 'TEMPLATE' }), 'coach').recovery.narrativesIncomplete, true)
  const partial = applyAnalysisNarratives(original, complete({ narratives: [] }), 'coach')
  assert.equal(partial.recovery.narrativesIncomplete, true)
  assert.equal(partial.patterns[0], original.patterns[0])
})

test('다른 분석·카드·중복 카드의 설명은 기존 결과에 적용하지 않는다', async (context) => {
  const original = await resultFixture(context)
  assert.throws(() => applyAnalysisNarratives(original, complete({ analysisId: 8 }), 'coach'), /현재 분석/)
  assert.throws(() => applyAnalysisNarratives(original, complete({ narratives: [{ patternId: 99 }] }), 'coach'), /다른 카드/)
  assert.throws(() => applyAnalysisNarratives(original, complete({ narratives: [{ patternId: 11 }, { patternId: 11 }] }), 'coach'), /다른 카드/)
  assert.equal(original.totalKrw, 5000)
})

test('패턴 0건은 정상 결과로 유지하며 임의 카드를 생성하지 않는다', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url) => json(url.endsWith('/result') ? response({ cards: [], summary: { totalExpenseKrw: 5000, transactionCount: 2, overallComment: '반복 패턴이 없어요.' } }) : {}))
  const result = await loadFinalAnalysis(snapshot)
  assert.deepEqual(result.patterns, [])
  assert.equal(result.recovery.narrativesIncomplete, false)
})
