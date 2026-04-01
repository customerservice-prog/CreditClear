export function resolveAiProvider({ provider = process.env.AI_PROVIDER, aiKey = process.env.AI_API_KEY, anthropicKey = process.env.ANTHROPIC_API_KEY } = {}) {
  const normalizedProvider = String(provider || '').trim().toLowerCase()

  if (normalizedProvider === 'openai' || normalizedProvider === 'anthropic') {
    return normalizedProvider
  }

  if (anthropicKey) {
    return 'anthropic'
  }

  if (aiKey) {
    return String(aiKey).startsWith('sk-ant-') ? 'anthropic' : 'openai'
  }

  return 'openai'
}

export function resolveAiModel(provider, configuredModel = process.env.AI_MODEL_NAME) {
  const normalizedModel = String(configuredModel || '').trim()

  if (provider === 'anthropic') {
    if (normalizedModel && !/^gpt-|^o\d|^text-/i.test(normalizedModel)) {
      return normalizedModel
    }

    return 'claude-sonnet-4-20250514'
  }

  if (normalizedModel && !/^claude/i.test(normalizedModel)) {
    return normalizedModel
  }

  return 'gpt-4.1-mini'
}
