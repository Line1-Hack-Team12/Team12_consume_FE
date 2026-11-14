import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react'
import { toDraft } from '../../api/adapters'
import { USE_MOCK } from '../../api/config'
import * as sessionApi from '../../api/sessions'
import { DEFAULT_MONTH_COUNT, DEFAULT_TONE } from '../../constants/limits'
import { buildSlots } from '../../utils/months'
import { regenerateNarratives, savePatternResponse } from '../../api/analysis'
import { AnalysisSessionContext } from '../../hooks/analysisSessionContext'
import { createPatternResponseStore } from '../../mocks/patternResponses'
import { createSavingsPlanStore } from '../../mocks/plans'

const initialState = {
  settings: { monthCount: DEFAULT_MONTH_COUNT, lastMonth: '', ownerName: '', region: '', payday: '', tone: DEFAULT_TONE },
  files: {},
  bankFiles: [],
  consent: false,
  draft: null,
  confirmed: false,
  snapshot: null,
  analysis: null,
  sessionId: null, // 백엔드 세션 ID (API 모드)
  syncError: null, // 서버 반영 실패 문구
  narrativeError: '',
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
    case 'addBankFiles':
      return { ...state, bankFiles: [...state.bankFiles, ...action.items] }
    case 'bankPassword':
      return { ...state, bankFiles: state.bankFiles.map((f) => f.id === action.id ? { ...f, password: action.password } : f) }
    case 'removeBankFile':
      return { ...state, bankFiles: state.bankFiles.filter((f) => f.id !== action.id) }
    case 'clearPasswords':
      return { ...state, bankFiles: state.bankFiles.map((f) => ({ ...f, password: '' })) }
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
      return { ...state, draft: { ...state.draft, transactions, revision: action.revision ?? (state.draft.revision == null ? null : state.draft.revision + 1) }, confirmed: false, snapshot: null, analysis: null }
    }
    case 'duplicateDecision': {
      if (!state.draft) return state
      const duplicateGroups = state.draft.duplicateGroups.map((g) =>
        g.id === action.id ? { ...g, decision: action.decision, reviewed: true } : g,
      )
      return { ...state, draft: { ...state.draft, duplicateGroups, revision: action.revision ?? (state.draft.revision == null ? null : state.draft.revision + 1) }, confirmed: false, snapshot: null, analysis: null }
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
    case 'narrativeError':
      return { ...state, narrativeError: action.value }
    default:
      return state
  }
}

