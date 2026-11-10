import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import { formatKRW } from '../../utils/format'

export default function RecurringPaymentsCard({ recurring }) {
  return (
    <Card className="flex flex-col gap-3" aria-labelledby="report-recurring-title">
      <h2 id="report-recurring-title" className="text-heading">정기결제 · 계속 쓰고 계신가요?</h2>
      {recurring.status === 'ready' ? recurring.items.length > 0 ? <>
        <ul className="flex flex-col gap-3">
          {recurring.items.map((item) => <li key={item.id} className="flex items-center gap-2.5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="min-w-0 text-body-b break-words">{item.label}</h3>
                {item.status === 'price_increased' ? <Badge tone="coral">가격 인상</Badge> : null}
              </div>
              <p className="text-caption break-words text-ink-3">{item.historyLabel}</p>
            </div>
            <p className="shrink-0 text-body-b tabular-nums">월 {formatKRW(item.monthlyAmountKrw)}</p>
          </li>)}
        </ul>
        <div className="h-px bg-line" aria-hidden="true" />
        <dl className="flex flex-col gap-3 text-body">
          <div className="flex items-center justify-between gap-2"><dt className="text-ink-2">월 합계</dt><dd className="text-body-b tabular-nums">{formatKRW(recurring.monthlyTotalKrw)}</dd></div>
          <div className="flex items-center justify-between gap-2"><dt className="text-ink-2">연환산</dt><dd className="text-body-b text-coral tabular-nums">{formatKRW(recurring.annualizedTotalKrw)}</dd></div>
        </dl>
      </> : <p className="text-caption text-ink-2">확인된 정기결제가 없어요.</p> : <p className="text-caption text-ink-2">정기결제 분석 자료가 아직 없어요. 결제 주기를 추정해 표시하지 않아요.</p>}
    </Card>
  )
}
