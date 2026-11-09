import { useState } from 'react'
import bell from '../../assets/s05-detail/bell.svg'
import toggleOn from '../../assets/s05-detail/toggle-on.svg'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import IconBox from '../../components/ui/IconBox'
import Toggle from '../../components/ui/Toggle'
import { buildReminderPreview } from '../../mocks/patternResponses'

export default function ReminderCard({ pattern, tone, response, onToggle }) {
  const [showPreview, setShowPreview] = useState(false)
  const suggestion = pattern.reminderSuggestion
  const notApplicable = response.response_status === 'not_applicable'
  const disabled = notApplicable || !suggestion
  const title = suggestion ? `${suggestion.weekdayLabel} ${suggestion.time} 사전 알림` : '사전 알림'

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <IconBox compact name="bell" size={18}>
          <img src={bell} width={18} height={18} alt="" className="shrink-0" />
        </IconBox>
        <h2 className="min-w-0 flex-1 text-body-b">{title}</h2>
        <Toggle
          checked={response.reminder.state === 'enabled'}
          label={title}
          disabled={disabled}
          checkedContent={<img src={toggleOn} width={48} height={28} alt="" className="block" />}
          onChange={(enabled) => {
            onToggle(enabled)
            if (enabled) setShowPreview(true)
          }}
        />
      </div>
      {disabled ? (
        <p className="text-caption text-ink-2">
          {notApplicable ? '해당 없음으로 응답해 알림을 일시정지했어요.' : '요일·시각 근거가 없어 지금은 알림을 켤 수 없어요.'}
        </p>
      ) : null}
      <Button variant="tonal" onClick={() => setShowPreview((value) => !value)} aria-expanded={showPreview} aria-controls={`reminder-preview-${pattern.id}`}>
        {showPreview ? '미리보기 접기' : '태그 적용 미리보기'}
      </Button>
      {showPreview ? (
        <div id={`reminder-preview-${pattern.id}`} className="flex flex-col items-start gap-2 rounded-xl bg-brand-tint p-3.5" aria-live="polite" aria-atomic="true">
          <Badge tone="demo">데모 알림</Badge>
          <p className="text-caption text-brand-deep">{buildReminderPreview({ pattern, response, tone })}</p>
        </div>
      ) : null}
    </Card>
  )
}
