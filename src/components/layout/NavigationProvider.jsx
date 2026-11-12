import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SCREEN, SCREEN_IDS } from '../../constants/screens'
import { NavigationContext } from '../../hooks/navigationContext'

function readHash() {
  const id = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''))
  return SCREEN_IDS.includes(id) ? id : null
}

function initialEntry(initialId) {
  const fromState = window.history.state
  if (fromState?.screen && SCREEN_IDS.includes(fromState.screen.id)) {
    return { ...fromState.screen, key: fromState.screen.key ?? crypto.randomUUID() }
  }
  return { id: readHash() ?? initialId, params: {}, depth: 0, key: crypto.randomUUID() }
}

export default function NavigationProvider({ initialId = SCREEN.S00, children }) {
  const [current, setCurrent] = useState(() => initialEntry(initialId))
  const currentRef = useRef(current)
  const blockerRef = useRef(null)
  const restoringPopRef = useRef(null)
  const skipNextPopRef = useRef(false)
  const viewStatesRef = useRef(new Map())

  // 화면 방문별 UI 상태만 메모리에 보관한다. 새로고침 후에는 복원하지 않는다.
  const getViewState = useCallback((key) => viewStatesRef.current.get(key), [])
  const saveViewState = useCallback((key, state) => {
    viewStatesRef.current.set(key, state)
  }, [])

  const blockNavigation = useCallback((blocker) => {
    blockerRef.current = blocker
    return () => {
      if (blockerRef.current === blocker) blockerRef.current = null
    }
  }, [])

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    // 목록 DOM이 다시 그려진 뒤 각 화면에서 스크롤 위치를 복원한다.
    window.history.scrollRestoration = 'manual'
    window.history.replaceState({ screen: currentRef.current }, '', `#/${currentRef.current.id}`)
    const onPop = (e) => {
      const entry = initialEntry(initialId)
      if (!e.state?.screen?.key) {
        window.history.replaceState({ screen: entry }, '', `#/${entry.id}`)
      }
      const previous = currentRef.current
      const delta = previous.depth - entry.depth

      // 브라우저 이동을 되돌리는 동안에는 현재 화면과 입력값을 유지한다.
      if (restoringPopRef.current) {
        if (delta !== 0) {
          window.history.go(delta)
          return
        }
        const pending = restoringPopRef.current
        restoringPopRef.current = null
        pending.blocker(pending.proceed)
        return
      }

      if (skipNextPopRef.current) {
        skipNextPopRef.current = false
      } else if (blockerRef.current) {
        if (delta !== 0) {
          restoringPopRef.current = {
            blocker: blockerRef.current,
            proceed: () => {
              skipNextPopRef.current = true
              window.history.go(-delta)
            },
          }
          window.history.go(delta)
        } else {
          window.history.replaceState({ screen: previous }, '', `#/${previous.id}`)
          blockerRef.current(() => {
            window.history.replaceState({ screen: entry }, '', `#/${entry.id}`)
            currentRef.current = entry
            setCurrent(entry)
            window.scrollTo(0, 0)
          })
        }
        return
      }
      currentRef.current = entry
      setCurrent(entry)
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.history.scrollRestoration = previousRestoration
    }
  }, [initialId])

  const navigate = useCallback((id, params = {}, { replace = false, skipBlocker = false } = {}) => {
    const proceed = () => {
      const prev = currentRef.current
      const entry = { id, params, depth: replace ? prev.depth : prev.depth + 1, key: crypto.randomUUID() }
      if (replace) window.history.replaceState({ screen: entry }, '', `#/${id}`)
      else window.history.pushState({ screen: entry }, '', `#/${id}`)
      currentRef.current = entry
      setCurrent(entry)
      window.scrollTo(0, 0)
    }
    if (!skipBlocker && blockerRef.current) blockerRef.current(proceed)
    else proceed()
  }, [])

  const back = useCallback(
    (fallbackId = SCREEN.S00, { skipBlocker = false } = {}) => {
      const proceed = () => {
        if (currentRef.current.depth > 0) {
          skipNextPopRef.current = true
          window.history.back()
        } else navigate(fallbackId, {}, { replace: true, skipBlocker: true })
      }
      if (!skipBlocker && blockerRef.current) blockerRef.current(proceed)
      else proceed()
    },
    [navigate],
  )

  const value = useMemo(
    () => ({ current, navigate, back, blockNavigation, getViewState, saveViewState }),
    [current, navigate, back, blockNavigation, getViewState, saveViewState],
  )
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}
