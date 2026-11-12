// Figma Toggle: On=true | false · role="switch"
export default function Toggle({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="relative flex h-11 w-12 shrink-0 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none relative block h-7 w-12 rounded-full transition-colors duration-200 ease-out motion-reduce:transition-none ${checked ? 'bg-brand' : 'bg-line-strong'}`}
      >
        <span className={`absolute top-[3px] left-[3px] size-[22px] rounded-full bg-surface transition-[translate,box-shadow] duration-200 ease-out motion-reduce:transition-none ${checked ? 'translate-x-5 shadow-none' : 'translate-x-0 shadow'}`} />
      </span>
    </button>
  )
}
