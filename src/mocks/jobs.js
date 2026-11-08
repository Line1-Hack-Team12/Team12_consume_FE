// ⚠️ 데모용 목업 job · 실제 연동 시 POST /sessions/{sid}/extractions, GET /jobs/{jid} 등 서버 응답으로 교체한다.
// 성공은 시간이 아니라 "폴링 횟수"로 단계를 넘긴다. 화면은 useJobPolling으로 2초마다 상태를 읽는다.
import { generateMockDraft } from './draft'

const jobs = new Map()
let seq = 0

const EXTRACTION_STAGES = ['reading', 'classifying', 'deduplicating', 'preliminary_detecting']
const ANALYSIS_STAGES = ['final_aggregating', 'detecting', 'explaining']

/** 데모 시나리오: URL에 ?demo=partial 을 붙이면 마지막 캡처 1장이 실패한다 */
function demoMode() {
  return new URLSearchParams(window.location.search).get('demo')
}

/**
 * @param {{ assets: Array<{id, name, slotMonth}> }} input  동의 후 전송된 캡처 목록
 */
export function startExtractionJob({ assets }) {
  seq += 1
  const id = `job_ext_${seq}`
  const failId = demoMode() === 'partial' ? assets[assets.length - 1]?.id : null
  jobs.set(id, { type: 'extraction', polls: 0, assets, failId })
  return Promise.resolve({ jobId: id })
}

function extractionState(job) {
  const { assets, failId } = job
  const p = job.polls
  // 파일은 폴링마다 2장씩 읽힌다. 다 읽으면 단계가 하나씩 넘어간다.
  const readCount = Math.min(assets.length, p * 2)
  const perAsset = assets.map((a, i) => ({
    assetId: a.id,
    name: a.name,
    slotMonth: a.slotMonth,
    status: i < readCount ? (a.id === failId ? 'failed' : 'succeeded') : i === readCount ? 'running' : 'queued',
    reason: a.id === failId && i < readCount ? '소비 내역이 아니어서 제외했어요' : null,
  }))
  const readingDone = readCount >= assets.length
  const extraPolls = readingDone ? p - Math.ceil(assets.length / 2) : 0
  const stageIndex = readingDone ? Math.min(EXTRACTION_STAGES.length, 1 + extraPolls) : 0
  const finished = stageIndex >= EXTRACTION_STAGES.length
  const failed = perAsset.filter((x) => x.status === 'failed').length
  const succeededSlots = [...new Set(perAsset.filter((x) => x.status === 'succeeded').map((x) => x.slotMonth))].sort()

  let state = 'running'
  if (finished) state = failed === 0 ? 'succeeded' : failed === assets.length ? 'failed' : 'partial'
  return {
    state,
    stage: finished ? null : EXTRACTION_STAGES[stageIndex],
    perAsset,
    result: finished && state !== 'failed' ? { draft: generateMockDraft(succeededSlots) } : null,
  }
}

export function startAnalysisJob({ snapshotId }) {
  seq += 1
  const id = `job_an_${seq}`
  jobs.set(id, { type: 'analysis', polls: 0, snapshotId })
  return Promise.resolve({ jobId: id, analysisId: `an_${seq}` })
}

function analysisState(job) {
  const idx = job.polls - 1
  if (idx >= ANALYSIS_STAGES.length) return { state: 'succeeded', stage: null }
  return { state: 'running', stage: ANALYSIS_STAGES[Math.max(0, idx)] }
}

export function getJob(jobId) {
  const job = jobs.get(jobId)
  if (!job) return Promise.reject(new Error('job을 찾을 수 없어요'))
  job.polls += 1
  return Promise.resolve(job.type === 'extraction' ? extractionState(job) : analysisState(job))
}

/** 실패한 자산만 다시 읽는다 · 성공한 행은 그대로 두고 중복으로 만들지 않는다 */
export function retryFailedAssets(jobId) {
  const job = jobs.get(jobId)
  if (!job) return Promise.reject(new Error('job을 찾을 수 없어요'))
  seq += 1
  const id = `job_ext_${seq}`
  jobs.set(id, { ...job, polls: 0, failId: null })
  return Promise.resolve({ jobId: id })
}
