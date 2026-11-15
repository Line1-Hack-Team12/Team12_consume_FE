import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { applyAnalysisNarratives } from '../src/api/analysisRecovery.js'

let vite
let ResultsPage
let AnalysisSessionContext
let NavigationContext

before(async () => {
  vite = await createServer({ configFile: false, cacheDir: '/tmp/team12-narratives-tests', plugins: [react()],
    optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null } })
  ResultsPage = (await vite.ssrLoadModule('/src/pages/S05ResultsPage.jsx')).default
  AnalysisSessionContext = (await vite.ssrLoadModule('/src/hooks/analysisSessionContext.js')).AnalysisSessionContext
  NavigationContext = (await vite.ssrLoadModule('/src/hooks/navigationContext.js')).NavigationContext
})
after(async () => { await vite?.close() })

test('재생성 응답 뒤 Results의 총평·카드 제목·관찰 문구는 새 말투로 표시하고 금액은 유지한다', () => {
  const original = {
    mode: 'server', analysisId: 7, snapshotId: '91', slots: ['2026-10'], totalKrw: 5000,
    topCategories: [], summaryByTone: { coach: '기존 총평' }, lockedPatterns: [],
    patterns: [{ id: '11', title: '기존 제목', observation: '기존 관찰', monthlyAmountKrw: 5000,
      copyByTone: { coach: { observation: '기존 관찰', hypothesisQuestion: '기존 질문', action: '기존 행동' } } }],
  }
  const response = { analysisId: 7, status: 'AI', overallComment: '친구 말투 총평',
    narratives: [{ patternId: 11, title: '친구 말투 제목', observation: '친구 말투 관찰', hypothesisQuestion: '친구 질문', action: '친구 행동' }] }
  const updated = applyAnalysisNarratives(original, response, 'friend')
  const previousWindow = globalThis.window
  globalThis.window = { location: { search: '' } }
  try {
    const html = renderToStaticMarkup(createElement(AnalysisSessionContext.Provider, {
      value: { settings: { tone: 'friend' }, snapshot: { id: '91' }, analysis: updated, toneBusy: false },
    }, createElement(NavigationContext.Provider, { value: { navigate() {}, back() {} } }, createElement(ResultsPage))))
    assert.match(html, /친구 말투 총평/)
    assert.match(html, /친구 말투 제목/)
    assert.match(html, /친구 말투 관찰/)
    assert.match(html, /5,000원/)
    assert.doesNotMatch(html, /기존 제목|기존 관찰|기존 총평/)
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
