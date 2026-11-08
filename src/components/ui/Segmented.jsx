import Icon from './Icon'

// 개월 수처럼 하나만 고르는 짧은 선택지. radiogroup 의미를 준다.
export default function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-[14px] bg-subtle p-1">
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
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
