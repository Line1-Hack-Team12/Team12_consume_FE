import { useId, useState } from 'react'
import bell from '../../assets/s06/bell.svg'
import chevronDown from '../../assets/s06/chevron-down.svg'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Note from '../../components/ui/Note'
import Toggle from '../../components/ui/Toggle'
import { REMINDER_TIME_OPTIONS, isValidReminderTime, validateReminderTime } from '../../constants/reminders'
import { SCREEN } from '../../constants/screens'
import { useNavigation } from '../../hooks/navigationContext'
import usePatternResponse from '../../hooks/usePatternResponse'
import { buildS06ReminderPreview } from '../../mocks/reminders'
import DemoReminderDialog from './DemoReminderDialog'

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

function Condition({ label, children }) {
  return <div className="flex items-start justify-between gap-2 text-body"><dt className="shrink-0 text-ink-2">{label}</dt><dd className="min-w-0 text-right text-body-m break-words">{children}</dd></div>
}

export default function ReminderSettings({ pattern, snapshotId, designPreview, tone, disabled }) {
  const { navigate } = useNavigation()
  const { response, saving, error, customError, setReminderEnabled, setReminderTime, retry } = usePatternResponse({ pattern, snapshotId, designPreview })
  const [demoOpen, setDemoOpen] = useState(false)
  const [timeError, setTimeError] = useState('')
  const timeId = useId()
  const suggestion = pattern.reminderSuggestion
  const reminder = response.reminder
  const enabled = reminder.state === 'enabled'
  const notApplicable = response.response_status === 'not_applicable'
  const weekday = WEEKDAYS[reminder.weekday] ?? suggestion.weekdayLabel ?? '요일 근거 없음'
  const timeValid = isValidReminderTime(reminder.time)
  const timeOptions = [...new Set([...REMINDER_TIME_OPTIONS, reminder.time, suggestion.time].filter(isValidReminderTime))].sort()
  const preview = buildS06ReminderPreview({ pattern, response, tone })
  const weather = suggestion.weatherCondition
  const weatherLabel = typeof weather === 'string' ? weather : weather?.label
  const expectedTime = suggestion.expectedConsumptionTime
  const expectedLabel = expectedTime?.endsWith(':00') ? `${Number(expectedTime.slice(0, 2))}시` : expectedTime
  const timeAdjusted = reminder.time !== suggestion.time
  const stateLabel = notApplicable ? '해당 없음 · 일시정지' : enabled ? '켜짐 · 바로 해제 가능' : reminder.state === 'paused' ? '일시정지됨' : '꺼짐 · 다시 켤 수 있어요'
  const canPreview = enabled && !notApplicable && timeValid && !error && !customError && !saving && !disabled

  const turnOff = () => {
    setReminderEnabled(false)
    setDemoOpen(false)
  }

  return <>
    <Card padding="lg" className="flex flex-col gap-3" aria-label={`${pattern.title} 알림 조건`}>
      <div className="flex flex-wrap items-start gap-1.5">
        {reminder.source === 'plan' ? <Badge tone="brand">플랜에서 켜짐</Badge> : null}
        <Badge tone="demo">DEMO</Badge>
      </div>
      <h2 className="text-title-m">{weekday} {reminder.time ?? '시각 미설정'}</h2>
      <dl className="flex flex-col gap-3">
        <Condition label="요일 조건">{weekday}</Condition>
        <Condition label="날씨 조건">{weatherLabel ?? (weather ? '날씨 조건 있음' : '없음')}</Condition>
        <Condition label={timeAdjusted ? '최초 제안' : '기준'}>{timeAdjusted
          ? `${suggestion.time}${expectedLabel ? ` · 예상 소비 ${expectedLabel}` : ' · 관찰된 시각 기준'}`
          : expectedLabel ? `예상 소비 ${expectedLabel}의 한 시간 전` : '관찰된 요일·시각 기준'}</Condition>
      </dl>
      {weather ? <p className="text-caption text-ink-2">요일과 날씨 조건이 모두 맞을 때만 안내해요. 예보가 없으면 보내지 않으며, 현재 날씨 기능도 데모예요.</p> : null}
    </Card>

    <Card className="flex flex-col gap-3">
      <label htmlFor={timeId} className="text-body-b">알림 시각</label>
      <div className="relative">
        <select id={timeId} value={reminder.time ?? ''} disabled={disabled || notApplicable} aria-invalid={Boolean(timeError)} aria-describedby={timeError ? `${timeId}-error` : undefined}
          className="w-full appearance-none rounded-xl bg-canvas py-[13px] pr-11 pl-3.5 text-body-b outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:text-ink-3"
          onChange={(event) => {
            const time = event.target.value
            setTimeError(setReminderTime(time) ? '' : validateReminderTime(time) || '알림 시각을 다시 선택해 주세요.')
          }}>
          {!timeValid ? <option value={reminder.time ?? ''}>{reminder.time ?? '시각을 선택해 주세요'}</option> : null}
          {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
        </select>
        <img src={chevronDown} width={18} height={18} alt="" className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2" />
      </div>
      {timeError ? <p id={`${timeId}-error`} role="alert" className="text-caption text-danger-ink">{timeError}</p> : null}
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-body-m text-ink-2" role="status">{stateLabel}</p>
        <Toggle checked={enabled} label={`${pattern.title} 사전 알림`} disabled={disabled || notApplicable || (!enabled && !timeValid)}
          onChange={(on) => on ? setReminderEnabled(true) : turnOff()} />
      </div>
      {notApplicable ? <p className="text-caption text-ink-2">해당 없음으로 답한 습관은 알림을 켤 수 없어요. 카드 상세에서 응답을 바꿀 수 있어요.</p> : null}
    </Card>

    <Card tone="brand" className="flex flex-col gap-2" aria-label="알림 미리보기" aria-live="polite" aria-atomic="true">
      <h2 className="text-caption-m break-words text-brand">{preview.heading}</h2>
      <p className="text-body-m break-words text-brand-deep">{preview.message}</p>
      <p className="text-micro text-brand-deep/60">{preview.disclaimer}</p>
    </Card>

    <Note tone="warn" iconContent={<img src={bell} width={16} height={16} alt="" className="shrink-0" />}>
      <p>방해금지 22:00–08:00 · 주 최대 3회</p>
      <p>실제 푸시는 권한 · 구독 · 동의 · 최신 기록 연결 후 가능해요.</p>
    </Note>

    {error ? <Note tone="warn" icon="alert"><p role="alert">{error}</p><Button size="sm" variant="secondary" className="mt-2" disabled={saving || disabled} onClick={retry}>다시 저장</Button></Note> : null}
    {customError || notApplicable ? <Button variant="secondary" disabled={disabled} onClick={() => navigate(SCREEN.S05_1, { patternId: pattern.id, snapshotId })}>카드 응답 확인하기</Button> : null}
    {customError ? <p className="text-caption text-danger-ink">{customError} 카드 상세에서 입력을 마치면 설정을 저장할 수 있어요.</p> : null}

    <div className="flex flex-col gap-2">
      <Button variant="tonal" disabled={!canPreview} onClick={() => setDemoOpen(true)}>지금 보내보기 · 인앱 데모</Button>
      <Button variant="secondary" disabled={disabled || !enabled} onClick={turnOff}>이 규칙 해제</Button>
      {!enabled ? <p className="text-caption text-ink-2">{notApplicable ? '해당 없음으로 답한 규칙은 데모를 보낼 수 없어요.' : '알림을 켜면 인앱 데모를 확인할 수 있어요.'}</p> : null}
    </div>
    <DemoReminderDialog open={demoOpen && canPreview} preview={preview} title={`${weekday} ${reminder.time}`} onClose={() => setDemoOpen(false)} />
  </>
}
