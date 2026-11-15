import { useEffect, useId, useRef, useState } from 'react'
import Icon from '../../components/ui/Icon'
import { TextField } from '../../components/ui/Field'
import { BANK_ACCEPT_ATTR, SUPPLEMENT_ACCEPT_ATTR } from '../../constants/limits'
import { validateFiles } from '../../utils/fileValidation'
import { formatMonth } from '../../utils/months'
import CapturePreviewDialog from './CapturePreviewDialog'

function CaptureThumbnail({ file, onClick }) {
  const ref = useRef(null)
  useEffect(() => {
    const url = URL.createObjectURL(file.file)
    ref.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file.file])
  return <button type="button" className="size-11 shrink-0 overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-brand" onClick={onClick} aria-label={`${file.name} 크게 보기`} aria-haspopup="dialog">
    <img ref={ref} alt="" className="size-full object-cover" />
  </button>
}

// S01 슬롯 하나 · 파일 선택은 로컬 검증만 하고 서버로 보내지 않는다
export default function SlotCard({ month, files, disabled, onAdd, onRemove, kind = 'image', onPasswordChange, onCheckingChange }) {
  const inputId = useId()
  const [checking, setChecking] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const accepted = files.filter((f) => f.status === 'accepted')
  const rejected = files.filter((f) => f.status === 'rejected')
  const isBank = kind === 'file'
  const title = isBank ? '거래내역 파일 · 주 경로' : formatMonth(month)

  const handleChange = async (e) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (picked.length === 0) return
    setChecking(true)
    onCheckingChange?.(1)
    try {
      const results = await validateFiles(picked, { kind })
      onAdd(month, results)
    } finally {
      setChecking(false)
      onCheckingChange?.(-1)
    }
  }

  return (
    <section className={`flex flex-col gap-2.5 rounded-2xl p-4 ${accepted.length ? 'bg-surface' : 'border border-dashed border-line-strong bg-canvas'}`}>
      <div className="flex items-center gap-2.5">
        <h3 className="flex-1 text-body-b">{title}</h3>
        <span className={`text-caption-m ${accepted.length ? 'text-brand' : 'text-ink-3'}`}>{accepted.length}개</span>
        <input id={inputId} type="file" accept={isBank ? BANK_ACCEPT_ATTR : SUPPLEMENT_ACCEPT_ATTR} multiple className="peer sr-only" disabled={disabled || checking} onChange={handleChange} />
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-caption-m peer-focus-visible:outline-2 peer-focus-visible:outline-brand ${
            disabled ? 'cursor-not-allowed bg-subtle text-ink-3' : 'cursor-pointer bg-brand-tint text-brand'
          }`}
        >
          <Icon name="plus" size={14} />
          {checking ? '확인 중…' : isBank ? '파일 추가' : '캡처·PDF 추가'}
          <span className="sr-only">· {title}</span>
        </label>
      </div>

      {accepted.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label={`${title} 선택한 파일`}>
          {accepted.map((f) => (
            <li key={f.id} className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-subtle px-3 py-2">
              {isBank || f.kind === 'pdf' ? <Icon name="file" size={22} className="text-brand" /> : <CaptureThumbnail file={f} onClick={() => setPreviewFile(f)} />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-caption-m" title={f.name}>{f.name}</p>
                <p className="text-caption text-ink-3">
                  {f.name.split('.').pop().toUpperCase()} · {(f.size / (1024 * 1024)).toFixed(2)}MB
                </p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(month, f)}
                className="flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg px-1 text-caption-m text-ink-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                aria-label={`${f.name} 빼기`}
              >
                <Icon name="close" size={12} />
                삭제
              </button>
              {isBank ? <div className="w-full">
                <TextField label={`${f.name} 열기 암호`} type="password" autoComplete="off" value={f.password ?? ''} disabled={disabled}
                  placeholder="발급 파일에 암호가 있으면 입력" onChange={(e) => onPasswordChange(f.id, e.target.value)} />
                <p className="mt-1 text-caption text-ink-3">암호는 파일을 읽는 데만 사용하며 전송 후 입력값을 지워요.</p>
              </div> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-ink-3">{isBank ? '.xlsx · 파일당 20MB · 여러 달을 한 번에 올릴 수 있어요.' : '간편결제·카드사 내역을 캡처 또는 PDF로 추가할 수 있어요.'}</p>
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
              <button type="button" onClick={() => onRemove(month, f)} aria-label={`${f.name} 지우기`} className="min-h-11 min-w-11 shrink-0 px-1 whitespace-nowrap text-caption-m text-ink-3 underline focus-visible:outline-2 focus-visible:outline-brand">
                지우기
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {previewFile ? <CapturePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} /> : null}
    </section>
  )
}
