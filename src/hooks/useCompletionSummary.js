import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { S10_PREVIEW_PLAN } from '../mocks/completionPreview'
import { createInitialPatternResponse } from '../mocks/patternResponses'
import { createCompletionSnapshotReader, summarizeCompletion } from '../utils/completionSummary'
import { useAnalysisSession } from './analysisSessionContext'

export default function useCompletionSummary({ result, designPreview = false }) {
  const { snapshot, analysis, patternResponseStore, savingsPlanStore } = useAnalysisSession()
  const preview = import.meta.env.DEV && designPreview
  const valid = Boolean(result && Array.isArray(result.patterns) && (preview
    || (snapshot?.id === result.snapshotId && analysis?.snapshotId === result.snapshotId)))
  const patterns = useMemo(() => valid ? result.patterns : [], [valid, result])
  const scope = valid ? `${preview ? 'preview' : 'snapshot'}:${result.snapshotId}` : null
  const fallbackEntries = useMemo(() => patterns.map((pattern) => {
    const response = createInitialPatternResponse(pattern, { designPreview: preview })
    return { saved: response, draft: response, dirty: false, saving: false, error: null }
  }), [patterns, preview])
  const getSnapshot = useMemo(() => createCompletionSnapshotReader({
    patterns, scope, fallbackEntries,
    getResponseEntry: patternResponseStore.get,
    getPlanEntry: savingsPlanStore.get,
  }), [patterns, scope, fallbackEntries, patternResponseStore, savingsPlanStore])
  const subscribe = useCallback((listener) => {
    const unsubscribeResponses = patternResponseStore.subscribe(listener)
    const unsubscribePlans = savingsPlanStore.subscribe(listener)
    return () => { unsubscribeResponses(); unsubscribePlans() }
  }, [patternResponseStore, savingsPlanStore])
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return useMemo(() => {
    // 미리보기의 최초 방문에서만 별도 합성 선택 예시를 쓴다. S09를 열거나 선택한 뒤에는 실제 세션 상태를 따른다.
    const planSelection = state.planEntry === undefined && preview && valid
      ? { scope, snapshotId: result.snapshotId, plan: S10_PREVIEW_PLAN }
      : state.planEntry?.selectedPlan ?? null
    return summarizeCompletion({ patterns, entries: state.entries, scope, snapshotId: result?.snapshotId, planSelection })
  }, [state, preview, valid, scope, result, patterns])
}
