import { useId, useState } from 'react'
import Icon from '../../components/ui/Icon'
import { ACCEPT_ATTR } from '../../constants/limits'
import { validateFiles } from '../../utils/fileValidation'
import { formatMonth } from '../../utils/months'

// S01 슬롯 하나 · 파일 선택은 로컬 미리보기만 하고 서버로 보내지 않는다
export default function SlotCard({ month, files, disabled, onAdd, onRemove }) {
  const inputId = useId()
  const [checking, setChecking] = useState(false)
  const accepted = files.filter((f) => f.status === 'accepted')
  const rejected = files.filter((f) => f.status === 'rejected')

  const handleChange = async (e) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (picked.length === 0) return
    setChecking(true)
    const results = await validateFiles(picked)
    setChecking(false)
    onAdd(month, results)
  }

  return (
    <section className={`flex flex-col gap-2.5 rounded-2xl p-4 ${accepted.length ? 'bg-surface' : 'border border-dashed border-line-strong bg-canvas'}`}>
      <div className="flex items-center gap-2.5">
        <h3 className="flex-1 text-body-b">{formatMonth(month)}</h3>
        <span className={`text-caption-m ${accepted.length ? 'text-brand' : 'text-ink-3'}`}>{accepted.length}장</span>
        <input id={inputId} type="file" accept={ACCEPT_ATTR} multiple className="peer sr-only" disabled={disabled || checking} onChange={handleChange} />
        <label
          htmlFor={inputId}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-caption-m peer-focus-visible:outline-2 peer-focus-visible:outline-brand ${
            disabled ? 'cursor-not-allowed bg-subtle text-ink-3' : 'cursor-pointer bg-brand-tint text-brand'
          }`}
        >
          <Icon name="plus" size={14} />
          {checking ? '확인 중…' : '캡처 추가'}
          <span className="sr-only">· {formatMonth(month)}</span>
        </label>
      </div>

      {accepted.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {accepted.map((f) => (
            <li key={f.id} className="relative size-[58px] overflow-hidden rounded-[10px] bg-subtle">
              <img src={f.url} alt={f.name} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(month, f)}
                className="absolute top-0.5 right-0.5 rounded-full bg-ink/70 p-0.5 text-white"
                aria-label={`${f.name} 빼기`}
              >
                <Icon name="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-ink-3">비워두면 이 달은 분석과 월 환산에서 빠져요</p>
      )}

      {rejected.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {rejected.map((f) => (
            <li key={f.id} className="flex items-start gap-1.5 text-caption text-warning-ink">
              <Icon name="alert" size={14} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="truncate" title={f.name}>{f.name}</p>
                <p className="whitespace-normal wrap-anywhere">{f.reason}</p>
              </div>
              <button type="button" onClick={() => onRemove(month, f)} aria-label={`${f.name} 지우기`} className="shrink-0 whitespace-nowrap text-caption-m text-ink-3 underline">
                지우기
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
