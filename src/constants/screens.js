// 화면 ID · UserFlow.md와 Figma 프레임 이름을 그대로 쓴다. S04·S07은 예약 번호라 만들지 않는다.
export const SCREEN = {
  S00: 'S00',
  S01: 'S01',
  S02: 'S02',
  S03: 'S03',
  S03_E: 'S03-E', // 내역 수정하기
  S03_T: 'S03-T', // 전체 내역 수정하기
  S03_P: 'S03-P', // 확정 후 최종 분석 진행
  E02: 'E02', // 중복 후보 확인
  S05: 'S05',
  S05_1: 'S05-1',
  S06: 'S06',
  S08: 'S08',
  S09: 'S09',
  S10: 'S10',
  S11: 'S11',
  E03: 'E03',
  E06: 'E06',
  E09: 'E09',
}

export const SCREEN_IDS = Object.values(SCREEN)

// 페이지 파일명에서 화면 번호와 Page를 뺀 URL 이름.
export const SCREEN_PATHS = {
  [SCREEN.S00]: '/Start',
  [SCREEN.S01]: '/Settings',
  [SCREEN.S02]: '/Extraction',
  [SCREEN.S03]: '/Review',
  [SCREEN.S03_E]: '/Edit',
  [SCREEN.S03_T]: '/Table',
  [SCREEN.S03_P]: '/Finalizing',
  [SCREEN.E02]: '/Duplicate',
  [SCREEN.S05]: '/Results',
  [SCREEN.S05_1]: '/PatternDetail',
  [SCREEN.S06]: '/Reminder',
  [SCREEN.S08]: '/Report',
  [SCREEN.S09]: '/SavingsPlan',
  [SCREEN.S10]: '/Completion',
  [SCREEN.S11]: '/Comparison',
}
