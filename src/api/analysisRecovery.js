import { getAnalysisResult, getPatternDetail, getReport } from './analysis.js'
import { toAnalysisResult } from './analysisAdapters.js'

const hasText = (text) => typeof text === 'string' && Boolean(text.trim())
const completeCopy = (copy) => ['observation', 'hypothesisQuestion', 'action'].every((key) => hasText(copy?.[key]))

export class AnalysisScopeError extends Error {
  constructor(message) { super(message); this.name = 'AnalysisScopeError' }
}

export function assertAnalysisScope(response, snapshot, analysisId) {
  if (response?.snapshotId != null && String(response.snapshotId) !== String(snapshot.id)) {
    throw new AnalysisScopeError('확정 기록이 다른 결과는 불러올 수 없어요. 현재 기록을 다시 확인해 주세요.')
  }
  if (response?.sessionId != null && String(response.sessionId) !== String(snapshot.sessionId)) {
    throw new AnalysisScopeError('현재 세션과 다른 분석 결과예요. 기록을 다시 확인해 주세요.')
  }
  if (analysisId != null && (response?.analysisId == null || String(response.analysisId) !== String(analysisId))) {
    throw new AnalysisScopeError('요청한 분석과 다른 결과예요. 현재 결과를 다시 확인해 주세요.')
  }
}

export async function loadFinalAnalysis(snapshot, { tone = 'coach', analysisId = snapshot.analysisId ?? snapshot.sessionId, signal } = {}) {
  const response = await getAnalysisResult(analysisId, { signal })
  assertAnalysisScope(response, snapshot, analysisId)
  if (!Array.isArray(response.cards)) throw new Error('분석 카드 자료를 확인하지 못했어요. 결과를 다시 불러와 주세요.')
  if (!Number.isInteger(response.summary?.transactionCount) || response.summary.transactionCount < 0
    || response.cards.some((card) => !Number.isInteger(card.observedDays) || card.observedDays < 1)) {
    throw new Error('분석 건수 자료를 확인하지 못했어요. 결과를 다시 불러와 주세요.')
  }
  if (response.cards.some((card) => card.patternId == null) || new Set(response.cards.map((card) => String(card.patternId))).size !== response.cards.length) {
    throw new Error('분석 카드 ID를 확인하지 못했어요. 결과를 다시 불러와 주세요.')
  }
  // 결과 본문이 잘못됐으면 부가 자료를 요청하기 전에 중단한다.
  toAnalysisResult(response, { snapshot, tone })
  const [report, ...details] = await Promise.allSettled([
    getReport(snapshot.sessionId, { signal }).then((value) => {
      if (!value || typeof value !== 'object') throw new Error('리포트 자료를 확인하지 못했어요.')
      assertAnalysisScope(value, snapshot)
      return value
    }),
    ...response.cards.map((card) => getPatternDetail(analysisId, card.patternId, { signal }).then((detail) => {
      assertAnalysisScope(detail, snapshot, analysisId)
      if (String(detail.patternId) !== String(card.patternId)) throw new Error('요청한 카드와 상세 자료가 달라요.')
      return detail
    })),
  ])
  signal?.throwIfAborted()
  const result = toAnalysisResult(response, { snapshot, tone,
    report: report.status === 'fulfilled' ? report.value : null,
    details: details.filter((item) => item.status === 'fulfilled').map((item) => item.value) })
  const narrativesIncomplete = !hasText(result.summaryByTone[tone])
    || [...result.patterns, ...result.lockedPatterns].some((pattern) => !completeCopy(pattern.copyByTone[tone]))
  return { ...result, recovery: { narrativesIncomplete,
    reportUnavailable: report.status === 'rejected',
    missingDetails: response.cards.filter((_, index) => details[index].status === 'rejected').map((card) => String(card.patternId)) } }
}

// 텍스트 재생성 응답에서 금액·횟수·근거·카드 ID를 가져오지 않는다.
export function applyAnalysisNarratives(result, response, tone) {
  if (response?.analysisId == null || String(response.analysisId) !== String(result.analysisId) || !Array.isArray(response.narratives)) {
    throw new Error('현재 분석의 설명인지 확인하지 못했어요. 숫자와 근거는 유지돼요.')
  }
  const ids = new Set([...result.patterns, ...result.lockedPatterns].map((pattern) => pattern.id))
  const copies = new Map()
  for (const copy of response.narratives) {
    const id = String(copy.patternId)
    if (!ids.has(id) || copies.has(id)) throw new Error('설명에 다른 카드가 포함돼 있어요. 현재 결과는 유지돼요.')
    copies.set(id, copy)
  }
  const incomplete = ['TEMPLATE', 'PARTIAL_TEMPLATE'].includes(response.status)
    || !hasText(response.overallComment) || [...ids].some((id) => !completeCopy(copies.get(id)))
  const update = (pattern) => {
    const copy = copies.get(pattern.id)
    const fields = Object.fromEntries(['title', 'observation', 'hypothesisQuestion', 'action']
      .filter((key) => hasText(copy?.[key])).map((key) => [key, copy[key]]))
    if (!Object.keys(fields).length) return pattern
    return { ...pattern, copyByTone: { ...pattern.copyByTone, [tone]: { ...pattern.copyByTone?.[tone], ...fields } } }
  }
  return { ...result,
    summaryByTone: hasText(response.overallComment) ? { ...result.summaryByTone, [tone]: response.overallComment } : result.summaryByTone,
    patterns: result.patterns.map(update), lockedPatterns: result.lockedPatterns.map(update),
    recovery: { ...result.recovery, narrativesIncomplete: incomplete } }
}
