import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react'
import { toDraft } from '../../api/adapters'
import { USE_MOCK } from '../../api/config'
import * as sessionApi from '../../api/sessions'
import { DEFAULT_MONTH_COUNT, DEFAULT_TONE } from '../../constants/limits'
import { AnalysisSessionContext } from '../../hooks/analysisSessionContext'
import { createPatternResponseStore } from '../../mocks/patternResponses'
import { createSavingsPlanStore } from '../../mocks/plans'

const initialState = {
  settings: { monthCount: DEFAULT_MONTH_COUNT, lastMonth: '', region: '', payday: '', tone: DEFAULT_TONE },
  files: {},
  consent: false,
  draft: null,
  confirmed: false,
  snapshot: null,
  analysis: null,
  sessionId: null, // 백엔드 세션 ID (API 모드)
  syncError: null, // 서버 반영 실패 문구
}

function reducer(state, action) {
  switch (action.type) {
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'addFiles':
      return {
        ...state,
        files: { ...state.files, [action.month]: [...(state.files[action.month] ?? []), ...action.items] },
      }
    case 'removeFile':
      return {
        ...state,
        files: { ...state.files, [action.month]: (state.files[action.month] ?? []).filter((f) => f.id !== action.id) },
      }
    case 'consent':
      return { ...state, consent: action.value }
    case 'draft':
      return { ...state, draft: action.draft, confirmed: false, snapshot: null, analysis: null }
    case 'updateTransaction': {
      if (!state.draft) return state
      const transactions = state.draft.transactions.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t))
      // 수정하면 확인 체크를 해제한다 (F06)
      return { ...state, draft: { ...state.draft, transactions, revision: state.draft.revision + 1 }, confirmed: false, snapshot: null, analysis: null }
    }
    case 'duplicateDecision': {
      if (!state.draft) return state
      const duplicateGroups = state.draft.duplicateGroups.map((g) =>
        g.id === action.id ? { ...g, decision: action.decision, reviewed: true } : g,
      )
      return { ...state, draft: { ...state.draft, duplicateGroups, revision: state.draft.revision + 1 }, confirmed: false, snapshot: null, analysis: null }
    }
    case 'confirmed':
      return { ...state, confirmed: action.value }
    case 'snapshot':
      return { ...state, snapshot: action.snapshot, analysis: null }
    case 'analysis':
      if (action.analysis?.snapshotId !== state.snapshot?.id) return state
      return { ...state, analysis: action.analysis }
    case 'sessionId':
      return { ...state, sessionId: action.value }
    case 'syncError':
      return { ...state, syncError: action.value }
    default:
      return state
  }
}

