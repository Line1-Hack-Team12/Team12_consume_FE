import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SCREEN, SCREEN_IDS } from '../../constants/screens'
import { NavigationContext } from '../../hooks/navigationContext'

function readHash() {
  const id = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''))
  return SCREEN_IDS.includes(id) ? id : null
}

function initialEntry(initialId) {
  const fromState = window.history.state
  if (fromState?.screen && SCREEN_IDS.includes(fromState.screen.id)) return fromState.screen
  return { id: readHash() ?? initialId, params: {}, depth: 0 }
}

export default function NavigationProvider({ initialId = SCREEN.S00, children }) {
  const [current, setCurrent] = useState(() => initialEntry(initialId))
  const currentRef = useRef(current)
  const blockerRef = useRef(null)
  const restoringPopRef = useRef(null)
  const skipNextPopRef = useRef(false)

  const blockNavigation = useCallback((blocker) => {
    blockerRef.current = blocker
    return () => {
      if (blockerRef.current === blocker) blockerRef.current = null
    }
  }, [])

  useEffect(() => {
    window.history.replaceState({ screen: currentRef.current }, '', `#/${currentRef.current.id}`)
    const onPop = (e) => {
      const entry = e.state?.screen ?? { id: readHash() ?? initialId, params: {}, depth: 0 }
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
    return () => window.removeEventListener('popstate', onPop)
  }, [initialId])

  const navigate = useCallback((id, params = {}, { replace = false, skipBlocker = false } = {}) => {
    const proceed = () => {
      const prev = currentRef.current
      const entry = { id, params, depth: replace ? prev.depth : prev.depth + 1 }
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

  const value = useMemo(() => ({ current, navigate, back, blockNavigation }), [current, navigate, back, blockNavigation])
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}
