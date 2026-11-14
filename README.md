# 소비 습관 분석 서비스 프론트엔드

은행 거래내역 xlsx 또는 결제 내역 캡처를 바탕으로 반복 지출 습관과 직접·후속 비용을 보여주는 모바일 웹 서비스다.

React + Vite + JavaScript + Tailwind CSS와 React Router를 사용한다.

## 실행과 검증

```sh
npm install
npm run dev
```

| 명령 | 용도 |
|---|---|
| `npm run lint` | ESLint 검사 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 확인 |

`createBrowserRouter`로 해시 없는 주소를 사용한다. 페이지 파일명의 화면 번호와 `Page`를 빼므로 `S00StartPage`는 `/Start`, `S01SettingsPage`는 `/Settings`, `S05PatternDetailPage`는 `/PatternDetail`이다. 전체 매핑은 `src/constants/screens.js`의 `SCREEN_PATHS`에서 관리한다.

이전 `/S00`, `#/S00`, `#/Start` 같은 주소로 접속하면 새 주소로 이동하며, 상세 화면의 쿼리도 유지한다. 시연 모드는 `/Results?mock=1&demo=s05`처럼 지정하며 화면 이동 후에도 유지된다.

Vercel은 `/api/...`를 백엔드로 전달하고 나머지 화면 경로는 `index.html`로 연결한다. 다른 호스팅에서도 화면 주소 직접 접속과 새로고침을 위해 SPA fallback 설정이 필요하다. 분석 데이터 자체는 메모리 상태이므로 새로고침 시 자동 복원되지는 않는다.

## 파일 구조

```text
src/
├─ main.jsx       # React 진입점
├─ App.jsx        # 분석 Provider와 React Router 라우트 구성
├─ index.css      # Tailwind 진입점과 전역 스타일
├─ App.css        # 기존 템플릿 스타일
├─ pages/         # 화면 단위 조립과 전환 연결
├─ components/    # 재사용 UI와 공통 레이아웃
├─ api/           # 서버 요청, 응답 변환과 오류 처리
├─ hooks/         # 재사용 상태·비동기 처리 로직
├─ utils/         # 날짜·금액 표시, 파일 검증 등 순수 함수
├─ constants/     # 화면 ID, 허용 enum과 공통 제한값
├─ mocks/         # 데모 데이터와 교체 가능한 목업 응답
└─ assets/        # import하여 사용하는 이미지 등
public/           # 경로로 직접 참조하는 정적 자산
```

- 빈 디렉터리는 `.gitkeep`으로 Git에 포함한다. 실제 구현 시 파일을 해당 책임에 맞는 폴더에 추가한다.
- 화면 전용 보조 컴포넌트는 해당 화면 가까이에 두고, 공통으로 쓰는 UI는 `components/`에 둔다.
- 화면 ID는 기획 문서의 S00~S10 및 S05-1을 따른다. S04·S07은 예약 번호이며 S11은 발표용 목업이다.
- API 계약이 확정되기 전에는 실제 연동을 가정하지 않고 목업을 `mocks/`에 분리한다.

## 기준 문서

- [AGENT.md](./AGENT.md): 작업 원칙, 폴더별 책임과 검증 기준
- [FunctionalSpec.md](./FunctionalSpec.md): 기능 규칙과 수용 기준
- [UserFlow.md](./UserFlow.md): 화면 ID와 이동·예외 흐름
- [Workboard.xlsx](./Workboard.xlsx): 작업 현황과 역할 분배
