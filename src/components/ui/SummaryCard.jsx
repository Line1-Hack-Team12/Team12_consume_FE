import Badge from './Badge'

// 남색 요약 카드 (S03·S05·S08 상단)
export default function SummaryCard({ caption, amount, badge, children }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-[18px] bg-brand-deep p-5 text-white">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-caption-m text-white/70">{caption}</span>
        {badge ? <Badge tone="demo">{badge}</Badge> : null}
      </div>
      <p className="text-title-l">{amount}</p>
      {children}
    </section>
  )
}