export default function AnalysisSessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [syncBusy, setSyncBusy] = useState(false)
  const [toneBusy, setToneBusy] = useState(false)
  const savingRef = useRef(false)
  const [patternResponseStore] = useState(() => createPatternResponseStore({ saveResponse: savePatternResponse }))
  const [savingsPlanStore] = useState(() => createSavingsPlanStore({ responseStore: patternResponseStore }))
  const selectedPlan = useSyncExternalStore(savingsPlanStore.subscribe, savingsPlanStore.getSelectedPlan, savingsPlanStore.getSelectedPlan)

  useEffect(() => {
    patternResponseStore.setSnapshot(state.snapshot?.id ?? null)
    savingsPlanStore.setSnapshot(state.snapshot?.id ?? null)
  }, [patternResponseStore, savingsPlanStore, state.snapshot?.id])

  const addFiles = useCallback((month, results) => {
    dispatch({ type: 'addFiles', month, items: results })
  }, [])

  const removeFile = useCallback((month, file) => {
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

  const setTone = useCallback(async (tone) => {
    const current = stateRef.current.analysis
    if (current?.mode !== 'server') { dispatch({ type: 'settings', patch: { tone } }); return }
    setToneBusy(true)
    try {
      const response = await regenerateNarratives(current.analysisId, { coach: 'COACH', friend: 'FRIEND', grandma: 'GRANDMOTHER' }[tone])
      if (stateRef.current.analysis?.snapshotId !== current.snapshotId) return
      dispatch({ type: 'analysis', analysis: { ...current, summaryByTone: { ...current.summaryByTone, [tone]: response.overallComment }, patterns: current.patterns.map((pattern) => {
        const copy = response.narratives?.find((n) => String(n.patternId) === pattern.id)
        return copy ? { ...pattern, copyByTone: { ...pattern.copyByTone, [tone]: { observation: copy.observation, hypothesisQuestion: copy.hypothesisQuestion, action: copy.action } } } : pattern
      }) } })
      dispatch({ type: 'narrativeError', value: '' })
    } catch {
      dispatch({ type: 'narrativeError', value: '말투를 바꾸지 못해 기본 표현으로 보여드려요. 숫자와 근거는 그대로예요.' })
    } finally { dispatch({ type: 'settings', patch: { tone } }); setToneBusy(false) }
  }, [])

  // S03-E·S03 검토 큐 처리 → PUT /api/transactions/{id}, 큐를 다 처리하면 POST /review/queue/confirm
  const updateTransaction = useCallback(
    async (id, patch) => {
      const before = stateRef.current.draft?.transactions.find((t) => t.id === id)
      if (!before || savingRef.current) return false
      if (USE_MOCK) { dispatch({ type: 'updateTransaction', id, patch }); return true }
      if (!before.serverId) return false
      if (['subcategory', 'slotMonth'].some((key) => key in patch && (patch[key] ?? null) !== (before[key] ?? null)) || ('time' in patch && before.time && !patch.time)) {
        reportError(new Error('하위 분류·기록 월 변경과 기존 시각 삭제는 아직 저장할 수 없어요. 입력은 유지했으니 기존 값으로 되돌리거나 나중에 다시 저장해 주세요.'))
        return false
      }
      savingRef.current = true
      setSyncBusy(true)
      dispatch({ type: 'syncError', value: null })
      const next = { ...before, ...patch }
      const action = patch.included === false ? 'EXCLUDE' : patch.included === true && !before.included ? 'RESTORE' : patch.reviewStatus === 'kept' ? 'KEEP' : 'EDIT'
      const sessionId = stateRef.current.sessionId
      try {
          const result = await sessionApi.updateTransaction(before.serverId, next, action)
          const changedFields = ['direction', 'kind', 'category', 'subcategory', 'slotMonth'].filter((key) => (next[key] ?? null) !== (before[key] ?? null))
          if (changedFields.length) {
            const saved = await sessionApi.getTransaction(before.serverId)
            const actual = { ...saved, kind: saved.kind ?? saved.type, direction: ['입금', 'in'].includes(saved.direction) ? 'in' : ['출금', 'out'].includes(saved.direction) ? 'out' : 'unknown' }
            if (changedFields.some((key) => (actual[key] ?? null) !== (next[key] ?? null))) throw new Error('서버에서 수정 내용을 반영하지 못했어요. 입력은 유지했으니 다시 저장해 주세요.')
          }
          const rows = stateRef.current.draft.transactions.map((t) => t.id === id ? next : t)
          const queue = rows.filter((t) => t.reviewReasons.length > 0)
          if (queue.length > 0 && queue.every((t) => t.reviewStatus !== 'pending') && before.reviewStatus === 'pending') {
            await sessionApi.confirmReviewQueue(sessionId, queue.map((t) => ({ transactionId: t.serverId, applySuggested: false })))
          }
          dispatch({ type: 'updateTransaction', id, patch, revision: result?.revision })
          return true
      } catch (err) { reportError(err); return false }
      finally { savingRef.current = false; setSyncBusy(false) }
    },
    [reportError],
  )

  // E02 → POST /duplicates/resolve
  const setDuplicateDecision = useCallback(
    async (id, decision) => {
      const group = stateRef.current.draft?.duplicateGroups.find((g) => g.id === id)
      if (!group || savingRef.current) return false
      if (USE_MOCK) { dispatch({ type: 'duplicateDecision', id, decision }); return true }
      savingRef.current = true; setSyncBusy(true)
      try {
        const result = await sessionApi.resolveDuplicate(stateRef.current.sessionId, group.serverGroupId, decision === 'merge' ? 'SAME_TRANSACTION' : 'SEPARATE')
        dispatch({ type: 'duplicateDecision', id, decision, revision: result?.revision })
        dispatch({ type: 'syncError', value: null })
        return true
      } catch (err) { reportError(err); return false }
      finally { savingRef.current = false; setSyncBusy(false) }
    },
    [reportError],
  )

  // S03 확인 체크 → POST /review/check
  const setConfirmed = useCallback(
    async (value) => {
      if (savingRef.current) return
      if (USE_MOCK || !value) { dispatch({ type: 'confirmed', value }); return }
      savingRef.current = true; setSyncBusy(true)
      try {
        await sessionApi.checkReview(stateRef.current.sessionId)
        dispatch({ type: 'confirmed', value: true })
        dispatch({ type: 'syncError', value: null })
      } catch (err) { reportError(err) }
      finally { savingRef.current = false; setSyncBusy(false) }
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
    const settings = stateRef.current.settings
    const slots = buildSlots(settings.lastMonth, settings.monthCount)
    const draft = toDraft({ list, review, duplicates }, { slots })
    dispatch({ type: 'draft', draft })
    return draft
  }, [])

  const actions = useMemo(
    () => ({
      updateSettings: (patch) => dispatch({ type: 'settings', patch }),
      setTone,
      addFiles,
      removeFile,
      addBankFiles: (_, items) => dispatch({ type: 'addBankFiles', items }),
      removeBankFile: (_, file) => dispatch({ type: 'removeBankFile', id: file.id }),
      setBankPassword: (id, password) => dispatch({ type: 'bankPassword', id, password }),
      clearFilePasswords: () => dispatch({ type: 'clearPasswords' }),
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
      confirmReview: () => {
        if (savingRef.current || stateRef.current.syncError) return Promise.reject(new Error('저장 상태를 먼저 확인해 주세요.'))
        return USE_MOCK ? Promise.resolve(null) : sessionApi.confirmSession(stateRef.current.sessionId)
      },
    }),
    [addFiles, removeFile, updateTransaction, setDuplicateDecision, setConfirmed, loadDraftFromServer, setTone],
  )

  const value = useMemo(() => ({ ...state, ...actions, syncBusy, toneBusy, patternResponseStore, savingsPlanStore, selectedPlan }), [state, actions, syncBusy, toneBusy, patternResponseStore, savingsPlanStore, selectedPlan])
  return <AnalysisSessionContext.Provider value={value}>{children}</AnalysisSessionContext.Provider>
}
