// API 모드 스위치
// - 기본은 실제 백엔드 API를 쓴다 (/api 요청은 Vite 개발 서버·Vercel이 백엔드로 넘겨준다).
// - 주소 뒤에 ?mock=1 을 붙이거나 VITE_USE_MOCK=true 로 빌드하면 src/mocks 목업으로 동작한다.
//   (백엔드가 멈췄을 때 발표·시연용 대비)
const param = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('mock') : null

export const USE_MOCK = param === '1' || (param !== '0' && import.meta.env.VITE_USE_MOCK === 'true')

export const API_BASE = import.meta.env.VITE_API_BASE ?? ''
