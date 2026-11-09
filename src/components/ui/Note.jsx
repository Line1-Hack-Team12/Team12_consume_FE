import Icon from './Icon'

// 안내 박스 (정보·경고·회색)
const TONE = {
  brand: ['bg-brand-tint text-brand-deep', 'text-brand'],
  warn: ['bg-warning-tint text-ink', 'text-warning-ink'],
  gray: ['bg-subtle text-ink-2', 'text-ink-3'],
  success: ['bg-success-tint text-ink', 'text-success-ink'],
  danger: ['bg-danger-tint text-ink', 'text-danger-ink'],
}

export default function Note({ tone = 'gray', icon = 'info', iconContent, className = '', children }) {
  const [box, iconColor] = TONE[tone]
  return (
    <div className={`flex items-start gap-2 rounded-xl px-3.5 py-3 text-caption ${box} ${className}`}>
      {iconContent ?? <Icon name={icon} size={16} className={`mt-px ${iconColor}`} />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
