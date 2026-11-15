import { formatKRW } from '../../utils/format'
import Card from './Card'

export default function PlanGoalSummary({ goalKrw, plan, children }) {
  if (!plan || !Number.isFinite(goalKrw) || !Number.isFinite(plan.monthlySavingsKrw)) return null
  const shortfall = Math.max(0, goalKrw - plan.monthlySavingsKrw)

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-body-b">선택한 플랜 · {plan.label}</h2>
      <dl className="flex flex-col gap-2 text-caption">
        <div className="flex flex-wrap justify-between gap-1">
          <dt className="text-ink-2">월 저축 목표</dt>
          <dd className="text-caption-m">{formatKRW(goalKrw)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-1">
          <dt className="text-ink-2">예상 월 절감액</dt>
          <dd className="text-caption-m text-brand">{formatKRW(plan.monthlySavingsKrw)}</dd>
        </div>
      </dl>
      <p className="text-caption text-ink-2">
        {shortfall > 0 ? `목표까지 월 ${formatKRW(shortfall)} 부족하지만 이 플랜으로 시작할 수 있어요.` : '예상 절감액이 목표 이상인 플랜이에요.'}
        {' '}실제 저축 성과가 아닌 실행 계획의 예상 금액이에요.
      </p>
      {children}
    </Card>
  )
}
