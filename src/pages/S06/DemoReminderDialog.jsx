import { useEffect, useId, useRef } from 'react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

// 시스템 알림을 표시할 수 없는 환경의 인앱 미리보기다.
export default function DemoReminderDialog({ open, preview, title, reason, onClose }) {
  const ref = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      className="m-auto w-[calc(100%_-_32px)] max-w-[358px] rounded-3xl bg-surface p-6 text-ink backdrop:bg-ink/40">
      <Badge tone="demo">인앱 DEMO</Badge>
      <h2 id={titleId} className="mt-3 text-heading">사전 알림 미리보기</h2>
      <p className="mt-1 text-caption text-ink-2">{title} · 실제 푸시가 아니에요.</p>
      {reason ? <p className="mt-3 text-caption text-warning-ink" role="status">{reason}</p> : null}
      <p id={descriptionId} className="mt-4 text-body-m break-words">{preview.message}</p>
      <p className="mt-3 text-micro text-ink-2">{preview.disclaimer}</p>
      <Button className="mt-5" onClick={onClose}>확인</Button>
    </dialog>
  )
}
