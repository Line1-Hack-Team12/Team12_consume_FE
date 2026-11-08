// 흰 카드 기본 컨테이너. tone으로 배경만 바꾼다.
const TONE = {
  surface: 'bg-surface',
  canvas: 'bg-canvas',
  brand: 'bg-brand-tint',
  success: 'bg-success-tint',
  deep: 'bg-brand-deep text-white',
}

export default function Card({ tone = 'surface', as: Tag = 'section', className = '', children, ...props }) {
  return (
    <Tag className={`rounded-[18px] p-[18px] ${TONE[tone]} ${className}`} {...props}>
      {children}
    </Tag>
  )
}
