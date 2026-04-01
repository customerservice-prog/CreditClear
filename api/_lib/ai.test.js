import { describe, expect, it } from 'vitest'
import { resolveAiModel, resolveAiProvider } from './ai.js'

describe('resolveAiProvider', () => {
  it('prefers anthropic when an anthropic key is present', () => {
    expect(resolveAiProvider({ anthropicKey: 'sk-ant-123', aiKey: 'sk-proj-123' })).toBe('anthropic')
  })

  it('detects openai from a standard AI key', () => {
    expect(resolveAiProvider({ aiKey: 'sk-proj-123' })).toBe('openai')
  })

  it('detects anthropic from the AI key prefix', () => {
    expect(resolveAiProvider({ aiKey: 'sk-ant-123' })).toBe('anthropic')
  })
})

describe('resolveAiModel', () => {
  it('keeps a configured OpenAI model', () => {
    expect(resolveAiModel('openai', 'gpt-4.1')).toBe('gpt-4.1')
  })

  it('falls back to an OpenAI default when a Claude model is configured', () => {
    expect(resolveAiModel('openai', 'claude-sonnet-4-20250514')).toBe('gpt-4.1-mini')
  })

  it('keeps a configured Claude model for Anthropic', () => {
    expect(resolveAiModel('anthropic', 'claude-sonnet-4-20250514')).toBe('claude-sonnet-4-20250514')
  })
})
