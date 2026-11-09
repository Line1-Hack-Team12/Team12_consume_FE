import { useEffect, useRef, useState } from 'react'

// 실제로 넘칠 때만 양 끝에서 잠시 멈추며 왕복한다. 크기·폰트 변경도 다시 측정한다.
export default function MarqueeText({ text }) {
  const viewportRef = useRef(null)
  const textRef = useRef(null)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const viewport = viewportRef.current
    const content = textRef.current
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animation
    let hovered = false
    let focused = false

    const measure = () => {
      animation?.cancel()
      animation = null
      const distance = Math.max(0, content.scrollWidth - viewport.clientWidth)
      setOverflowing(distance > 0)
      if (distance === 0 || reducedMotion.matches) return

      const pause = 1500
      const duration = Math.max(2500, distance / 24 * 1000) + pause * 2
      animation = content.animate(
        [
          { transform: 'translateX(0)', offset: 0 },
          { transform: 'translateX(0)', offset: pause / duration },
          { transform: `translateX(-${distance}px)`, offset: 1 - pause / duration },
          { transform: `translateX(-${distance}px)`, offset: 1 },
        ],
        { duration, iterations: Infinity, direction: 'alternate', easing: 'linear' },
      )
      if (hovered || focused) animation.pause()
    }

    const onPointerEnter = (event) => {
      if (event.pointerType !== 'mouse') return
      hovered = true
      animation?.pause()
    }
    const onPointerLeave = () => {
      hovered = false
      if (!focused) animation?.play()
    }
    const onFocus = () => {
      focused = true
      animation?.pause()
    }
    const onBlur = () => {
      focused = false
      if (!hovered) animation?.play()
    }

    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(content)
    reducedMotion.addEventListener('change', measure)
    viewport.addEventListener('pointerenter', onPointerEnter)
    viewport.addEventListener('pointerleave', onPointerLeave)
    viewport.addEventListener('focusin', onFocus)
    viewport.addEventListener('focusout', onBlur)

    return () => {
      animation?.cancel()
      observer.disconnect()
      reducedMotion.removeEventListener('change', measure)
      viewport.removeEventListener('pointerenter', onPointerEnter)
      viewport.removeEventListener('pointerleave', onPointerLeave)
      viewport.removeEventListener('focusin', onFocus)
      viewport.removeEventListener('focusout', onBlur)
    }
  }, [text])

  return (
    <span
      ref={viewportRef}
      tabIndex={overflowing ? 0 : undefined}
      title={text}
      className="block min-w-0 overflow-clip rounded-sm [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:overflow-x-auto [&::-webkit-scrollbar]:hidden"
    >
      <span ref={textRef} className="block w-max whitespace-nowrap">{text}</span>
    </span>
  )
}
