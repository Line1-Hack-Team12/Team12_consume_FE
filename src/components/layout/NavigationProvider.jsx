import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { SCREEN, SCREEN_PATHS } from '../../constants/screens'
import { NavigationContext } from '../../hooks/navigationContext'

// URL과 이동 기록은 React Router가 관리하고, 목록 UI 상태만 메모리에 보관한다.
export default function NavigationProvider({ children }) {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const viewStatesRef = useRef(new Map())
  const activeKeyRef = useRef(location.key)
  const previousFocusRef = useRef(null)

  const current = useMemo(() => {
    const params = { ...Object.fromEntries(new URLSearchParams(location.search)), ...location.state?.params }
    if (params.index !== undefined) params.index = Math.max(0, Number.parseInt(params.index, 10) || 0)
    const pathname = location.pathname.replace(/\/+$/, '').toLowerCase()
    const id = Object.keys(SCREEN_PATHS).find((key) => SCREEN_PATHS[key].toLowerCase() === pathname)
      ?? location.pathname.slice(1)
    return { id, params, key: location.key }
  }, [location])

  const getViewState = useCallback((key) => viewStatesRef.current.get(key), [])
  const saveViewState = useCallback((key, state) => {
    viewStatesRef.current.set(key, state)
  }, [])
  const isCurrentView = useCallback((key) => activeKeyRef.current === key, [])

  useLayoutEffect(() => {
    activeKeyRef.current = location.key
    if (!viewStatesRef.current.has(location.key)) window.scrollTo(0, 0)
  }, [location.key])

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = previousRestoration }
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const main = document.querySelector('main')
      const previousFocus = previousFocusRef.current
      previousFocusRef.current = null
      if (document.querySelector('dialog[open]')) return
      if (main?.contains(document.activeElement) && document.activeElement !== previousFocus) return
      main?.querySelector('h1')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.key])

  const navigate = useCallback((id, params = {}, { replace = false } = {}) => {
    previousFocusRef.current = document.activeElement
    const search = new URLSearchParams()
    // 시연 모드는 화면 이동·새로고침 후에도 유지한다.
    const currentSearch = new URLSearchParams(location.search)
    for (const key of ['mock', 'demo', 'responseDemo', 'planDemo']) {
      if (currentSearch.has(key)) search.set(key, currentSearch.get(key))
    }
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) search.set(key, String(value))
    }
    return routerNavigate({ pathname: SCREEN_PATHS[id] ?? `/${id}`, search: search.toString() }, {
      replace,
      state: { params, depth: (location.state?.depth ?? 0) + (replace ? 0 : 1) },
    })
  }, [routerNavigate, location.state, location.search])

  const back = useCallback((fallbackId = SCREEN.S00) => {
    previousFocusRef.current = document.activeElement
    if ((location.state?.depth ?? 0) > 0) return routerNavigate(-1)
    return navigate(fallbackId, {}, { replace: true })
  }, [routerNavigate, location.state, navigate])

  const value = useMemo(
    () => ({ current, navigate, back, getViewState, saveViewState, isCurrentView }),
    [current, navigate, back, getViewState, saveViewState, isCurrentView],
  )
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}
