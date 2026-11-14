// 서버 파일 ID와 로컬 파일 ID는 다르다. 파일명·슬롯이 유일하게 일치할 때만 재전송한다.
export function findRetryOriginal(asset, originals) {
  const accepted = originals.filter((file) => file.status === 'accepted')
  const byId = accepted.find((file) => String(file.id) === String(asset.assetId))
  if (byId) return byId
  const matches = accepted.filter((file) => file.name === asset.name
    && (!asset.kind || file.kind === asset.kind)
    && (file.kind === 'file' || !asset.slotMonth || file.slotMonth === asset.slotMonth))
  return matches.length === 1 ? matches[0] : null
}

export function buildFileRetryBatches(assets, originals, passwords, { automatic = false } = {}) {
  const batches = new Map()
  for (const asset of assets.filter((item) => item.status === 'failed' && item.retryable !== false)) {
    const original = findRetryOriginal(asset, originals)
    // 자동 재시도는 재시도 가능한 캡처만. 엑셀은 암호를 재입력한 뒤 수동으로 보낸다.
    if (automatic && (asset.retryable !== true || original?.kind !== 'image')) continue
    if (!original || asset.assetId == null || asset.assetId === '') {
      throw new Error('다시 읽을 원본을 확인할 수 없어요. 파일 교체를 선택해 주세요.')
    }
    // API는 요청당 암호 하나를 받으므로 같은 암호의 파일을 함께 전송한다.
    const password = original.kind === 'file' ? passwords[asset.assetId] ?? '' : ''
    if (!batches.has(password)) batches.set(password, { fileIds: [], assets: [] })
    const batch = batches.get(password)
    batch.fileIds.push(asset.assetId)
    batch.assets.push({ ...original, password })
  }
  return [...batches.values()]
}
