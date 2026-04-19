/**
 * Detects whether a real external AI key is configured (OpenAI / Anthropic / unified AI_API_KEY).
 * Placeholder values from examples or short test strings are treated as unset so the app can run
 * on structured drafts only.
 */
export function hasConfiguredAiApiKeys() {
  for (const name of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'AI_API_KEY']) {
    const v = String(process.env[name] || '').trim()
    if (looksLikeRealAiApiKey(v)) {
      return true
    }
  }
  return false
}

function looksLikeRealAiApiKey(value) {
  if (!value || value.length < 24) {
    return false
  }
  const lower = value.toLowerCase()
  if (lower.includes('...')) {
    return false
  }
  if (
    /your[_-]?key|changeme|placeholder|paste[_\s]?here|^xxx|example[_\s]?key|^sk-xxxxx|^sk-proj-x{3,}/i.test(
      value,
    )
  ) {
    return false
  }
  return true
}
