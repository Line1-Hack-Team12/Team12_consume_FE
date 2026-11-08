import Icon from './Icon'

// Figma Checkbox: Checked=true | false · 실제 input을 숨기고 label 전체를 누를 수 있게 한다.
export default function Checkbox({ checked, onChange, disabled = false, className = '', children, description }) {
  return (
    <label className={`flex items-start gap-2.5 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className={`mt-px flex size-[22px] shrink-0 items-center justify-center rounded-md peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand ${
          checked ? 'bg-brand text-white' : 'border border-line-strong bg-surface'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        {checked ? <Icon name="check" size={16} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-body-b ${disabled ? 'text-ink-3' : ''}`}>{children}</span>
        {description ? <span className="mt-1 block text-caption text-ink-2">{description}</span> : null}
      </span>
    </label>
  )
}
