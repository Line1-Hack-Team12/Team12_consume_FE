import { ACCEPTED_MIME_TYPES, MAX_FILE_BYTES, MAX_FILES_PER_UPLOAD } from '../constants/limits'

// F02 파일별 검증 · 형식·용량·개수·디코딩을 확인해 accepted/rejected로 나눈다.
// 서버도 같은 검증을 다시 한다. 여기서는 사용자가 바로 이유를 볼 수 있게 하는 역할이다.

export const REJECT_REASON = {
  type: 'JPG·PNG·WebP만 올릴 수 있어요',
  size: '10MB를 넘는 파일이에요',
  count: '한 번에 10장까지만 올릴 수 있어요',
  decode: '이미지를 열 수 없어요',
}

async function canDecode(file) {
  if (typeof createImageBitmap !== 'function') return true
  try {
    const bitmap = await createImageBitmap(file)
    bitmap.close?.()
    return true
  } catch {
    return false
  }
}

let seq = 0
const nextId = () => `local_${Date.now().toString(36)}_${(seq += 1)}`

/**
 * @param {File[]} files 이번에 고른 파일
 * @returns {Promise<Array<{id, file, name, size, status: 'accepted'|'rejected', reason?: string}>>}
 */
export async function validateFiles(files) {
  const results = []
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i]
    const base = { id: nextId(), file, name: file.name, size: file.size }
    if (i >= MAX_FILES_PER_UPLOAD) {
      results.push({ ...base, status: 'rejected', reason: REJECT_REASON.count })
    } else if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      results.push({ ...base, status: 'rejected', reason: REJECT_REASON.type })
    } else if (file.size > MAX_FILE_BYTES) {
      results.push({ ...base, status: 'rejected', reason: REJECT_REASON.size })
    } else if (!(await canDecode(file))) {
      results.push({ ...base, status: 'rejected', reason: REJECT_REASON.decode })
    } else {
      results.push({ ...base, status: 'accepted' })
    }
  }
  return results
}
