import Card from '../../components/ui/Card'
import Chip from '../../components/ui/Chip'
import { TextField } from '../../components/ui/Field'
import { CAUSE_TAGS, MAX_CUSTOM_CAUSE_LENGTH, RESPONSE_STATUSES } from '../../constants/patternResponses'

export default function CauseResponseCard({ pattern, tone, response, customError, onToggleTag, onCustomCause, onStatus }) {
  const recommended = pattern.recommendedTags ?? []
  const options = [...new Set([...recommended, ...CAUSE_TAGS.map((item) => item.value)])]
    .map((value) => CAUSE_TAGS.find((item) => item.value === value))
    .filter(Boolean)
  const question = pattern.copyByTone?.[tone]?.hypothesisQuestion ?? pattern.copyByTone?.coach?.hypothesisQuestion ?? '그날 보통 무슨 일이 있나요?'

  return (
    <Card padding="lg" className="flex flex-col gap-3.5">
      <h2 className="text-heading whitespace-pre-line">{question}</h2>
      <p className="text-caption text-ink-3">여러 개 골라도 돼요{recommended.length > 0 ? ` · AI 추천 ${recommended.length}개` : ''}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="원인 태그">
        {options.map((item) => (
          <Chip key={item.value} showCheck={false} selected={response.cause_tags.includes(item.value)} onClick={() => onToggleTag(item.value)}>
            {item.label}
          </Chip>
        ))}
      </div>
      {response.cause_tags.includes('custom') ? (
        <div className="flex flex-col gap-1">
          <TextField
            label="직접 입력한 이유"
            placeholder="그날의 상황을 적어주세요"
            value={response.custom_cause}
            maxLength={MAX_CUSTOM_CAUSE_LENGTH}
            onChange={(event) => onCustomCause(event.target.value)}
            error={customError}
          />
          <p className="text-right text-micro text-ink-3">{response.custom_cause.length}/{MAX_CUSTOM_CAUSE_LENGTH}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-x-3.5 gap-y-2" role="group" aria-label="원인 응답 상태">
        {RESPONSE_STATUSES.map((item) => {
          const selected = response.response_status === item.value
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onStatus(item.value)}
              className={`rounded-md text-caption-m focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${selected ? 'text-brand' : 'text-ink-3'}`}
            >
              {selected ? '✓ ' : ''}{item.label}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
