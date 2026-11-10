// 발표용 합성 예시다. 현재 사용자의 기록·snapshot·선택 플랜과 연결하지 않는다.
// 기간이 다른 관찰 횟수를 보여줄 뿐, 개선율이나 성장 지수를 계산하지 않는다.
export const S11_PREVIEW = {
  patternTitle: '목요일 밤 배달',
  periods: [
    { id: 'before', label: '이전', weeks: 13, count: 11 },
    { id: 'after', label: '이후', weeks: 4, count: 1 },
  ],
}
