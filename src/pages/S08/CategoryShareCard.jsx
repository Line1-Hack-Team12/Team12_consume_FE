import Card from '../../components/ui/Card'
import { formatKRW } from '../../utils/format'

const OPACITY = [1, 0.73, 0.69, 0.62, 0.56, 0.5, 0.46]

export default function CategoryShareCard({ categories }) {
  const highest = Math.max(1, ...categories.map((item) => item.sharePercent))
  return (
    <Card className="flex flex-col gap-3" aria-labelledby="report-categories-title">
      <h2 id="report-categories-title" className="text-heading">카테고리 비중</h2>
      {categories.length > 0 ? <>
        <p className="sr-only">막대 길이는 가장 큰 카테고리를 기준으로 비교하며, 비중은 반올림한 값이에요.</p>
        <ul className="flex flex-col gap-3">
          {categories.map((item, index) => (
            <li key={item.category} className="flex items-center gap-2.5 text-caption-m">
              <span className="w-8 shrink-0 text-ink-2">{item.label}</span>
              <span className="h-2.5 min-w-0 flex-1 overflow-clip rounded-full bg-subtle" aria-hidden="true">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(0, item.sharePercent) / highest * 97}%`, opacity: OPACITY[index] ?? OPACITY.at(-1) }} />
              </span>
              <span className="shrink-0 tabular-nums">{item.sharePercent}%</span>
              {Number.isFinite(item.amountKrw) ? <span className="sr-only"> · {formatKRW(item.amountKrw)}</span> : null}
            </li>
          ))}
        </ul>
      </> : <p className="text-caption text-ink-2">표시할 카테고리 자료가 없어요.</p>}
    </Card>
  )
}
