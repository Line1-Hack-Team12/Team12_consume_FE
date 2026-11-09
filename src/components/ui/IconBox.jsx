import Icon from './Icon'

const TONE = {
  brand: 'bg-brand-tint text-brand',
  coral: 'bg-coral-tint text-coral',
  success: 'bg-success-tint text-success',
  gray: 'bg-subtle text-ink-3',
  white: 'bg-surface text-brand',
}

// 아이콘을 둥근 사각 배경에 담는다 (카드 앞머리용)
export default function IconBox({ name, tone = 'brand', size = 20, compact = false, className = '', children }) {
  return (
    <span className={`inline-flex shrink-0 rounded-xl ${compact ? 'p-2' : 'p-[9px]'} ${TONE[tone]} ${className}`}>
      {children ?? <Icon name={name} size={size} />}
    </span>
  )
}
