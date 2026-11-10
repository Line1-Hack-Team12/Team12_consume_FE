import Badge from './Badge'

// 남색 요약 카드 (S03·S05·S08 상단)
export default function SummaryCard({ caption, amount, badge, prominent = false, largeAmount = false, children }) {
  return (
    <section className={`flex min-w-0 flex-col rounded-[18px] bg-brand-deep p-5 text-white ${prominent ? 'isolate gap-3 overflow-clip border-0 shadow-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'gap-1.5'}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-caption-m text-white/70">{caption}</span>
        {badge ? <Badge tone="demo">{badge}</Badge> : null}
      </div>
      <p className={prominent || largeAmount ? 'text-display break-words' : 'text-title-l'}>{amount}</p>
      {children}
    </section>
  )
}
