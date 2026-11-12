import Icon from './Icon'

// 개월 수처럼 하나만 고르는 짧은 선택지. radiogroup 의미를 준다.
export default function Segmented({ options, value, onChange, label }) {
  const selectedIndex = options.findIndex((option) => option.value === value)
  const onKeyDown = (event, index) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    let next
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % options.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + options.length) % options.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = options.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    event.currentTarget.parentElement.querySelectorAll('[role="radio"]')[next].focus()
    onChange(options[next].value)
  }

  return (
    <div role="radiogroup" aria-label={label} aria-orientation="horizontal" className="flex gap-1 rounded-[14px] bg-subtle p-1">
      {options.map((opt, index) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === Math.max(0, selectedIndex) ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-[10px] py-2.5 focus-visible:outline-2 focus-visible:outline-brand ${
              selected ? 'bg-surface text-body-b text-ink shadow-[0_1px_4px_rgba(26,26,51,0.08)]' : 'text-body-m text-ink-2'
            }`}
          >
            {selected ? <Icon name="check" size={14} className="text-brand" /> : null}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
