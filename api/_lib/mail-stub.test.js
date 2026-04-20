import { afterEach, describe, expect, it } from 'vitest'
import { isMailEnabled, mailLetter, MAIL_BUREAUS, MAIL_STUB_POSTAGE_CENTS } from './mail-stub.js'

const ORIGINAL_ENV = process.env.MAIL_ENABLED

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.MAIL_ENABLED
  } else {
    process.env.MAIL_ENABLED = ORIGINAL_ENV
  }
})

describe('isMailEnabled', () => {
  it('defaults to false', () => {
    delete process.env.MAIL_ENABLED
    expect(isMailEnabled()).toBe(false)
  })

  it('accepts truthy variants', () => {
    for (const value of ['1', 'true', 'TRUE', 'yes', 'on']) {
      process.env.MAIL_ENABLED = value
      expect(isMailEnabled()).toBe(true)
    }
  })
})

describe('mailLetter', () => {
  it('throws on unsupported bureau', () => {
    expect(() =>
      mailLetter({
        bureau: 'fakebureau',
        letterId: '11111111-1111-1111-1111-111111111111',
        letterText: 'hi',
        sender: { name: 'Jane Doe' },
      }),
    ).toThrow()
  })

  it.each([...MAIL_BUREAUS])('returns a stub send payload for %s', (bureau) => {
    const payload = mailLetter({
      bureau,
      letterId: '12345678-1234-1234-1234-123456789012',
      letterText: 'Test letter body.',
      sender: { name: 'Jane Doe', address: '1 Main St', city: 'Austin', state: 'TX', zip: '78701' },
    })
    expect(typeof payload.trackingNumber).toBe('string')
    expect(payload.trackingNumber.length).toBe(22)
    expect(payload.trackingNumber.startsWith('9407')).toBe(true)
    expect(payload.postageCents).toBe(MAIL_STUB_POSTAGE_CENTS)
    expect(typeof payload.mailedAt).toBe('string')
    expect(payload.recipient.name.length).toBeGreaterThan(0)
    expect(Array.isArray(payload.recipient.address)).toBe(true)
    expect(payload.providerPayload.provider).toBe('stub')
  })
})
