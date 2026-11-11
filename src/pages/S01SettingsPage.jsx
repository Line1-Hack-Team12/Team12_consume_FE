import { useMemo, useState } from 'react'
import ScreenLayout from '../components/layout/ScreenLayout'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Checkbox from '../components/ui/Checkbox'
import Chip from '../components/ui/Chip'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { SelectField } from '../components/ui/Field'
import Note from '../components/ui/Note'
import Segmented from '../components/ui/Segmented'
import { MONTH_COUNTS, PAYDAY_OPTIONS, REGIONS, TONES } from '../constants/limits'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useNavigation } from '../hooks/navigationContext'
import { startExtractionJob } from '../mocks/jobs'
import { buildSlots, formatMonth, getSelectableMonths, isSelectableLastMonth } from '../utils/months'
import SlotCard from './S01/SlotCard'

const TONE_EXAMPLE = {
  coach: '어떤 상황에서 배달을 시키셨나요?',
  friend: '그날 배달 시킨 이유, 뭐였어?',
  grandma: '배달은 무슨 일로 그렇게 시켰누?',
}

function Section({ title, description, children }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h2 className="text-body-b">{title}</h2>
        {description ? <p className="text-caption text-ink-3">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

// S01 설정하고 캡처 올리기 (F01·F02)
export default function S01SettingsPage() {
  const { navigate } = useNavigation()
  const { settings, files, consent, updateSettings, addFiles, removeFile, setConsent } = useAnalysisSession()
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const monthOptions = useMemo(() => getSelectableMonths().map((m) => ({ value: m, label: formatMonth(m) })), [])
  const lastMonthValid = isSelectableLastMonth(settings.lastMonth)
  const slots = lastMonthValid ? buildSlots(settings.lastMonth, settings.monthCount) : []
  const acceptedBySlot = slots.map((m) => (files[m] ?? []).filter((f) => f.status === 'accepted'))
  const acceptedCount = acceptedBySlot.reduce((n, list) => n + list.length, 0)
  const emptySlots = slots.filter((_, i) => acceptedBySlot[i].length === 0)
  const outsideCount = Object.entries(files)
    .filter(([m]) => !slots.includes(m))
    .reduce((n, [, list]) => n + list.filter((f) => f.status === 'accepted').length, 0)

  const blockReason = !lastMonthValid
    ? '마지막 달을 먼저 골라주세요'
    : acceptedCount === 0
      ? '캡처를 1장 이상 넣어주세요'
      : !consent
        ? '외부 AI 전송에 동의해야 분석할 수 있어요'
        : ''

  const start = async () => {
    setConfirmEmpty(false)
    // 분석 시작 시점에 이번 달·미래 달을 다시 검증한다
    if (!isSelectableLastMonth(settings.lastMonth)) {
      setError('지난달까지만 고를 수 있어요. 마지막 달을 다시 골라주세요.')
      return
    }
    setStarting(true)
    const assets = slots.flatMap((m, i) => acceptedBySlot[i].map((f) => ({ id: f.id, name: f.name, slotMonth: m })))
    const { jobId } = await startExtractionJob({ assets, emptySlotAcknowledged: emptySlots })
    setStarting(false)
    navigate(SCREEN.S02, { jobId })
  }

  const onStartClick = () => {
    if (blockReason) return
    if (emptySlots.length > 0) setConfirmEmpty(true)
    else start()
  }

  return (
    <ScreenLayout
      title="설정하고 캡처 올리기"
      contentClassName="gap-6"
      footer={
        <>
          {blockReason ? <p className="text-center text-caption text-ink-3">{blockReason}</p> : null}
          <Button disabled={Boolean(blockReason) || starting} onClick={onStartClick}>
            {starting ? '준비 중…' : `${acceptedCount}장 분석 시작`}
          </Button>
        </>
      }
    >
      <Section title="몇 달치를 올릴까요?">
        <Segmented
          label="개월 수"
          value={settings.monthCount}
          onChange={(v) => updateSettings({ monthCount: v })}
          options={MONTH_COUNTS.map((n) => ({ value: n, label: `${n}개월` }))}
        />
      </Section>

      <Section title="마지막 달" description="지난달까지만 선택할 수 있어요. 앞의 달은 자동으로 이어져요.">
        <SelectField
          aria-label="마지막 달"
          value={settings.lastMonth}
          placeholder="마지막 달을 골라주세요"
          options={monthOptions}
          onChange={(e) => {
            setError('')
            updateSettings({ lastMonth: e.target.value })
          }}
          error={error}
        />
      </Section>

      <Section title="달마다 캡처 넣기" description="회당 10장 · 장당 10MB · JPG/PNG/WebP · 선택한 파일은 동의 후에만 전송돼요">
        {slots.length === 0 ? (
          <Note tone="gray">마지막 달을 고르면 캡처를 넣을 칸이 생겨요.</Note>
        ) : (
          slots.map((m) => (
            <SlotCard key={m} month={m} files={files[m] ?? []} disabled={!lastMonthValid} onAdd={addFiles} onRemove={removeFile} />
          ))
        )}
        {outsideCount > 0 ? (
          <Note tone="warn" icon="alert">
            고른 기간 밖의 캡처 {outsideCount}장은 이번 분석에서 빠져요. 기간을 다시 넓히면 그대로 돌아와요.
          </Note>
        ) : null}
      </Section>

      <div className="flex gap-2">
        <SelectField
          className="flex-1"
          label="지역 · 선택"
          value={settings.region}
          placeholder="선택 안 함"
          options={REGIONS.map((r) => ({ value: r, label: r }))}
          onChange={(e) => updateSettings({ region: e.target.value })}
        />
        <SelectField
          className="flex-1"
          label="급여일 · 선택"
          value={settings.payday}
          placeholder="선택 안 함"
          options={PAYDAY_OPTIONS}
          onChange={(e) => updateSettings({ payday: e.target.value })}
        />
      </div>

      <Section title="말투">
        <div className="flex gap-2" role="group" aria-label="말투">
          {TONES.map((t) => (
            <Chip key={t.value} showCheck={false} selected={settings.tone === t.value} onClick={() => updateSettings({ tone: t.value })}>
              {t.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-col items-start gap-1.5 rounded-[14px] bg-brand-tint px-3.5 py-3">
          <Badge tone="brand">예시</Badge>
          <p className="text-body-m text-brand-deep">“{TONE_EXAMPLE[settings.tone]}”</p>
        </div>
      </Section>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <Checkbox
          checked={consent}
          onChange={setConsent}
          description="캡처에는 금융 정보가 포함됩니다. 분석을 위해 외부 AI로 전송되며, 원본은 표 확정 후 삭제해요."
        >
          외부 AI 전송에 동의합니다
        </Checkbox>
      </div>

      <ConfirmDialog
        open={confirmEmpty}
        title={`${emptySlots.map(formatMonth).join(', ')}이 비어 있어요`}
        confirmLabel="그대로 진행"
        cancelLabel="캡처 더 넣기"
        onConfirm={start}
        onCancel={() => setConfirmEmpty(false)}
      >
        비어 있는 달은 분석과 월 환산에서 빠져요. 그대로 진행할까요?
      </ConfirmDialog>
    </ScreenLayout>
  )
}
