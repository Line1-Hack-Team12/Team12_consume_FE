import { useId } from 'react'
import sliderThumb from '../../assets/s09/slider-thumb.svg'
import Card from '../../components/ui/Card'
import { MIN_PLAN_GOAL_KRW, PLAN_GOAL_KEYBOARD_STEP_KRW } from '../../constants/plans'
import { formatKRW, formatNumber } from '../../utils/format'

export default function GoalCard({ value, max, disabled, onChange }) {
  const inputId = useId()
  const upperBound = Math.max(MIN_PLAN_GOAL_KRW, max)
  const shownValue = Math.min(upperBound, Math.max(MIN_PLAN_GOAL_KRW, value))
  const progress = upperBound > MIN_PLAN_GOAL_KRW ? (shownValue - MIN_PLAN_GOAL_KRW) / (upperBound - MIN_PLAN_GOAL_KRW) : 0

  const onKeyDown = (event) => {
    const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key]
    if (!direction) return
    event.preventDefault()
    onChange(Math.min(upperBound, Math.max(MIN_PLAN_GOAL_KRW, shownValue + direction * PLAN_GOAL_KEYBOARD_STEP_KRW)))
  }

  return (
    <Card padding="lg" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-1">
        <label htmlFor={inputId} className="text-caption-m text-ink-2">월 저축 목표</label>
        <p className="text-micro text-ink-3">₩{formatNumber(MIN_PLAN_GOAL_KRW)} ~ {formatNumber(upperBound)}</p>
      </div>
      <output htmlFor={inputId} className="text-display text-brand">{formatKRW(shownValue)}</output>
      <div className="relative h-7 rounded-full focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-brand">
        <span className="absolute inset-x-0 top-[11px] h-1.5 rounded-[3px] bg-subtle" />
        <span className="absolute top-[11px] left-0 h-1.5 rounded-[3px] bg-brand" style={{ width: `calc(${progress * 100}% + ${13 - progress * 26}px)` }} />
        <img src={sliderThumb} width={26} height={26} alt="" className="pointer-events-none absolute top-px" style={{ left: `calc(${progress * 100}% - ${progress * 26}px)` }} />
        <input
          id={inputId}
          type="range"
          min={MIN_PLAN_GOAL_KRW}
          max={upperBound}
          step={1}
          value={shownValue}
          aria-valuetext={formatKRW(shownValue)}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          onKeyDown={onKeyDown}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>
    </Card>
  )
}
