import type { AppInfo, CreditFile, Letter, LetterStreamEvent } from '../types'

interface GenerateLettersInput {
  accessToken: string
  agencies: string[]
  files: CreditFile[]
  info: AppInfo
  issues: string[]
  onEvent: (event: LetterStreamEvent) => void
}

export async function streamGeneratedLetters({
  accessToken,
  agencies,
  files,
  info,
  issues,
  onEvent,
}: GenerateLettersInput) {
  const response = await fetch('/api/generate-dispute-draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      agencies,
      files,
      info,
      issues,
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || 'Unable to generate letters.')
  }

  if (!response.body) {
    throw new Error('Streaming is not available in this browser.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() || ''

    for (const chunk of chunks) {
      const lines = chunk
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      for (const line of lines) {
        if (!line.startsWith('data:')) {
          continue
        }

        const json = line.slice(5).trim()
        if (!json) {
          continue
        }

        try {
          onEvent(JSON.parse(json) as LetterStreamEvent)
        } catch {
          onEvent({
            message: 'The AI response stream was malformed. Please try again.',
            type: 'error',
          })
          return
        }
      }
    }
  }
}

export function normalizeLetters(letters: Letter[]) {
  return letters.map((letter, index) => ({
    ...letter,
    id: letter.id || `${letter.issue}-${letter.agency}-${index}`,
  }))
}
