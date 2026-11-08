import Icon from './Icon'

// Figma Chip: Selected=On | Off · 선택 상태를 색만으로 구분하지 않도록 체크 아이콘을 함께 보여준다.
export default function Chip({ selected = false, onClick, icon, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-caption-m transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        selected ? 'bg-brand-deep text-white' : 'border border-line bg-surface text-ink-2'
      } ${className}`}
      {...props}
    >
      {selected ? <Icon name="check" size={14} /> : icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </button>
  )
}
