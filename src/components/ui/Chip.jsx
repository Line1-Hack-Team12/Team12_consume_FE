import Icon from './Icon'

// Figma Chip: Selected=On | Off · showCheck로 선택 체크 표시를 조절한다.
export default function Chip({ selected = false, onClick, icon, showCheck = true, className = '', children, ...props }) {
  const border = selected ? (showCheck ? '' : 'border border-transparent') : 'border border-line'

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-caption-m transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${border} ${
        selected ? 'bg-brand-deep text-white' : 'bg-surface text-ink-2'
      } ${className}`}
      {...props}
    >
      {selected && showCheck ? <Icon name="check" size={14} /> : icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </button>
  )
}
