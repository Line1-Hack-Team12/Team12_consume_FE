import { useNavigation } from '../../hooks/navigationContext'
import Icon from '../ui/Icon'

/**
 * 모든 모바일 화면의 공통 틀 (Figma AppHeader + Content + Footer)
 * - 390px 기준, 넓은 화면에서는 가운데 정렬
 * - footer는 화면 아래에 붙고 Safe Area만큼 여백을 둔다
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
  return (
    <div className="flex min-h-dvh justify-center">
      <div className={`relative flex min-h-dvh w-full max-w-[390px] flex-col ${tone === 'surface' ? 'bg-surface' : 'bg-canvas'}`}>
        <header className={`flex h-12 items-center gap-1.5 pt-[env(safe-area-inset-top)] pr-6 ${!showBack && !reserveBackSpace ? 'pl-4' : 'pl-3'}`}>
          {showBack ? (
            <button
              type="button"
              onClick={onBack ?? (() => back(backFallback))}
              className="-m-1 rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-brand"
              aria-label="뒤로 가기"
            >
              {backIcon ?? <Icon name="chevron-left" />}
            </button>
          ) : reserveBackSpace ? (
            <span className="w-3" />
          ) : null}
          <span className="text-caption-m text-ink-2">소비 습관 돌아보기</span>
        </header>

        <main className={`flex flex-1 flex-col gap-5 px-6 pt-1 pb-7 ${contentClassName}`}>
          {title ? (
            <div className="flex flex-col gap-1.5">
              <h1 className="text-title-l whitespace-pre-line">{title}</h1>
              {description ? <div className="text-body text-ink-2">{description}</div> : null}
            </div>
          ) : null}
          {children}
        </main>

        {footer ? (
          <footer className="sticky bottom-0 flex flex-col gap-2.5 border-t border-line bg-surface px-6 pt-3.5 pb-[max(20px,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
