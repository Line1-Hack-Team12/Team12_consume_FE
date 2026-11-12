import { createContext, useContext } from 'react'

/**
 * 화면 전환 컨텍스트 · 라우터 없이 화면 ID로 이동한다.
 * - current: { id, params }
 * - navigate(id, params?, { replace?, skipBlocker? })
 * - back(fallbackId?, { skipBlocker? }): 브라우저 뒤로 가기. 첫 화면이면 fallbackId로 이동한다.
 * - blockNavigation(blocker): 이동 전 확인을 등록한다. blocker는 승인 후 실행할 proceed를 받으며, 반환 함수로 등록을 해제한다.
 * URL 해시(#/S01)와 동기화되므로 새로고침·브라우저 뒤로 가기에서도 같은 화면이 열린다.
 */
export const NavigationContext = createContext(null)

export function useNavigation() {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useNavigation은 NavigationProvider 안에서만 쓸 수 있어요')
  return ctx
}
