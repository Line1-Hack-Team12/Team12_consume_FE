import { createContext, useContext } from 'react'

/**
 * React Router를 화면 ID 기반 호출과 연결하는 앱 전용 컨텍스트.
 * - current: { id, params, key } · key는 화면 방문을 구분한다.
 * - navigate(id, params?, { replace? }): 매개변수를 URL 쿼리에도 기록한다.
 * - back(fallbackId?): 앱 내 이전 기록이 없으면 fallbackId로 이동한다.
 * - getViewState(key) / saveViewState(key, state): 화면 방문별 UI 상태를 현재 탭의 메모리에서 읽고 쓴다.
 * 이동 차단은 편집 화면의 React Router useBlocker가 담당한다.
 */
export const NavigationContext = createContext(null)

export function useAppNavigation() {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useAppNavigation은 NavigationProvider 안에서만 쓸 수 있어요')
  return ctx
}
