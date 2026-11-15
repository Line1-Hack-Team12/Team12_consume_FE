import { useEffect, useRef, useState } from 'react'
import { REMINDER_DISCLAIMER } from '../constants/patternResponses'
import { requestDemoNotificationPermission, showBrowserDemoNotification } from '../utils/browserDemoNotification'

export default function useDemoNotification() {
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [demoPreview, setDemoPreview] = useState(null)
  const active = useRef(false)
  const sendingLock = useRef(false)
  const attempt = useRef(0)

  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  const send = async (loadPreview) => {
    if (sendingLock.current) return false
    sendingLock.current = true
    const requestId = ++attempt.current
    setSending(true); setFeedback(null); setDemoPreview(null)
    try {
      const permission = await requestDemoNotificationPermission()
      if (!active.current) return false
      const data = await loadPreview()
      if (!active.current) return false
      const preview = { ...data, disclaimer: data.disclaimer || REMINDER_DISCLAIMER }
      const fallback = (message) => {
        if (!active.current || attempt.current !== requestId) return
        const reason = `${message} 인앱 미리보기를 대신 보여드려요.`
        setFeedback({ tone: 'warn', message: reason })
        setDemoPreview({ ...preview, reason })
      }
      if (!permission.granted) {
        fallback(permission.message)
        return false
      }
      try {
        const notification = showBrowserDemoNotification(preview)
        notification.onerror = () => fallback('브라우저 알림을 표시하지 못했어요. 브라우저와 기기의 알림 설정을 확인해 주세요.')
        setFeedback({ tone: 'brand', message: '브라우저에 데모 알림 표시를 요청했어요. 보이지 않으면 브라우저·기기의 알림 허용과 방해금지 설정을 확인해 주세요.' })
        return true
      } catch {
        fallback('이 환경에서 브라우저 알림을 표시하지 못했어요. PC 브라우저에서 다시 시도해 주세요.')
        return false
      }
    } finally {
      sendingLock.current = false
      if (active.current) setSending(false)
    }
  }

  return { send, sending, feedback, demoPreview, dismissPreview: () => setDemoPreview(null) }
}
