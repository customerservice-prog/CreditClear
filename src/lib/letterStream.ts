import type { AppInfo, CreditFile, IssueDetailsMap, Letter, LetterStreamEvent, LetterType } from '../types'
import { getAccessTokenForApi } from './authSession'
import { requireSupabase } from './supabase'

interface GenerateLettersInput {
  agencies: string[]
  files: CreditFile[]
  info: AppInfo
  issues: string[]
  issueDetails: IssueDetailsMap
  letterType: LetterType
  onEvent: (event: LetterStreamEvent) => void
}

function normalizeSseText(buffer: string): string {
  return buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/**
 * Parse Server-Sent Events by lines (SSE events end with a blank line). Splitting only on `\n\n`
 * fails for CRLF-only frames and can concatenate/join chunks incorrectly for large payloads.
 */
function dispatchSseFromLineBuffer(
  lineBuffer: string,
  dataLines: string[],
  onEvent: (event: LetterStreamEvent) => void,
): { lineBuffer: string; shouldStop: boolean } {
  let buf = lineBuffer

  while (buf.includes('\n')) {
    const i = buf.indexOf('\n')
    const line = buf.slice(0, i)
    buf = buf.slice(i + 1)

    if (line === '') {
      if (dataLines.length === 0) {
        continue
      }
      const raw = dataLines.join('\n')
      dataLines.length = 0
      try {
        onEvent(JSON.parse(raw) as LetterStreamEvent)
      } catch {
        onEvent({
          message:
            'The letter stream was malformed. If this persists, try again or contact support.',
          type: 'error',
        })
        return { lineBuffer: buf, shouldStop: true }
      }
      continue
    }

    const trimmed = line.split('\u0000').join('').trimEnd()
    if (trimmed.startsWith('data:')) {
      dataLines.push(trimmed.slice(5).trimStart())
    }
  }

  return { lineBuffer: buf, shouldStop: false }
}

const GENERATION_FETCH_TIMEOUT_MS = 22 * 60 * 1000

export async function streamGeneratedLetters({
  agencies,
  files,
  info,
  issues,
  issueDetails,
  letterType,
  onEvent,
}: GenerateLettersInput) {
  const abortController = new AbortController()
  let bodyReader: ReadableStreamDefaultReader<Uint8Array> | null = null

  const deadlineTimer = window.setTimeout(() => {
    abortController.abort()
    void bodyReader
      ?.cancel()
      .catch(() => {
        /* ignore */
      })
  }, GENERATION_FETCH_TIMEOUT_MS)

  const bodyPayload = { agencies, files, info, issues, issueDetails, letterType }

  const runFetch = (token: string) =>
    fetch('/api/generate-dispute-draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bodyPayload),
      signal: abortController.signal,
    })

  try {
    let token = await getAccessTokenForApi()
    let response = await runFetch(token)

    if (!response.ok && response.status === 401) {
      const supabase = requireSupabase()
      await supabase.auth.refreshSession()
      token = await getAccessTokenForApi()
      response = await runFetch(token)
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(payload.error || 'Unable to generate letters.')
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      const snippet = await response.clone().text()
      throw new Error(
        snippet.trimStart().startsWith('<!') || /<html[\s>]/i.test(snippet)
          ? 'The app received an HTML page instead of a live stream. Confirm API routes are deployed with the static site.'
          : 'Unexpected response while starting letter generation. Please try again.',
      )
    }

    if (!response.body) {
      throw new Error('Streaming is not available in this browser.')
    }

    bodyReader = response.body.getReader()
    const decoder = new TextDecoder()
    let lineBuffer = ''
    const pendingData: string[] = []

    while (true) {
      let readResult: ReadableStreamReadResult<Uint8Array>
      try {
        readResult = await bodyReader.read()
      } catch (error) {
        if (abortController.signal.aborted) {
          throw new Error('Letter generation timed out. Try fewer issues or bureaus, or try again later.')
        }
        throw error
      }

      const { done, value } = readResult

      if (value) {
        lineBuffer += decoder.decode(value, { stream: true })
      }
      if (done) {
        lineBuffer += decoder.decode()
      }

      lineBuffer = normalizeSseText(lineBuffer)
      const pass = dispatchSseFromLineBuffer(lineBuffer, pendingData, onEvent)
      lineBuffer = pass.lineBuffer
      if (pass.shouldStop) {
        return
      }

      if (done) {
        if (pendingData.length) {
          const raw = pendingData.join('\n')
          pendingData.length = 0
          try {
            onEvent(JSON.parse(raw) as LetterStreamEvent)
          } catch {
            onEvent({
              message:
                'The letter stream was malformed. If this persists, try again or contact support.',
              type: 'error',
            })
          }
        } else if (lineBuffer.trim()) {
          const tail = lineBuffer.trimEnd()
          if (tail.startsWith('data:')) {
            const raw = tail.slice(5).trimStart()
            try {
              onEvent(JSON.parse(raw) as LetterStreamEvent)
            } catch {
              onEvent({
                message:
                  'The letter stream was malformed. If this persists, try again or contact support.',
                type: 'error',
              })
            }
          }
        }
        break
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Letter generation was cancelled or timed out. Try again with fewer selections.')
    }
    throw error
  } finally {
    window.clearTimeout(deadlineTimer)
    void bodyReader?.releaseLock()
  }
}

export function normalizeLetters(letters: Letter[]) {
  return letters.map((letter, index) => ({
    ...letter,
    id: letter.id || `${letter.issue}-${letter.agency}-${index}`,
  }))
}
