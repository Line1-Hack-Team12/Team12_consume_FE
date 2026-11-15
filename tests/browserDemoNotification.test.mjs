import assert from 'node:assert/strict'
import test from 'node:test'
import { requestDemoNotificationPermission, showBrowserDemoNotification } from '../src/utils/browserDemoNotification.js'

function browser(context, Notification, patch = {}) {
  const previous = globalThis.window
  globalThis.window = { Notification, isSecureContext: true, focus() {}, ...patch }
  context.after(() => {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  })
}

test('처음 보내보기 클릭 시 권한 창은 다른 비동기 작업보다 먼저 요청한다', async (context) => {
  const calls = []
  browser(context, { permission: 'default', requestPermission() { calls.push('permission'); return Promise.resolve('granted') } })
  const pending = requestDemoNotificationPermission()
  assert.deepEqual(calls, ['permission'])
  assert.deepEqual(await pending, { granted: true })
})

test('이미 허용했거나 차단한 경우 권한 창을 반복하지 않는다', async (context) => {
  const Notification = { permission: 'granted', requestPermission() { assert.fail('권한 재요청') } }
  browser(context, Notification)
  assert.deepEqual(await requestDemoNotificationPermission(), { granted: true })
  Notification.permission = 'denied'
  const denied = await requestDemoNotificationPermission()
  assert.equal(denied.granted, false)
  assert.match(denied.message, /사이트 설정/)
})

test('미지원·비보안 환경과 권한 취소·오류는 인앱 대체용 사유를 반환한다', async (context) => {
  browser(context, undefined)
  delete globalThis.window.Notification
  assert.equal((await requestDemoNotificationPermission()).granted, false)
  globalThis.window.Notification = { permission: 'default', requestPermission: async () => 'default' }
  globalThis.window.isSecureContext = false
  assert.match((await requestDemoNotificationPermission()).message, /HTTPS/)
  globalThis.window.isSecureContext = true
  assert.match((await requestDemoNotificationPermission()).message, /허용하지 않아/)
  globalThis.window.Notification.requestPermission = async () => { throw new Error('브라우저 거부') }
  assert.match((await requestDemoNotificationPermission()).message, /확인하지 못했어요/)
})

test('기존 제목·본문으로 DEMO 시스템 알림을 만들고 클릭하면 현재 창으로 돌아온다', (context) => {
  let received
  let focused = false
  let closed = false
  class Notification {
    constructor(title, options) { received = { title, options } }
    close() { closed = true }
  }
  browser(context, Notification, { focus() { focused = true } })
  const notification = showBrowserDemoNotification({ title: '목요일 21:00', body: '주문하기 전에 냉장고부터 확인해 보세요.', disclaimer: '테스트 안내' })
  assert.equal(received.title, '돈워리 DEMO · 목요일 21:00')
  assert.equal(received.options.body, '주문하기 전에 냉장고부터 확인해 보세요.\n테스트 안내')
  assert.equal(received.options.icon, '/android-chrome-192x192.png')
  assert.equal(received.options.renotify, true)
  notification.onclick()
  assert.equal(focused, true)
  assert.equal(closed, true)
})
