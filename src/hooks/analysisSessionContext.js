import { createContext, useContext } from 'react'

/**
 * 분석 세션 상태 (S01~S03에서 쓰고 S05 이후에서 읽는다)
 * - settings: { monthCount, lastMonth, region, payday, tone }
 * - files: { [slotMonth]: LocalFile[] }  · 브라우저 안에서만 들고 있는 선택 파일
 * - consent: 분석 동의 여부
 * - draft: 추출 후 검토 중인 거래 표 (확정 전)
 * - confirmed: S03 "건수와 합계를 확인했어요" 체크
 * - snapshot: 확정된 표 요약 (확정 후 읽기 전용)
 * 실제 서버 연동 시 draft/snapshot은 서버 응답으로 채운다.
 */
export const AnalysisSessionContext = createContext(null)

export function useAnalysisSession() {
  const ctx = useContext(AnalysisSessionContext)
  if (!ctx) throw new Error('useAnalysisSession은 AnalysisSessionProvider 안에서만 쓸 수 있어요')
  return ctx
}
