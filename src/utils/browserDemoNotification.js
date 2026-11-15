export async function requestDemoNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { granted: false, message: '이 브라우저는 시스템 알림을 지원하지 않아요. PC의 Chrome 등 지원하는 브라우저에서 시도해 주세요.' }
  }
  if (!window.isSecureContext) {
    return { granted: false, message: '브라우저 알림은 HTTPS 또는 localhost에서 테스트할 수 있어요.' }
  }
  try {
    // 클릭 이벤트에서 서버 요청보다 먼저 호출해야 브라우저가 권한 창을 열 수 있다.
    const permission = window.Notification.permission === 'default'
      ? await window.Notification.requestPermission()
      : window.Notification.permission
    if (permission === 'granted') return { granted: true }
    return { granted: false, message: permission === 'denied'
      ? '브라우저의 사이트 설정에서 알림을 허용한 뒤 다시 눌러 주세요.'
      : '알림 권한을 허용하지 않아 브라우저 알림을 표시하지 못했어요.' }
  } catch {
    return { granted: false, message: '알림 권한을 확인하지 못했어요. 브라우저의 사이트 설정을 확인해 주세요.' }
  }
}

export function showBrowserDemoNotification({ title, body, disclaimer }) {
  const notification = new window.Notification(`돈워리 DEMO · ${title || '소비 습관 알림'}`, {
    body: [body, disclaimer].filter(Boolean).join('\n'),
    icon: '/android-chrome-192x192.png',
    lang: 'ko',
    tag: 'donworry-demo',
    renotify: true,
  })
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
  return notification
}
