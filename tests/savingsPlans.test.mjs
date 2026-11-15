import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { selectSavingsPlan } from '../src/api/analysis.js'

let vite
let createSavingsPlanStore
let summarizeCompletion
let PlanGoalSummary
let SavingsPlanCard

before(async () => {
  vite = await createServer({ configFile: false, cacheDir: '/tmp/team12-savings-plans-tests', plugins: [react()],
    optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null } })
  ;({ createSavingsPlanStore } = await vite.ssrLoadModule('/src/mocks/plans.js'))
  ;({ summarizeCompletion } = await vite.ssrLoadModule('/src/utils/completionSummary.js'))
  ;({ default: PlanGoalSummary } = await vite.ssrLoadModule('/src/components/ui/PlanGoalSummary.jsx'))
  ;({ default: SavingsPlanCard } = await vite.ssrLoadModule('/src/pages/S09/SavingsPlanCard.jsx'))
})
after(async () => { await vite?.close() })

const model = {
  snapshotId: '91', defaultLockedIds: [], locks: [], patterns: [], basisLabel: '테스트',
  candidates: [{ id: 'taxi', lockId: 'taxi', kind: 'subtag', label: '택시', monthlySavingsKrw: 76250, painScore: 0.5 }],
}

test('목표가 절감 가능액을 넘어도 목표·슬라이더 상한을 유지하고 미달 플랜을 확정한다', async () => {
  const store = createSavingsPlanStore({ responseStore: { enableFromPlan: () => [] } })
  const key = 'snapshot:91'
  store.setSnapshot('91')
  await store.load(key, model)
  store.setGoal(key, 78610)
  await store.load(key, model)
  const entry = store.get(key)
  assert.equal(entry.goalKrw, 78610)
  assert.equal(entry.sliderMaxKrw, 500000)
  assert.equal(entry.response.plans[0].goalMet, false)
  assert.equal(await store.confirmSelection(key), true)
  const saved = store.getSelectedPlan()
  assert.equal(saved.goalKrw, 78610)
  assert.equal(saved.plan.monthlySavingsKrw, 76250)
  const summary = summarizeCompletion({ patterns: [], entries: [], scope: key, snapshotId: '91', planSelection: saved })
  assert.equal(summary.selectedPlanGoalKrw, 78610)
  assert.equal(summary.selectedPlan.monthlySavingsKrw, 76250)
  store.setGoal(key, 76250)
  await store.load(key, model)
  assert.equal(store.get(key).goalKrw, 76250)
  assert.equal(store.get(key).response.plans[0].goalMet, true)
  store.setSnapshot('92')
  assert.equal(store.getSelectedPlan(), null)
})

test('서버 선택 요청은 미달 플랜도 보내며 사용자 목표와 예상 절감액을 따로 전달한다', async (context) => {
  let sent
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    sent = { url, method: init.method, body: JSON.parse(init.body) }
    return Response.json({ success: true, data: {} })
  })
  await selectSavingsPlan(19, { id: 'PLAN_A', title: '택시 중심', monthlySavingsKrw: 76250, goalMet: false }, 78610)
  assert.deepEqual(sent, {
    url: '/api/sessions/19/savings-plans/select', method: 'POST',
    body: { targetAmount: 78610, planCode: 'PLAN_A', planTitle: '택시 중심', monthlySavedAmount: 76250, enableDemoNotification: true },
  })
})

test('미달 카드·선택 요약은 부족액과 예상 금액을 구분하고 목표 달성으로 표시하지 않는다', () => {
  const plan = { id: 'PLAN_A', label: '플랜 A', title: '택시 중심', monthlySavingsKrw: 76250, items: [] }
  const card = renderToStaticMarkup(createElement(SavingsPlanCard, { plan, goalKrw: 78610, selected: true, disabled: false, onSelect() {} }))
  assert.match(card, /목표까지 월 .*2,360원.* 부족/)
  assert.doesNotMatch(card, /disabled|목표 달성/)
  const summary = renderToStaticMarkup(createElement(PlanGoalSummary, { goalKrw: 78610, plan }))
  assert.match(summary, /월 저축 목표.*78,610원/)
  assert.match(summary, /예상 월 절감액.*76,250원/)
  assert.match(summary, /2,360원/)
})
