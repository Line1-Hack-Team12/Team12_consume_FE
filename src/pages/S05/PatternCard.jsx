import moon from '../../assets/s05/moon.svg'
import rain from '../../assets/s05/rain.svg'
import sparkle from '../../assets/s05/sparkle.svg'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import IconBox from '../../components/ui/IconBox'
import { formatKRW } from '../../utils/format'

const ICONS = { moon, rain, sparkle }

// S05 카드 앞면 · 수치·정렬·근거 등급은 분석 결과를 그대로 표시한다.
export default function PatternCard({ pattern, featured = false, onOpen }) {
  const titleId = `pattern-${pattern.id}`
  const details = (
    <>
      <IconBox name={pattern.icon} tone={pattern.iconTone}>
        {ICONS[pattern.icon] ? <img src={ICONS[pattern.icon]} width={20} height={20} alt="" className="shrink-0" /> : null}
      </IconBox>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 id={titleId} className="text-body-b">{pattern.title}</h3>
        <p className="-mr-0.5 text-caption-m text-ink-2">
          {pattern.observation} · {pattern.amountLabel ?? '월 환산'} <span className="whitespace-nowrap">{formatKRW(pattern.monthlyAmountKrw)}</span>
        </p>
        <p className="text-micro text-ink-3">{pattern.basis}</p>
      </div>
      <Badge tone={pattern.evidenceGrade === 'strong' ? 'strong' : 'normal'}>
        {pattern.evidenceGrade === 'strong' ? '근거 강함' : '근거 보통'}
      </Badge>
    </>
  )

  return (
    <Card as="li" className="relative flex flex-col gap-3">
      <div className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3">{details}</div>
      {featured ? (
        <Button onClick={onOpen} aria-describedby={titleId}>진짜 비용과 원인 보기</Button>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${pattern.title} · 진짜 비용과 원인 보기`}
          className="absolute inset-0 w-full rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      )}
    </Card>
  )
}
