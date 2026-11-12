import { useEffect, useId, useRef } from 'react'
import Button from './Button'

// 하단 확인 시트 · 네이티브 <dialog>로 포커스와 Esc 닫기를 처리한다
export default function ConfirmDialog({ open, title, children, confirmLabel = '확인', cancelLabel = '취소', onConfirm, onCancel, onDismiss }) {
  const ref = useRef(null)
  const titleId = useId()
  const dismiss = onDismiss ?? onCancel

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        dismiss()
      }}
      className="m-0 mt-auto mx-auto w-full max-w-[390px] rounded-t-3xl bg-surface p-6 pb-[max(24px,env(safe-area-inset-bottom))] text-ink backdrop:bg-ink/40"
    >
      <h2 id={titleId} className="text-heading">{title}</h2>
      <div className="mt-2 text-body text-ink-2">{children}</div>
      <div className="mt-5 flex flex-col gap-2.5">
        <Button onClick={onConfirm}>{confirmLabel}</Button>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </dialog>
  )
}