export default function AnalysisSessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const urlsRef = useRef(new Set())
  const [patternResponseStore] = useState(createPatternResponseStore)
  const [savingsPlanStore] = useState(() => createSavingsPlanStore({ responseStore: patternResponseStore }))
  const selectedPlan = useSyncExternalStore(savingsPlanStore.subscribe, savingsPlanStore.getSelectedPlan, savingsPlanStore.getSelectedPlan)

  useEffect(() => {
    patternResponseStore.setSnapshot(state.snapshot?.id ?? null)
    savingsPlanStore.setSnapshot(state.snapshot?.id ?? null)
  }, [patternResponseStore, savingsPlanStore, state.snapshot?.id])

  // 화면을 떠날 때 미리보기용 object URL을 정리한다
  useEffect(() => {
    const urls = urlsRef.current
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  const addFiles = useCallback((month, results) => {
    const items = results.map((r) => {
      if (r.status !== 'accepted') return r
      const url = URL.createObjectURL(r.file)
      urlsRef.current.add(url)
      return { ...r, url }
    })
    dispatch({ type: 'addFiles', month, items })
  }, [])

  const removeFile = useCallback((month, file) => {
    if (file.url) {
      URL.revokeObjectURL(file.url)
      urlsRef.current.delete(file.url)
    }
    dispatch({ type: 'removeFile', month, id: file.id })
  }, [])

  // API 모드에서 서버 호출에 쓸 최신 상태
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  const reportError = useCallback((err) => {
    dispatch({ type: 'syncError', value: err?.message ?? '서버에 반영하지 못했어요. 다시 시도해 주세요.' })
  }, [])

  // S03-E·S03 검토 큐 처리 → PUT /api/transactions/{id}, 큐를 다 처리하면 POST /review/queue/confirm
  const updateTransaction = useCallback(
    (id, patch) => {
      const before = stateRef.current.draft?.transactions.find((t) => t.id === id)
      dispatch({ type: 'updateTransaction', id, patch })
      if (USE_MOCK || !before?.serverId) return
      const next = { ...before, ...patch }
      const action = patch.included === false ? 'EXCLUDE' : patch.included === true && !before.included ? 'RESTORE' : patch.reviewStatus === 'kept' ? 'KEEP' : 'EDIT'
      const sessionId = stateRef.current.sessionId
      sessionApi
        .updateTransaction(before.serverId, next, action)
        .then(() => {
          const rows = stateRef.current.draft?.transactions ?? []
          const queue = rows.filter((t) => t.reviewReasons.length > 0)
          if (queue.length > 0 && queue.every((t) => t.reviewStatus !== 'pending') && before.reviewStatus === 'pending') {
            return sessionApi.confirmReviewQueue(sessionId, queue.map((t) => ({ transactionId: t.serverId, applySuggested: false })))
          }
          return null
        })
        .catch(reportError)
    },
    [reportError],
  )

  // E02 → POST /duplicates/resolve
  const setDuplicateDecision = useCallback(
    (id, decision) => {
      const group = stateRef.current.draft?.duplicateGroups.find((g) => g.id === id)
      dispatch({ type: 'duplicateDecision', id, decision })
      if (USE_MOCK || group?.serverGroupId == null) return
      sessionApi.resolveDuplicate(stateRef.current.sessionId, group.serverGroupId, decision === 'merge' ? 'SAME_TRANSACTION' : 'SEPARATE').catch(reportError)
    },
    [reportError],
  )

  // S03 확인 체크 → POST /review/check
  const setConfirmed = useCallback(
    (value) => {
      dispatch({ type: 'confirmed', value })
      if (USE_MOCK || !value || !stateRef.current.sessionId) return
      sessionApi.checkReview(stateRef.current.sessionId).catch((err) => {
        dispatch({ type: 'confirmed', value: false })
        reportError(err)
      })
    },
    [reportError],
  )

  // 추출이 끝난 뒤 서버의 거래 표를 불러와 draft로 만든다
  const loadDraftFromServer = useCallback(async (sessionId) => {
    const [list, review, duplicates] = await Promise.all([
      sessionApi.getTransactions(sessionId),
      sessionApi.getReview(sessionId),
      sessionApi.getDuplicates(sessionId).catch(() => null),
    ])
    dispatch({ type: 'draft', draft: toDraft({ list, review, duplicates }) })
  }, [])

  const actions = useMemo(
    () => ({
      updateSettings: (patch) => dispatch({ type: 'settings', patch }),
      addFiles,
      removeFile,
      setConsent: (value) => dispatch({ type: 'consent', value }),
      setDraft: (draft) => dispatch({ type: 'draft', draft }),
      updateTransaction,
      setDuplicateDecision,
      setConfirmed,
      setSnapshot: (snapshot) => dispatch({ type: 'snapshot', snapshot }),
      setAnalysis: (analysis) => dispatch({ type: 'analysis', analysis }),
      setSessionId: (value) => dispatch({ type: 'sessionId', value }),
      clearSyncError: () => dispatch({ type: 'syncError', value: null }),
      loadDraftFromServer,
      // S03-R → POST /confirm (목업 모드에서는 바로 통과)
      confirmReview: () => (USE_MOCK || !stateRef.current.sessionId ? Promise.resolve(null) : sessionApi.confirmSession(stateRef.current.sessionId)),
    }),
    [addFiles, removeFile, updateTransaction, setDuplicateDecision, setConfirmed, loadDraftFromServer],
  )

  const value = useMemo(() => ({ ...state, ...actions, patternResponseStore, savingsPlanStore, selectedPlan }), [state, actions, patternResponseStore, savingsPlanStore, selectedPlan])
  return <AnalysisSessionContext.Provider value={value}>{children}</AnalysisSessionContext.Provider>
}
