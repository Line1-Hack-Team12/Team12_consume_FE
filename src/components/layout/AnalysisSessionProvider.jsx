import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { DEFAULT_MONTH_COUNT, DEFAULT_TONE } from '../../constants/limits'
import { AnalysisSessionContext } from '../../hooks/analysisSessionContext'

const initialState = {
  settings: { monthCount: DEFAULT_MONTH_COUNT, lastMonth: '', region: '', payday: '', tone: DEFAULT_TONE },
  files: {},
  consent: false,
  draft: null,
  confirmed: false,
  snapshot: null,
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
      return { ...state, draft: action.draft, confirmed: false, snapshot: null }
    case 'updateTransaction': {
      if (!state.draft) return state
      const transactions = state.draft.transactions.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t))
      // 수정하면 확인 체크를 해제한다 (F06)
      return { ...state, draft: { ...state.draft, transactions, revision: state.draft.revision + 1 }, confirmed: false }
    }
    case 'duplicateDecision': {
      if (!state.draft) return state
      const duplicateGroups = state.draft.duplicateGroups.map((g) =>
        g.id === action.id ? { ...g, decision: action.decision, reviewed: true } : g,
      )
      return { ...state, draft: { ...state.draft, duplicateGroups, revision: state.draft.revision + 1 }, confirmed: false }
    }
    case 'confirmed':
      return { ...state, confirmed: action.value }
    case 'snapshot':
      return { ...state, snapshot: action.snapshot }
    default:
      return state
  }
}

export default function AnalysisSessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const urlsRef = useRef(new Set())

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

  const actions = useMemo(
    () => ({
      updateSettings: (patch) => dispatch({ type: 'settings', patch }),
      addFiles,
      removeFile,
      setConsent: (value) => dispatch({ type: 'consent', value }),
      setDraft: (draft) => dispatch({ type: 'draft', draft }),
      updateTransaction: (id, patch) => dispatch({ type: 'updateTransaction', id, patch }),
      setDuplicateDecision: (id, decision) => dispatch({ type: 'duplicateDecision', id, decision }),
      setConfirmed: (value) => dispatch({ type: 'confirmed', value }),
      setSnapshot: (snapshot) => dispatch({ type: 'snapshot', snapshot }),
    }),
    [addFiles, removeFile],
  )

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions])
  return <AnalysisSessionContext.Provider value={value}>{children}</AnalysisSessionContext.Provider>
}
