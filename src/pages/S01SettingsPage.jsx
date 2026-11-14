import { useMemo, useRef, useState } from 'react'
import ScreenLayout from '../components/layout/ScreenLayout'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Checkbox from '../components/ui/Checkbox'
import Chip from '../components/ui/Chip'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { SelectField, TextField } from '../components/ui/Field'
import Note from '../components/ui/Note'
import Segmented from '../components/ui/Segmented'
import { MONTH_COUNTS, PAYDAY_OPTIONS, REGIONS, TONES } from '../constants/limits'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import { USE_MOCK } from '../api/config'
import { createSession, unsupportedSessionInput } from '../api/sessions'
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

// S01 설정하고 파일 올리기 (F01·F02)
export default function S01SettingsPage() {
  const { navigate } = useAppNavigation()
  const { settings, files, bankFiles, consent, updateSettings, addFiles, removeFile, addBankFiles, removeBankFile, setBankPassword, clearFilePasswords, setConsent, setSessionId } = useAnalysisSession()
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [checkingCount, setCheckingCount] = useState(0)
  const uploading = useRef(false)
  const onCheckingChange = (delta) => setCheckingCount((n) => n + delta)

  const monthOptions = useMemo(() => getSelectableMonths().map((m) => ({ value: m, label: formatMonth(m) })), [])
  const lastMonthValid = isSelectableLastMonth(settings.lastMonth)
  const slots = lastMonthValid ? buildSlots(settings.lastMonth, settings.monthCount) : []
  const acceptedBySlot = slots.map((m) => (files[m] ?? []).filter((f) => f.status === 'accepted'))
  const acceptedBank = bankFiles.filter((f) => f.status === 'accepted')
  const acceptedCount = acceptedBank.length + acceptedBySlot.reduce((n, list) => n + list.length, 0)
  const emptySlots = slots.filter((_, i) => acceptedBySlot[i].length === 0)
  const outsideCount = Object.entries(files)
    .filter(([m]) => !slots.includes(m))
    .reduce((n, [, list]) => n + list.filter((f) => f.status === 'accepted').length, 0)

  const unsupportedInput = USE_MOCK ? '' : unsupportedSessionInput({ settings, assets: acceptedBank })
  const blockReason = checkingCount > 0 ? '선택한 파일을 확인하고 있어요'
    : unsupportedInput || (!lastMonthValid
    ? '마지막 달을 먼저 골라주세요'
    : acceptedCount === 0
      ? '파일을 1개 이상 넣어주세요'
      : !consent
        ? '외부 AI 전송에 동의해야 분석할 수 있어요'
        : '')

  const start = async () => {
    if (uploading.current || blockReason) return
    setConfirmEmpty(false)
    // 분석 시작 시점에 이번 달·미래 달을 다시 검증한다
    if (!isSelectableLastMonth(settings.lastMonth)) {
      setError('지난달까지만 고를 수 있어요. 마지막 달을 다시 골라주세요.')
      return
    }
    setStarting(true)
    uploading.current = true
    setUploadError('')
    const captures = slots.flatMap((m, i) => acceptedBySlot[i].map((f) => ({ ...f, slotMonth: m })))
    const assets = [...acceptedBank, ...captures]
    try {
      if (USE_MOCK) {
        const { jobId } = await startExtractionJob({ assets, slots, emptySlotAcknowledged: emptySlots })
        clearFilePasswords()
        navigate(SCREEN.S02, { jobId })
      } else {
        // 동의 후 엑셀과 보조 캡처를 하나의 요청으로 함께 보낸다 (F02)
        const sessionId = await createSession({ settings, assets, consent })
        setSessionId(sessionId)
        clearFilePasswords()
        navigate(SCREEN.S02, { sessionId })
      }
    } catch (err) {
      setUploadError(settings.payday === 'last' && err.status === 400 ? '서버가 급여일 ‘말일’을 아직 지원하지 않아요. 날짜를 선택하거나 급여일을 비워 주세요.' : err.message ?? '파일을 보내지 못했어요. 다시 시도해 주세요.')
    } finally {
      setStarting(false)
      uploading.current = false
    }
  }

  const onStartClick = () => {
    if (blockReason) return
    if (acceptedBank.length === 0 && emptySlots.length > 0) setConfirmEmpty(true)
    else start()
  }

  return (
    <ScreenLayout
      title="설정하고 내역 올리기"
      contentClassName="gap-6"
      footer={
        <>
          {blockReason ? <p className="text-center text-caption text-ink-3">{blockReason}</p> : null}
          {uploadError ? (
            <p role="alert" className="text-center text-caption text-danger-ink">
              {uploadError}
            </p>
          ) : null}
          <Button disabled={Boolean(blockReason) || starting} onClick={onStartClick}>
            {starting ? '준비 중…' : `${acceptedCount}개 분석 시작`}
          </Button>
        </>
      }
    >
      <fieldset disabled={starting} className="contents">
      {USE_MOCK ? <Note tone="gray">데모 모드 · 파일 내용과 암호를 읽지 않고 합성 거래로 흐름을 확인해요.</Note> : null}
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

      <Section title="은행 거래내역 파일" description=".xlsx · 파일당 20MB · 동의 후 선택한 기간의 거래만 읽어요">
        <SlotCard kind="file" files={bankFiles} disabled={!lastMonthValid} onAdd={addBankFiles} onRemove={removeBankFile} onPasswordChange={setBankPassword} onCheckingChange={onCheckingChange} />
        {acceptedBank.length > 1 && !USE_MOCK ? <Note tone="gray">함께 올리는 엑셀 파일의 열기 암호는 같아야 해요. 암호가 없는 파일은 입력란을 비워 두세요.</Note> : null}
        <details className="text-caption text-ink-2">
          <summary className="min-h-11 cursor-pointer py-3 text-brand">토스뱅크에서 엑셀로 내보내는 방법</summary>
          <p>토스 앱 → 토스뱅크 계좌 → 관리 → 문서 → 거래내역서 → 엑셀을 선택해 발급해 주세요. 발급한 파일에 열기 암호가 있으면 함께 입력해 주세요.</p>
        </details>
        {acceptedBank.length > 0 ? <Note tone="gray">파일의 월별 건수는 동의 후 읽기가 끝나면 확인할 수 있어요. 여러 달이 든 파일은 한 번만 추가해 주세요.</Note> : null}
      </Section>

      <Section title="캡처로 추가하기 · 보조" description="간편결제·카드사 내역용 · 회당 10개 · 파일당 10MB · JPG/PNG/WebP">
        {slots.length === 0 ? (
          <Note tone="gray">마지막 달을 고르면 파일을 넣을 칸이 생겨요.</Note>
        ) : (
          slots.map((m) => (
            <SlotCard key={m} month={m} files={files[m] ?? []} disabled={!lastMonthValid} onAdd={addFiles} onRemove={removeFile} onCheckingChange={onCheckingChange} />
          ))
        )}
        {outsideCount > 0 ? (
          <Note tone="warn" icon="alert">
            고른 기간 밖의 파일 {outsideCount}개는 이번 분석에서 빠져요. 기간을 다시 넓히면 그대로 돌아와요.
          </Note>
        ) : null}
      </Section>

      <Section title="이름 · 권장" description="이체 상대가 본인인지 구분하는 데만 쓰고, 캡처·파일에서 이름은 저장하지 않습니다.">
        <TextField aria-label="이름 · 권장" autoComplete="name" value={settings.ownerName} onChange={(e) => updateSettings({ ownerName: e.target.value })} placeholder="이름을 입력해 주세요" />
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
          description="캡처·파일에는 금융 정보가 포함됩니다. 분석을 위해 외부 AI로 전송됩니다. 잔액·계좌번호·이름은 추출 결과에 저장하지 않으며, 원본은 표 확정 후 삭제 대상이에요."
        >
          외부 AI 전송에 동의합니다
        </Checkbox>
      </div>
      </fieldset>

      <ConfirmDialog
        open={confirmEmpty}
        title={`${emptySlots.map(formatMonth).join(', ')}이 비어 있어요`}
        confirmLabel="그대로 진행"
        cancelLabel="파일 더 넣기"
        onConfirm={start}
        onCancel={() => setConfirmEmpty(false)}
      >
        비어 있는 달은 분석과 월 환산에서 빠져요. 그대로 진행할까요?
      </ConfirmDialog>
    </ScreenLayout>
  )
}
