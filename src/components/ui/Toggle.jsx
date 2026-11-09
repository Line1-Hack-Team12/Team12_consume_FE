// Figma Toggle: On=true | false · role="switch"
export default function Toggle({ checked, onChange, disabled = false, label, checkedContent }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 ${
        checked ? 'bg-brand' : 'bg-line-strong'
      }`}
    >
      {checked && checkedContent ? checkedContent : <span
        className={`absolute top-[3px] size-[22px] rounded-full bg-surface shadow transition-[left] ${checked ? 'left-[23px]' : 'left-[3px]'}`}
      />}
    </button>
  )
}
