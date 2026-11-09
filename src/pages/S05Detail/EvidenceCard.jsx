import { useState } from 'react'
import chevronDown from '../../assets/s05-detail/chevron-down.svg'
import Card from '../../components/ui/Card'
import { formatDateWithWeekday, formatKRW } from '../../utils/format'

export default function EvidenceCard({ pattern }) {
  const [expanded, setExpanded] = useState(false)
  const evidence = pattern.evidence ?? []
  const visible = expanded ? evidence : evidence.slice(0, 3)
  const listId = `evidence-${pattern.id}`

  return (
    <Card padding="none">
      <div className="px-[18px] pt-3.5 pb-1.5">
        <h2 className="text-heading">{expanded ? '전체 근거' : '대표 근거'} {visible.length}건</h2>
        <ul id={listId}>
          {visible.map((transaction) => (
            <li key={transaction.id} className="flex items-center gap-2.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-body-m break-words">{transaction.merchant}</p>
                <p className="text-caption text-ink-3">
                  <time dateTime={transaction.date}>{formatDateWithWeekday(transaction.date)}</time> {transaction.time ?? '시각 없음'}
                </p>
              </div>
              <p className="shrink-0 text-body-b">{formatKRW(transaction.amountKrw)}</p>
            </li>
          ))}
        </ul>
        {evidence.length > 0 ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((value) => !value)}
            className="flex w-full items-center justify-center gap-1 rounded-lg pt-2 pb-2.5 text-caption-m text-brand focus-visible:outline-2 focus-visible:outline-brand"
          >
            {expanded ? '대표 근거만 보기' : '전체 근거 보기'}
            <img src={chevronDown} width={14} height={14} alt="" className={`shrink-0 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <p className="py-3 text-caption text-ink-2">이 카드의 상세 근거 거래가 아직 제공되지 않았어요.</p>
        )}
      </div>
    </Card>
  )
}
