import { BANK_FILE_MIME, IMAGE_MIME_TYPES, MAX_BANK_FILE_BYTES, MAX_FILE_BYTES, MAX_FILES_PER_UPLOAD, PDF_MIME_TYPE } from '../constants/limits.js'

const OLE_HEADER = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const ZIP_HEADER = [0x50, 0x4b, 0x03, 0x04]
const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d] // %PDF-

export const REJECT_REASON = {
  imageType: '보조 내역은 JPG·PNG·WebP 캡처 또는 PDF로 추가해 주세요',
  bankType: '토스뱅크에서 발급한 .xlsx 거래내역 파일을 선택해 주세요',
  size: '보조 내역은 파일당 10MB까지 올릴 수 있어요',
  bankSize: '거래내역 파일은 20MB까지 올릴 수 있어요',
  count: '캡처·PDF는 한 번에 10개까지만 추가할 수 있어요',
  decode: '파일을 읽을 수 없어요. 원본 파일을 다시 선택해 주세요',
}

async function canDecodeImage(file) {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file)
      bitmap.close()
      return true
    }
    const url = URL.createObjectURL(file)
    try {
      return await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0)
        img.onerror = () => resolve(false)
        img.src = url
      })
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return false
  }
}

// 암호화된 xlsx는 OLE 컨테이너다. 실제 문서 파싱·암호 검증은 동의 후 서버가 한다.
async function hasWorkbookHeader(file) {
  try {
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer())
    return [ZIP_HEADER, OLE_HEADER].some((header) => header.every((byte, index) => bytes[index] === byte))
  } catch {
    return false
  }
}

async function hasPdfHeader(file) {
  try {
    const bytes = new Uint8Array(await file.slice(0, PDF_HEADER.length).arrayBuffer())
    return PDF_HEADER.every((byte, index) => bytes[index] === byte)
  } catch {
    return false
  }
}

export async function validateFiles(files, { kind = 'image', decodeImage = canDecodeImage } = {}) {
  const results = []
  for (const [index, file] of files.entries()) {
    const mime = file.type.toLowerCase()
    const isBank = kind === 'file'
    const isPdf = !isBank && /\.pdf$/i.test(file.name)
    const base = { id: `local_${crypto.randomUUID()}`, file, name: file.name, size: file.size, kind: isPdf ? 'pdf' : kind }
    const validType = isBank
      ? /\.xlsx$/i.test(file.name) && ['', 'application/octet-stream', 'application/x-ole-storage', BANK_FILE_MIME].includes(mime)
      : isPdf ? ['', 'application/octet-stream', PDF_MIME_TYPE].includes(mime) : IMAGE_MIME_TYPES.includes(mime)
    let reason
    if (!isBank && index >= MAX_FILES_PER_UPLOAD) reason = REJECT_REASON.count
    else if (!validType) reason = isBank ? REJECT_REASON.bankType : REJECT_REASON.imageType
    else if (file.size > (isBank ? MAX_BANK_FILE_BYTES : MAX_FILE_BYTES)) reason = isBank ? REJECT_REASON.bankSize : REJECT_REASON.size
    else if (file.size === 0 || !(await (isBank ? hasWorkbookHeader(file) : isPdf ? hasPdfHeader(file) : decodeImage(file)))) reason = REJECT_REASON.decode
    results.push({ ...base, status: reason ? 'rejected' : 'accepted', ...(reason ? { reason } : {}) })
  }
  return results
}
