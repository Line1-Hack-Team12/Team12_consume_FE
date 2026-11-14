import { useId } from 'react'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import { formatKRW } from '../../utils/format'

export default function SavingsPlanCard({ plan, selected, disabled, onSelect }) {
  const inputId = useId()
  const titleId = `${inputId}-title`
  const totalId = `${inputId}-total`

  return (
    <Card as="li" className={`relative border ${selected ? 'border-brand inset-ring inset-ring-brand' : 'border-line'}`}>
      <label htmlFor={inputId} className={`absolute inset-0 rounded-[18px] ${disabled ? 'cursor-wait' : 'cursor-pointer'}`} />
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            id={inputId}
            type="radio"
            name="savings-plan"
            value={plan.id}
            checked={selected}
            disabled={disabled}
            aria-labelledby={titleId}
            aria-describedby={totalId}
            onChange={() => onSelect(plan.id)}
            className="size-[22px] shrink-0 appearance-none rounded-full border-[1.5px] border-line-strong bg-surface checked:border-[6px] checked:border-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          />
          <h2 id={titleId} className="min-w-0 flex-1 text-body-b">{plan.label} · {plan.title}</h2>
          <Badge tone={plan.goalMet ? 'success' : 'normal'}>{plan.goalMet ? '목표 달성' : '목표 미달'}</Badge>
        </div>
        <ul className="flex flex-col gap-3">
          {plan.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-body-m">{item.kind === 'recurring' ? '구독 해지 제안' : item.label}</p>
                <p className="text-caption text-ink-3">
                  {item.kind === 'recurring' ? item.label : Number.isFinite(item.beforeCount) && Number.isFinite(item.afterCount) ? `월 ${item.beforeCount}회 → ${item.afterCount}회` : item.description ?? '감축 횟수 자료가 아직 없어요'}
                </p>
              </div>
              <p className="shrink-0 text-body-b text-success">−{formatKRW(item.monthlySavingsKrw)}</p>
            </li>
          ))}
        </ul>
        <div className="h-px bg-line" />
        <p id={totalId} className="flex items-center justify-between gap-2 text-body text-ink-2">
          <span>월 합계</span>
          <span className="shrink-0 text-body-b text-brand">월 {formatKRW(plan.monthlySavingsKrw)}</span>
        </p>
      </div>
    </Card>
  )
}
