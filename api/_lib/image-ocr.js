/**
 * English OCR for credit-report screenshots (PNG, JPEG, WebP, HEIC, etc.).
 * Normalizes via sharp (rotate EXIF, downscale wide photos) then runs
 * tesseract.js. One worker is shared and jobs are serialized to limit RAM.
 */

import sharp from 'sharp'
import { createWorker } from 'tesseract.js'

export const MAX_IMAGE_PARSE_BYTES = 9 * 1024 * 1024
const MAX_WIDTH_PX = 2400

/** Serialize OCR — tesseract worker is not safe for concurrent recognize() */
let ocrQueue = Promise.resolve()

let workerPromise = null

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      // eslint-disable-next-line no-empty-function
      logger: () => {},
    })
  }
  return workerPromise
}

function runSerialized(fn) {
  const next = ocrQueue.then(() => fn())
  ocrQueue = next.catch(() => {})
  return next
}

/**
 * @param {Buffer} buffer Raw image bytes from storage
 * @param {string} mimeType e.g. image/jpeg
 * @returns {Promise<string>} Extracted plain text (may be empty on unreadable image)
 */
export async function extractTextFromImageBuffer(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('buffer must be a Buffer')
  }
  if (buffer.length > MAX_IMAGE_PARSE_BYTES) {
    const err = new Error('IMAGE_TOO_LARGE')
    err.code = 'IMAGE_TOO_LARGE'
    throw err
  }
  const mime = String(mimeType || '').toLowerCase()
  if (!mime.startsWith('image/')) {
    const err = new Error('NOT_IMAGE')
    err.code = 'NOT_IMAGE'
    throw err
  }

  return runSerialized(async () => {
    let pngBuffer
    try {
      pngBuffer = await sharp(buffer)
        .rotate()
        .resize({ width: MAX_WIDTH_PX, height: MAX_WIDTH_PX, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer()
    } catch {
      const err = new Error('IMAGE_DECODE_FAILED')
      err.code = 'IMAGE_DECODE_FAILED'
      throw err
    }

    const worker = await getWorker()
    const {
      data: { text },
    } = await worker.recognize(pngBuffer)
    return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
  })
}
