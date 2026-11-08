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

  useEffect(() => {
    window.history.replaceState({ screen: currentRef.current }, '', `#/${currentRef.current.id}`)
    const onPop = (e) => {
      const entry = e.state?.screen ?? { id: readHash() ?? initialId, params: {}, depth: 0 }
      currentRef.current = entry
      setCurrent(entry)
      window.scrollTo(0, 0)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [initialId])

  const navigate = useCallback((id, params = {}, { replace = false } = {}) => {
    const prev = currentRef.current
    const entry = { id, params, depth: replace ? prev.depth : prev.depth + 1 }
    if (replace) window.history.replaceState({ screen: entry }, '', `#/${id}`)
    else window.history.pushState({ screen: entry }, '', `#/${id}`)
    currentRef.current = entry
    setCurrent(entry)
    window.scrollTo(0, 0)
  }, [])

  const back = useCallback(
    (fallbackId = SCREEN.S00) => {
      if (currentRef.current.depth > 0) window.history.back()
      else navigate(fallbackId, {}, { replace: true })
    },
    [navigate],
  )

  const value = useMemo(() => ({ current, navigate, back }), [current, navigate, back])
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}
