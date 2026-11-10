import moon from '../../assets/s08/moon.svg'
import check from '../../assets/s08/check.svg'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'

export default function ObservationsCard({ observations, tone }) {
  return (
    <Card className="flex flex-col gap-2.5" aria-labelledby="report-observations-title">
      <h2 id="report-observations-title" className="text-heading">관찰과 행동</h2>
      {observations.length > 0 ? <ul className="flex flex-col gap-4">
        {observations.map((item) => {
          const copy = item.copyByTone[tone] ?? item.copyByTone.coach
          return <li key={item.id} className="flex flex-col gap-2.5">
            <div className="flex items-start gap-2">
              {item.icon === 'moon' ? <img src={moon} width={16} height={16} alt="" className="mt-[3.5px] shrink-0" /> : <Icon name={item.icon ?? 'sparkle'} size={16} className="mt-[3.5px] shrink-0 text-brand" />}
              <p className="min-w-0 flex-1 text-body">{copy.observation}</p>
            </div>
            {copy.action ? <div className="flex items-start gap-2">
              <img src={check} width={16} height={16} alt="" className="mt-[3.5px] shrink-0" />
              <p className="min-w-0 flex-1 text-body">{copy.action}</p>
            </div> : null}
          </li>
        })}
      </ul> : <p className="text-caption text-ink-2">아직 반복되는 습관이 충분히 관찰되지 않았어요. 지금은 지출 요약과 월별 기록을 확인해 보세요.</p>}
    </Card>
  )
}
