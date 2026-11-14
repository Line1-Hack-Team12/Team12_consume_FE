// Figma 🧩 Components 페이지의 icon/* 와 같은 24px 아이콘. 색은 currentColor를 따른다.
const PATHS = {
  'chevron-left': <path d="M15 18l-6-6 6-6" />,
  'chevron-right': <path d="M9 18l6-6-6-6" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2.4" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16z" />
      <path d="M10 20.5a2 2 0 004 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" strokeWidth="2.2" />,
  file: (
    <>
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" />
      <path d="M14 3v6h6M8 13h8M8 17h6" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <circle cx="9" cy="10" r="1.8" fill="currentColor" stroke="none" />
      <path d="M4 17l5-4.5 4 3.5 3-2.5 4.5 3.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  sparkle: (
    <>
      <path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9L12 3z" fill="currentColor" stroke="none" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" fill="currentColor" stroke="none" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4l9 16H3l9-16z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.3" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4z" />,
  moon: <path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z" />,
  rain: (
    <>
      <path d="M7 15a4 4 0 01-.5-8A5.5 5.5 0 0117 7.5a3.8 3.8 0 01.5 7.5H7z" />
      <path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5" />
    </>
  ),
  chart: <path d="M5 20V11M12 20V5M19 20v-6" strokeWidth="2.4" />,
  piggy: (
    <>
      <path d="M5 12a7 6 0 0113-3.5l2.5-.5-.8 3A6 6 0 0119 15l-1 1v3h-3v-1.5h-4V19H8v-2.5A6 6 0 015 12z" />
      <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
    </>
  ),
}

export default function Icon({ name, size = 24, className = '', title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  )
}
