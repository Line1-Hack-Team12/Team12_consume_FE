// F01·F02 설정과 업로드 제한값
export const MONTH_COUNTS = [1, 2, 3]
export const DEFAULT_MONTH_COUNT = 3
export const SELECTABLE_MONTH_RANGE = 12 // 마지막 달 드롭다운에 보여줄 과거 개월 수

export const MAX_FILES_PER_UPLOAD = 10
export const MAX_FILE_BYTES = 10 * 1024 * 1024 // 보조 캡처·PDF
export const MAX_BANK_FILE_BYTES = 20 * 1024 * 1024
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const IMAGE_ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,' + IMAGE_MIME_TYPES.join(',')
export const PDF_MIME_TYPE = 'application/pdf'
export const SUPPLEMENT_ACCEPT_ATTR = `${IMAGE_ACCEPT_ATTR},.pdf,${PDF_MIME_TYPE}`
export const BANK_FILE_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const BANK_ACCEPT_ATTR = `.xlsx,${BANK_FILE_MIME}`

export const TIME_ZONE = 'Asia/Seoul'

// 말투 (F16)
export const TONES = [
  { value: 'coach', label: '코치' },
  { value: 'friend', label: '친구' },
  { value: 'grandma', label: '할머니' },
]
export const DEFAULT_TONE = 'coach'

export const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

// 급여일: 1~31 또는 말일(last). 선택 항목이며 P2 분석 축에만 쓴다.
export const PAYDAY_OPTIONS = [
  ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}일` })),
  { value: 'last', label: '말일' },
]

// 거래 분류 (F07) · 상위 7개 enum, 하위는 null 허용
export const CATEGORIES = [
  { value: 'food', label: '식비', subs: ['외식', '주점'] },
  { value: 'delivery', label: '배달', subs: [] },
  { value: 'cafe', label: '카페', subs: [] },
  { value: 'shopping', label: '쇼핑', subs: ['온라인', '오프라인'] },
  { value: 'transport', label: '교통', subs: ['택시', '대중교통'] },
  { value: 'living', label: '생활', subs: ['편의점', '구독', '주거·통신', '의료'] },
  { value: 'other', label: '기타', subs: ['이체', '여가', '차량', '미분류'] },
]

export const DIRECTIONS = [
  { value: 'out', label: '출금' },
  { value: 'in', label: '입금' },
  { value: 'unknown', label: '모름' },
]

export const KINDS = [
  { value: 'expense', label: '지출' },
  { value: 'income', label: '수입' },
  { value: 'transfer', label: '이체' },
  { value: 'self_transfer', label: '본인 계좌 이동' },
  { value: 'refund', label: '환불' },
  { value: 'cancel', label: '취소' },
  { value: 'unknown', label: '모름' },
]
