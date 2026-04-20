import { describe, expect, it } from 'vitest'
import { extractTextFromImageBuffer, MAX_IMAGE_PARSE_BYTES } from './image-ocr.js'

describe('extractTextFromImageBuffer', () => {
  it('rejects non-buffer input', async () => {
    await expect(extractTextFromImageBuffer(null, 'image/png')).rejects.toThrow(/buffer/)
  })

  it('rejects non-image mime type', async () => {
    await expect(extractTextFromImageBuffer(Buffer.from([0]), 'application/pdf')).rejects.toMatchObject({
      code: 'NOT_IMAGE',
    })
  })

  it('rejects oversized buffers', async () => {
    const buf = Buffer.alloc(MAX_IMAGE_PARSE_BYTES + 1)
    await expect(extractTextFromImageBuffer(buf, 'image/png')).rejects.toMatchObject({
      code: 'IMAGE_TOO_LARGE',
    })
  })
})
