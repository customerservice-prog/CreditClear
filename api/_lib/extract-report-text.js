/**
 * Pull readable text from user-uploaded PDFs and credit-report screenshots.
 * PDFs: pdf-parse. Images: OCR via image-ocr.js (same pipeline as parse-upload).
 */
import { createRequire } from 'node:module'

import { extractTextFromImageBuffer, MAX_IMAGE_PARSE_BYTES } from './image-ocr.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const BUCKET = 'private-uploads'
const MAX_COMBINED_CHARS = 14_000
const MAX_PDF_BYTES = 9 * 1024 * 1024

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {Array<{ id: string, file_path: string, file_name: string, mime_type: string, file_size: number }>} uploadsForBureau
 * @param {Map<string, string>} [idCache] cache upload id -> extracted text fragment
 */
export async function extractTextFromBureauUploads(client, uploadsForBureau, idCache = new Map()) {
  if (!uploadsForBureau?.length) {
    return { text: '', hadImageOnly: false, pdfFilesTried: 0, imageOcrTried: 0 }
  }

  const fragments = []
  let hadImageOnly = false
  let pdfFilesTried = 0
  let imageOcrTried = 0

  for (const row of uploadsForBureau) {
    const mime = String(row.mime_type || '').toLowerCase()

    if (mime.startsWith('image/')) {
      hadImageOnly = true
      if (row.file_size > MAX_IMAGE_PARSE_BYTES) {
        continue
      }
      if (idCache.has(row.id)) {
        fragments.push(idCache.get(row.id))
        continue
      }
      imageOcrTried += 1
      let piece = ''
      try {
        const { data, error } = await client.storage.from(BUCKET).download(row.file_path)
        if (error || !data) {
          idCache.set(row.id, '')
          continue
        }
        const buffer = Buffer.from(await data.arrayBuffer())
        const raw = await extractTextFromImageBuffer(buffer, mime)
        piece = raw ? `\n\n--- ${row.file_name} (OCR) ---\n\n${raw}` : ''
      } catch {
        piece = ''
      }
      idCache.set(row.id, piece)
      fragments.push(piece)
      continue
    }

    if (mime !== 'application/pdf') {
      continue
    }
    if (row.file_size > MAX_PDF_BYTES) {
      continue
    }

    if (idCache.has(row.id)) {
      fragments.push(idCache.get(row.id))
      continue
    }

    pdfFilesTried += 1
    let piece = ''
    try {
      const { data, error } = await client.storage.from(BUCKET).download(row.file_path)
      if (error || !data) {
        idCache.set(row.id, '')
        continue
      }
      const buffer = Buffer.from(await data.arrayBuffer())
      const parsed = await pdfParse(buffer)
      const raw = typeof parsed.text === 'string' ? parsed.text : ''
      piece = `\n\n--- ${row.file_name} ---\n\n${raw}`
    } catch {
      piece = ''
    }

    idCache.set(row.id, piece)
    fragments.push(piece)
  }

  const merged = fragments.join('')
  const normalized = merged.replace(/\s+/g, ' ').trim().slice(0, MAX_COMBINED_CHARS)

  return {
    hadImageOnly,
    pdfFilesTried,
    imageOcrTried,
    text: normalized,
  }
}
