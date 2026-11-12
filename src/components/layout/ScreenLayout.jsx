import { useEffect, useRef } from 'react'
import { useNavigation } from '../../hooks/navigationContext'
import Icon from '../ui/Icon'

/**
 * 모든 모바일 화면의 공통 틀 (Figma AppHeader + Content + Footer)
 * - 390px 기준, 넓은 화면에서는 가운데 정렬
 * - footer는 화면 아래에 붙고 Safe Area만큼 여백을 둔다
 * - 입력 중에는 보이는 뷰포트에 footer를 맞추고, 가려진 입력 필드를 스크롤한다
 */
export default function ScreenLayout({
  showBack = true,
  reserveBackSpace = true,
  onBack,
  backIcon,
  backFallback,
  title,
  description,
  footer,
  tone = 'canvas',
  contentClassName = '',
  children,
}) {
  const { back } = useNavigation()
  const screenRef = useRef(null)
  const footerRef = useRef(null)

  useEffect(() => {
    const screen = screenRef.current
    const viewport = window.visualViewport
    let frame
    const keepInputVisible = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const field = document.activeElement
        const editing = field instanceof HTMLElement && screen.contains(field)
          && field.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), select, textarea')
        const visibleTop = viewport?.offsetTop ?? 0
        const visibleHeight = viewport?.height ?? window.innerHeight
        const keyboardOffset = editing && viewport?.scale === 1
          ? Math.max(0, window.innerHeight - visibleHeight - visibleTop)
          : 0
        // 키보드가 화면 위에 겹쳐도 마지막 입력까지 스크롤할 공간을 확보한다.
        screen.style.setProperty('--keyboard-offset', `${keyboardOffset}px`)
        screen.style.setProperty('--footer-max-height', editing ? `${visibleHeight * 0.6}px` : 'none')
        if (!editing) return

        const bounds = field.getBoundingClientRect()
        const bottom = Math.min(visibleTop + visibleHeight, footerRef.current?.getBoundingClientRect().top ?? Infinity) - 12
        const top = visibleTop + 12
        if (bounds.bottom > bottom) window.scrollBy({ top: bounds.bottom - bottom, behavior: 'instant' })
        else if (bounds.top < top) window.scrollBy({ top: bounds.top - top, behavior: 'instant' })
      })
    }

    screen.addEventListener('focusin', keepInputVisible)
    screen.addEventListener('focusout', keepInputVisible)
    window.addEventListener('resize', keepInputVisible)
    viewport?.addEventListener('resize', keepInputVisible)
    return () => {
      cancelAnimationFrame(frame)
      screen.removeEventListener('focusin', keepInputVisible)
      screen.removeEventListener('focusout', keepInputVisible)
      window.removeEventListener('resize', keepInputVisible)
      viewport?.removeEventListener('resize', keepInputVisible)
    }
  }, [])

  return (
    <div className="flex min-h-dvh justify-center">
      <div ref={screenRef} className={`relative flex min-h-dvh w-full max-w-[390px] flex-col ${tone === 'surface' ? 'bg-surface' : 'bg-canvas'}`}>
        <header className={`flex h-[calc(3rem+env(safe-area-inset-top))] shrink-0 items-center gap-1.5 pt-[env(safe-area-inset-top)] pr-6 ${!showBack && !reserveBackSpace ? 'pl-4' : 'pl-3'}`}>
          {showBack ? (
            <button
              type="button"
              onClick={onBack ?? (() => back(backFallback))}
              className="-m-2.5 flex size-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-brand"
              aria-label="뒤로 가기"
            >
              {backIcon ?? <Icon name="chevron-left" />}
            </button>
          ) : reserveBackSpace ? (
            <span className="w-3" />
          ) : null}
          <span className="text-caption-m text-ink-2">소비 습관 돌아보기</span>
        </header>

        <main className={`flex min-w-0 flex-1 flex-col gap-5 px-6 pt-1 pb-[calc(1.75rem+var(--keyboard-offset,0px))] wrap-anywhere ${contentClassName}`}>
          {title ? (
            <div className="flex flex-col gap-1.5">
              <h1 className="text-title-l whitespace-pre-line">{title}</h1>
              {description ? <div className="text-body text-ink-2">{description}</div> : null}
            </div>
          ) : null}
          {children}
        </main>

        {footer ? (
          <footer ref={footerRef} className="sticky bottom-[var(--keyboard-offset,0px)] flex max-h-[var(--footer-max-height,none)] flex-col gap-2.5 overflow-y-auto overscroll-contain border-t border-line bg-surface px-6 pt-3.5 pb-[max(20px,env(safe-area-inset-bottom))] [&>*]:shrink-0">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
