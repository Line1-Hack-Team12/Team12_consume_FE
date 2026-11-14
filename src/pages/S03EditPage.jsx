import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import ScreenLayout from '../components/layout/ScreenLayout'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { SelectField, TextField } from '../components/ui/Field'
import Note from '../components/ui/Note'
import { CATEGORIES, DIRECTIONS, KINDS } from '../constants/limits'
import { SCREEN } from '../constants/screens'
import { useAnalysisSession } from '../hooks/analysisSessionContext'
import { useAppNavigation } from '../hooks/navigationContext'
import { formatNumber } from '../utils/format'
import { validateTransaction } from '../utils/transactionValidation'
import { buildSlots, formatMonth } from '../utils/months'

function lastDay(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

// S03-E 내역 수정하기
export default function S03EditPage({ params }) {
  const { back } = useAppNavigation()
  const { draft, settings, updateTransaction, syncBusy, syncError } = useAnalysisSession()
  const original = draft?.transactions.find((t) => t.id === params?.id)
  const [form, setForm] = useState(() => (original ? { ...original, amountText: formatNumber(original.amountKrw) } : null))
  const [showErrors, setShowErrors] = useState(false)
  const allowLeaveRef = useRef(false)
  const hasChanges = Boolean(original && form && (
    form.amountText !== formatNumber(original.amountKrw)
    || ['date', 'time', 'merchant', 'direction', 'kind', 'category', 'subcategory'].some((key) => (form[key] ?? '') !== (original[key] ?? ''))
  ))
  const blocker = useBlocker(() => hasChanges && !allowLeaveRef.current)

  useEffect(() => {
    if (!hasChanges) return undefined
    const onBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [hasChanges])

  if (!original || !form) {
    return (
      <ScreenLayout title="내역을 찾을 수 없어요" backFallback={SCREEN.S03} footer={<Button onClick={() => back(SCREEN.S03)}>검토 화면으로</Button>}>
        <Note tone="gray">표가 바뀌었을 수 있어요. 검토 화면에서 다시 골라주세요.</Note>
      </ScreenLayout>
    )
  }

  const amountKrw = Number(form.amountText.replace(/[^\d]/g, '')) || 0
  const candidate = { ...form, amountKrw, time: form.time || null, subcategory: form.subcategory || null }
  const errors = validateTransaction(candidate)
  const hasErrors = Object.keys(errors).length > 0
  const subs = CATEGORIES.find((c) => c.value === form.category)?.subs ?? []
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const done = () => {
    allowLeaveRef.current = true
    back(SCREEN.S03)
  }

  const save = async () => {
    if (hasErrors) {
      setShowErrors(true)
      return
    }
    const rest = { ...candidate }
    delete rest.amountText
    if (await updateTransaction(original.id, { ...rest, included: true, reviewStatus: original.reviewReasons.length ? 'edited' : original.reviewStatus })) done()
  }

  const keepAsIs = async () => {
    // 포함 행의 필수값 오류는 그대로 두기로 통과시키지 않는다
    if (Object.keys(validateTransaction(original)).length > 0) {
      setShowErrors(true)
      return
    }
    if (await updateTransaction(original.id, { reviewStatus: original.reviewReasons.length ? 'kept' : original.reviewStatus })) done()
  }

  const toggleExclude = async () => {
    const patch = original.included ? { included: false, reviewStatus: 'excluded' } : { included: true, reviewStatus: original.reviewReasons.length ? 'pending' : 'ok' }
    if (await updateTransaction(original.id, patch)) done()
  }

  const err = (k) => (showErrors ? errors[k] : undefined)
  const [y, m] = (form.slotMonth || '').split('-')

  return (
    <ScreenLayout
      title="내역 수정하기"
      backFallback={SCREEN.S03}
      contentClassName="gap-3.5"
      footer={
        <>
          {syncError ? <p role="alert" className="text-caption text-danger-ink">{syncError}</p> : null}
          <Button disabled={syncBusy} onClick={save}>{syncBusy ? '저장 중…' : '수정 저장 · 내역 확인'}</Button>
          {original.included ? (
            <Button disabled={syncBusy} variant="secondary" onClick={keepAsIs}>
              그대로 두기 · 내역 확인
            </Button>
          ) : null}
          <Button disabled={syncBusy} variant="secondary" onClick={toggleExclude}>
            {original.included ? '이 내역 제외' : '이 내역 복원'}
          </Button>
        </>
      }
    >
      <p className="-mt-3 text-caption text-ink-3">
        <span className="text-danger">*</span> 표시는 필수 항목이에요. 시각은 비워둘 수 있어요.
      </p>
      <SelectField label="기록의 달" required value={form.slotMonth || ''} placeholder="해당하는 달을 골라주세요"
        options={buildSlots(settings.lastMonth, settings.monthCount).map((value) => ({ value, label: formatMonth(value) }))}
        onChange={(e) => set({ slotMonth: e.target.value })} />
      <TextField
        label="날짜"
        required
        type="date"
        min={m ? `${y}-${m}-01` : undefined}
        max={m ? `${y}-${m}-${lastDay(form.slotMonth)}` : undefined}
        value={form.date}
        onChange={(e) => set({ date: e.target.value })}
        error={err('date')}
      />
      <TextField label="시각 · 없으면 비워두기" type="time" value={form.time ?? ''} onChange={(e) => set({ time: e.target.value })} error={err('time')} />
      <TextField label="가맹점명" required maxLength={100} value={form.merchant} onChange={(e) => set({ merchant: e.target.value })} error={err('merchant')} />
      <TextField
        label="금액"
        required
        inputMode="numeric"
        suffix="원"
        value={form.amountText}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '')
          set({ amountText: digits ? formatNumber(Number(digits)) : '' })
        }}
        error={err('amountKrw')}
      />
      <div className="flex gap-2">
        <SelectField className="flex-1" label="방향" required value={form.direction} options={DIRECTIONS} onChange={(e) => set({ direction: e.target.value })} error={err('direction')} />
        <SelectField className="flex-1" label="종류" required value={form.kind} options={KINDS} onChange={(e) => set({ kind: e.target.value })} error={err('kind')} />
      </div>
      <div className="flex gap-2">
        <SelectField
          className="flex-1"
          label="상위 카테고리"
          required
          value={form.category}
          options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          onChange={(e) => set({ category: e.target.value, subcategory: null })}
          error={err('category')}
        />
        <SelectField
          className="flex-1"
          label="하위"
          value={form.subcategory ?? ''}
          placeholder="없음"
          options={subs.map((s) => ({ value: s, label: s }))}
          disabled={subs.length === 0}
          onChange={(e) => set({ subcategory: e.target.value || null })}
        />
      </div>
      {showErrors && hasErrors ? (
        <Note tone="danger" icon="alert">
          빨간 칸을 고쳐야 저장할 수 있어요.
        </Note>
      ) : null}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="수정 중인 내역이 있어요"
        confirmLabel="계속 수정"
        cancelLabel="변경 내용 버리기"
        onConfirm={() => blocker.reset?.()}
        onCancel={() => blocker.proceed?.()}
        onDismiss={() => blocker.reset?.()}
      >
        저장하지 않고 나가면 변경 내용이 사라져요.
      </ConfirmDialog>
    </ScreenLayout>
  )
}
