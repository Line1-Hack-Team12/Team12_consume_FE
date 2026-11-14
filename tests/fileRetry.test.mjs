import assert from 'node:assert/strict'
import { File } from 'node:buffer'
import test from 'node:test'
import { retryFailedFiles } from '../src/api/sessions.js'
import { toExtractionJob } from '../src/api/adapters.js'
import { buildFileRetryBatches, findRetryOriginal } from '../src/utils/fileRetry.js'

const local = (id, name, kind = 'image', slotMonth = '2026-09') => ({
  id, name, kind, slotMonth, status: 'accepted', file: new File([`bytes:${id}`], name),
})
const failed = (assetId, name, extra = {}) => ({ assetId, name, status: 'failed', retryable: true, ...extra })

test('실패한 파일만 원본과 연결하고 서로 다른 암호는 요청을 나눈다', () => {
  const originals = [local('a', 'ok.png'), local('b', 'capture.png'), local('c', 'one.xlsx', 'file'), local('d', 'two.xlsx', 'file')]
  const assets = [{ assetId: 1, name: 'ok.png', status: 'succeeded' }, failed(2, 'capture.png'), failed(3, 'one.xlsx'), failed(4, 'two.xlsx'), failed(5, 'unsupported.png', { retryable: false })]
  const batches = buildFileRetryBatches(assets, originals, { 3: 'first', 4: 'second' })
  assert.deepEqual(batches.map((batch) => batch.fileIds), [[2], [3], [4]])
  assert.deepEqual(batches.flatMap((batch) => batch.assets.map((file) => file.file)), originals.slice(1).map((file) => file.file))
  assert.deepEqual(batches.map((batch) => batch.assets[0].password), ['', 'first', 'second'])
})

test('같은 이름은 슬롯으로 구분하고 같은 슬롯에서 중복되면 전송을 막는다', () => {
  const originals = [local('a', 'same.png', 'image', '2026-08'), local('b', 'same.png')]
  const asset = failed(9, 'same.png', { slotMonth: '2026-09' })
  assert.equal(findRetryOriginal(asset, originals)?.id, 'b')
  assert.equal(findRetryOriginal(failed(9, 'same.png'), originals), null)
  assert.throws(() => buildFileRetryBatches([asset], [...originals, local('c', 'same.png')], {}), /원본/)
  assert.throws(() => buildFileRetryBatches([failed(1, 'missing.png')], originals, {}), /원본/)
})

test('자동 재시도는 가능한 캡처만 보내고 엑셀과 영구 실패는 제외한다', () => {
  const originals = [local('a', 'capture.png'), local('b', 'bank.xlsx', 'file'), local('c', 'refused.png')]
  const assets = [failed(1, 'capture.png'), failed(2, 'bank.xlsx'), failed(3, 'refused.png', { retryable: false }), failed(4, 'missing.png')]
  assert.deepEqual(buildFileRetryBatches(assets, originals, {}, { automatic: true }).map((batch) => batch.fileIds), [[1]])
  assert.throws(() => buildFileRetryBatches(assets, originals, {}), /원본/)
})

test('암호 오류는 수동 재시도가 가능하고 남은 실패를 완료로 표시하지 않는다', () => {
  const job = toExtractionJob({ status: 'REVIEWING', fileStatuses: [{ fileId: 1, fileName: 'ok.png', statusText: '완료' }],
    failedFiles: [{ fileId: 2, fileName: 'bank.xlsx', errorCode: 'INVALID_PASSWORD' }, { fileId: 3, fileName: 'bad.png', errorCode: 'UNSUPPORTED_FORMAT' }] })
  assert.equal(job.state, 'partial')
  assert.equal(job.perAsset.find((asset) => asset.assetId === 2).retryable, true)
  assert.equal(job.perAsset.find((asset) => asset.assetId === 3).retryable, false)
  assert.equal(toExtractionJob({ status: 'REVIEWING', failedFiles: [{ fileId: 2, fileName: 'bank.xlsx' }] }).state, 'failed')
  assert.equal(toExtractionJob({ status: 'EXTRACTING', failedFiles: [{ fileId: 2, fileName: 'bank.xlsx' }] }).state, 'running')
})

test('재시도 API는 파일 ID 순서에 맞는 실제 바이너리를 multipart로 전송한다', async (context) => {
  const assets = [local('a', 'one.png'), local('b', 'two.png')]
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    const request = new Request(`http://localhost${url}`, init)
    const query = new URL(request.url).searchParams
    assert.equal(request.method, 'POST')
    assert.equal(new URL(request.url).pathname, '/api/sessions/123/retry-failed')
    assert.deepEqual(query.getAll('fileIds'), ['41', '42'])
    assert.equal(query.get('ownerName'), '테스트')
    assert.equal(query.has('slotMonths'), false)
    assert.match(request.headers.get('Content-Type'), /^multipart\/form-data; boundary=/)
    const files = (await request.formData()).getAll('files')
    assert.deepEqual(files.map((file) => file.name), ['one.png', 'two.png'])
    assert.deepEqual(await Promise.all(files.map((file) => file.text())), ['bytes:a', 'bytes:b'])
    return Response.json({ success: true, data: 'EXTRACTING' })
  })
  assert.equal(await retryFailedFiles(123, [41, 42], { settings: { ownerName: ' 테스트 ' }, consent: true, assets }), 'EXTRACTING')
})

test('동의·원본·ID가 없는 재시도는 서버에 요청하지 않는다', (context) => {
  const fetch = context.mock.method(globalThis, 'fetch', () => { throw new Error('전송되면 안 됨') })
  const input = { settings: {}, consent: true, assets: [local('a', 'one.png')] }
  assert.throws(() => retryFailedFiles(1, [], input), /원본/)
  assert.throws(() => retryFailedFiles(1, [null], input), /원본/)
  assert.throws(() => retryFailedFiles(1, [2, 2], { ...input, assets: [...input.assets, ...input.assets] }), /원본/)
  assert.throws(() => retryFailedFiles(1, [2], { ...input, consent: false }), /동의/)
  assert.throws(() => retryFailedFiles(1, [2], { ...input, assets: [{ name: 'missing.png' }] }), /원본/)
  assert.equal(fetch.mock.callCount(), 0)
})

test('암호를 전달하고 서버 재시도 거부를 성공으로 처리하지 않는다', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(new URL(`http://localhost${url}`).searchParams.get('filePassword'), 'retry-password')
    return Response.json({ success: false, message: '파일 암호를 확인해 주세요.' }, { status: 400 })
  })
  await assert.rejects(retryFailedFiles(1, [2], { settings: {}, consent: true, assets: [{ ...local('a', 'bank.xlsx', 'file'), password: 'retry-password' }] }), /파일 암호/)
})
