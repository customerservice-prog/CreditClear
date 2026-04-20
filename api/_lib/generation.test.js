import { describe, expect, it } from 'vitest'
import { hasPremiumAccess, normalizeGenerationRequest } from './generation.js'

describe('hasPremiumAccess', () => {
  const now = new Date('2026-04-01T00:00:00.000Z').getTime()

  it('allows active subscriptions', () => {
    expect(
      hasPremiumAccess(
        {
          status: 'active',
          trial_ends_at: '2026-03-01T00:00:00.000Z',
        },
        now,
      ),
    ).toBe(true)
  })

  it('allows only unexpired trials', () => {
    expect(
      hasPremiumAccess(
        {
          status: 'trialing',
          trial_ends_at: '2026-04-02T00:00:00.000Z',
        },
        now,
      ),
    ).toBe(true)

    expect(
      hasPremiumAccess(
        {
          status: 'trialing',
          trial_ends_at: '2026-03-30T00:00:00.000Z',
        },
        now,
      ),
    ).toBe(false)
  })
})

describe('normalizeGenerationRequest', () => {
  it('normalizes a valid generation payload', () => {
    const result = normalizeGenerationRequest({
      agencies: ['equifax', 'experian'],
      files: [{ id: '11111111-1111-4111-8111-111111111111' }],
      info: {
        address: '123 Main St',
        city: 'New York',
        email: 'USER@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        state: 'NY',
        zip: '10001',
      },
      issues: ['late', 'dup'],
    })

    expect(result.agencies).toEqual(['equifax', 'experian'])
    expect(result.issues).toEqual(['late', 'dup'])
    expect(result.fileIds).toEqual(['11111111-1111-4111-8111-111111111111'])
    expect(result.info.email).toBe('user@example.com')
    expect(result.letterType).toBe('bureau_initial')
  })

  it('accepts a valid letterType and rejects unknown ones', () => {
    const result = normalizeGenerationRequest({
      agencies: ['equifax'],
      files: [{ id: '11111111-1111-4111-8111-111111111111' }],
      info: {
        address: '1 Main',
        city: 'X',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        state: 'NY',
        zip: '10001',
      },
      issues: ['late'],
      letterType: 'mov',
    })
    expect(result.letterType).toBe('mov')

    expect(() =>
      normalizeGenerationRequest({
        agencies: ['equifax'],
        files: [{ id: '11111111-1111-4111-8111-111111111111' }],
        info: {
          address: '1 Main',
          city: 'X',
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          state: 'NY',
          zip: '10001',
        },
        issues: ['late'],
        letterType: 'pirate-letter',
      }),
    ).toThrow(/Letter type/)
  })

  it('rejects malformed or abusive payloads', () => {
    expect(() =>
      normalizeGenerationRequest({
        agencies: ['equifax'],
        files: Array.from({ length: 7 }).map((_, index) => ({
          id: `11111111-1111-4111-8111-11111111111${index}`,
        })),
        info: {
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
        },
        issues: ['late'],
      }),
    ).toThrow(/No more than/)

    expect(() =>
      normalizeGenerationRequest({
        agencies: ['equifax'],
        files: [],
        info: {
          email: 'not-an-email',
          firstName: 'Jane',
          lastName: 'Doe',
        },
        issues: ['late'],
      }),
    ).toThrow(/invalid/)
  })

  it('requires address fields and letter source when no uploads', () => {
    expect(() =>
      normalizeGenerationRequest({
        agencies: ['equifax'],
        files: [],
        info: {
          address: '1 Main',
          city: 'X',
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          state: 'NY',
          zip: '10001',
        },
        issues: ['late'],
      }),
    ).toThrow(/Upload at least one credit report PDF/)

    const withIssue = normalizeGenerationRequest({
      agencies: ['equifax'],
      files: [],
      info: {
        address: '1 Main',
        city: 'X',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        state: 'NY',
        zip: '10001',
      },
      issueDetails: {
        late: {
          creditorName: 'Test Bank',
        },
      },
      issues: ['late'],
    })
    expect(withIssue.issueDetails.late.creditorName).toBe('Test Bank')
  })
})
