import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import { formatNumber, formatKRW } from '../../utils/format'
import { formatShortMonth } from '../../utils/months'

export default function MonthlyTrendCard({ months, comparison }) {
  const maximum = Math.max(1, ...months.map((item) => item.amountKrw))
  const change = comparison?.changePercent
  return (
    <Card className="flex flex-col gap-3" aria-labelledby="report-months-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="report-months-title" className="text-heading">월별 추이</h2>
        {comparison ? <Badge tone={change > 0 ? 'coral' : change < 0 ? 'success' : 'normal'}>전월 대비 {change > 0 ? '+' : ''}{change}%</Badge> : null}
      </div>
      {months.length > 0 ? (
        <dl className="flex min-h-[167px] items-end justify-center gap-7 pt-2" aria-label="업로드 기록의 월별 지출">
          {months.map((item, index) => {
            const latest = index === months.length - 1
            return <div key={item.month} className="flex w-[52px] min-w-0 flex-col items-center gap-1.5" title={`${item.month} · ${formatKRW(item.amountKrw)}`}>
              <dt className="order-2 text-caption-m text-ink-2">{formatShortMonth(item.month)}</dt>
              <dd className="order-1 flex w-full min-w-0 flex-col items-center gap-1.5">
                <span className={`max-w-[72px] text-center text-micro tabular-nums [overflow-wrap:anywhere] ${latest ? 'text-brand' : 'text-ink-2'}`}>{formatNumber(item.amountKrw)}<span className="sr-only">원</span></span>
                <span className={`block w-full rounded-t-lg ${latest ? 'bg-brand' : 'bg-brand-tint'}`} style={{ height: `${Math.max(0, item.amountKrw) / maximum * 113}px` }} aria-hidden="true" />
              </dd>
            </div>
          })}
        </dl>
      ) : <p className="text-caption text-ink-2">표시할 월별 자료가 없어요.</p>}
    </Card>
  )
}
