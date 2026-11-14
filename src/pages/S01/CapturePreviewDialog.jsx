import { useEffect, useId, useRef } from 'react'
import Icon from '../../components/ui/Icon'

// S01 로컬 캡처 확대 보기. 파일 선택 때 만든 URL을 그대로 사용한다.
export default function CapturePreviewDialog({ file, onClose }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const imageRef = useRef(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file.file)
    imageRef.current.src = objectUrl
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const { scrollX, scrollY } = window
    const body = document.body
    const previousStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      overflow: body.style.overflow,
    }

    Object.assign(body.style, {
      position: 'fixed',
      top: `${-scrollY}px`,
      left: `${-scrollX}px`,
      width: '100%',
      overflow: 'hidden',
    })
    dialog.showModal()

    return () => {
      URL.revokeObjectURL(objectUrl)
      dialog.close()
      Object.assign(body.style, previousStyle)
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [file.file])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="fixed inset-0 m-auto h-dvh max-h-dvh w-full max-w-[390px] border-0 bg-canvas p-0 text-ink open:flex open:flex-col backdrop:bg-ink/60"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-heading">캡처 크게 보기</h2>
          <p className="truncate text-caption text-ink-2" title={file.name}>{file.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="캡처 크게 보기 닫기"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Icon name="close" />
        </button>
      </header>
      <div
        role="region"
        aria-label="캡처 이미지"
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      >
        <img ref={imageRef} alt={file.name} className="mx-auto block h-auto w-full rounded-lg" />
      </div>
    </dialog>
  )
}
