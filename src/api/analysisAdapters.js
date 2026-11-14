import { CATEGORIES } from '../constants/limits.js'

export function toReport(report, slots, tone = 'coach') {
  if (!report) return null
  const label = report.headerSummary?.periodDescription ?? '업로드한 기록 기준'
  const observation = report.observationAndAction
  return {
    periodLabel: label,
    summaryByTone: { [tone]: report.headerSummary?.highlightMessage, coach: report.headerSummary?.highlightMessage },
    categories: (report.categoryRatios ?? []).map((c) => ({ category: c.category, label: CATEGORIES.find((i) => i.value === c.category)?.label ?? c.category, amountKrw: c.amount, sharePercent: c.percentage })),
    months: (report.monthlyTrend?.monthlyAmounts ?? []).map((m) => ({ month: m.month, amountKrw: m.amount })),
    monthComparison: null,
    observations: observation ? [{ id: 'server-observation', icon: 'sparkle', copyByTone: { [tone]: { observation: observation.observedPattern, action: observation.recommendedAction }, coach: { observation: observation.observedPattern, action: observation.recommendedAction } } }] : [],
    limitations: [report.noticeMessage || '업로드한 기록만 분석한 결과예요. 기록이 없는 날을 0원으로 추정하지 않아요.'],
    recurring: slots.length > 1 && report.subscriptions ? {
      status: 'ready', items: (report.subscriptions.items ?? []).map((s, i) => ({ id: s.id ?? `subscription-${i}`, label: s.serviceName, historyLabel: s.priceHistory, status: s.isPriceIncreased ? 'price_increased' : 'normal', monthlyAmountKrw: s.monthlyAmount })),
      monthlyTotalKrw: report.subscriptions.monthlyTotal, annualizedTotalKrw: report.subscriptions.yearlyTotal,
    } : null,
  }
}

export function toAnalysisResult(response, { snapshot, tone = 'coach', details = [], report = null }) {
  if (!Number.isFinite(response?.summary?.totalExpenseKrw)) throw new Error('서버의 확정 지출 합계가 없어요. 결과를 다시 불러와 주세요.')
  if (response.snapshotId != null && String(response.snapshotId) !== String(snapshot.id)) throw new Error('서버 결과의 확정 기록이 달라요. 검토 화면에서 다시 확인해 주세요.')
  const mappedReport = toReport(report, snapshot.slots, tone)
  const patterns = (response.cards ?? []).map((card) => {
    if (!Number.isFinite(card.sumKrw) || !Number.isFinite(card.chainedSumKrw)) throw new Error('패턴 비용 자료가 없어요. 결과를 다시 불러와 주세요.')
    const detail = details.find((d) => String(d.patternId) === String(card.patternId)) ?? card
    const copy = { observation: detail.observation ?? card.observation, hypothesisQuestion: detail.hypothesisQuestion ?? card.hypothesisQuestion, action: detail.action ?? card.action }
    const monthly = Number.isFinite(detail.monthlyAmountKrw)
    return {
      id: String(card.patternId), analysisId: response.analysisId, mode: 'server', title: detail.title ?? detail.condition ?? card.condition ?? '반복 지출',
      observation: copy.observation, observedDays: card.observedDays, evidenceGrade: card.evidenceGrade,
      amountLabel: monthly ? '월 환산' : '기간 합계', monthlyAmountKrw: monthly ? detail.monthlyAmountKrw : card.sumKrw + card.chainedSumKrw,
      basis: monthly ? detail.basis : '업로드한 기간 기준 · 월 환산 자료는 아직 없어요',
      sumKrw: card.sumKrw, chainedSumKrw: card.chainedSumKrw,
      directMonthlyKrw: monthly ? detail.directMonthlyKrw : card.sumKrw, chainedMonthlyKrw: monthly ? detail.chainedMonthlyKrw : card.chainedSumKrw,
      directDescription: '직접 지출', chainedDescription: '함께 관찰된 후속 지출', icon: 'sparkle', iconTone: 'brand',
      copyByTone: { [tone]: copy, coach: copy }, recommendedTags: detail.recommendedTags ?? [],
      reminderSuggestion: detail.reminderSuggestion ?? null,
      evidence: (detail.evidenceTransactions ?? []).map((t) => ({ id: String(t.transactionId), date: t.date, time: t.time, merchant: t.merchant, amountKrw: t.amountKrw })),
      initialResponse: { revision: detail.revision ?? 0, cause_tags: detail.causeTags ?? [], custom_cause: detail.customReason ?? '', response_status: detail.responseStatus?.toLowerCase() ?? 'unanswered' },
    }
  })
  return { mode: 'server', analysisId: response.analysisId, snapshotId: snapshot.id, slots: snapshot.slots,
    periodLabel: mappedReport?.periodLabel ?? '업로드한 기록 기준', totalKrw: response.summary.totalExpenseKrw, expenseCount: response.summary.transactionCount,
    summaryByTone: { [tone]: response.summary.overallComment, coach: response.summary.overallComment }, patterns: patterns.filter((p) => p.observedDays >= 2), lockedPatterns: patterns.filter((p) => p.observedDays === 1),
    topCategories: mappedReport?.categories.slice(0, 2) ?? [], monthComparison: null, report: mappedReport,
  }
}
