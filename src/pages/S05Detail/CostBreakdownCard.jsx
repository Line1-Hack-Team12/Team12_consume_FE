import chainedDot from '../../assets/s05-detail/chained-dot.svg'
import directDot from '../../assets/s05-detail/direct-dot.svg'
import Card from '../../components/ui/Card'
import { formatKRW } from '../../utils/format'

export default function CostBreakdownCard({ pattern }) {
  const hasBreakdown = Number.isFinite(pattern.directMonthlyKrw) && Number.isFinite(pattern.chainedMonthlyKrw)
  const prefix = pattern.amountLabel === '기간 합계' ? '기간 합계 ' : '월 '

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <h2 className="text-caption-m text-ink-2">진짜 비용</h2>
      <p className="text-display break-words">{prefix}{formatKRW(pattern.monthlyAmountKrw)}</p>
      {hasBreakdown ? (
        <>
          <div className="flex h-2.5 gap-0.5 overflow-clip rounded-full bg-subtle" role="img" aria-label={`직접 비용 ${formatKRW(pattern.directMonthlyKrw)}, 후속 비용 ${formatKRW(pattern.chainedMonthlyKrw)}`}>
            {pattern.directMonthlyKrw > 0 ? <span className="bg-brand" style={{ flex: pattern.directMonthlyKrw }} /> : null}
            {pattern.chainedMonthlyKrw > 0 ? <span className="bg-coral" style={{ flex: pattern.chainedMonthlyKrw }} /> : null}
          </div>
          <dl className="flex flex-col gap-3">
            {[
              { label: '직접 비용', dot: directDot, description: pattern.directDescription, amount: pattern.directMonthlyKrw },
              { label: '후속 비용', dot: chainedDot, description: pattern.chainedDescription, amount: pattern.chainedMonthlyKrw },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <img src={item.dot} width={8} height={8} alt="" className="shrink-0" />
                <dt className="min-w-0 flex-1">
                  <span className="block text-body-b">{item.label}</span>
                  <span className="block text-caption text-ink-3">{item.description}</span>
                </dt>
                <dd className="shrink-0 text-body-b">{prefix}{formatKRW(item.amount)}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="text-caption text-ink-2">직접 비용과 후속 비용을 나눈 상세 자료가 아직 없어요.</p>
      )}
      <p className="text-micro text-ink-3">{[pattern.totalBasis, pattern.associationNote].filter(Boolean).join(' · ')}</p>
    </Card>
  )
}
