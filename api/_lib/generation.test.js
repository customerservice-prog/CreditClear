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

const bureauInfo = {
  address: '123 Main St',
  city: 'New York',
  email: 'USER@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  state: 'NY',
  zip: '10001',
}

/** Bureau-facing letters require at least one creditor per selected issue. */
const tradelinesForIssues = (issues) =>
  Object.fromEntries(issues.map((id) => [id, { creditorName: 'Example Creditor' }]))

describe('normalizeGenerationRequest', () => {
  it('normalizes a valid generation payload', () => {
    const result = normalizeGenerationRequest({
      agencies: ['equifax', 'experian'],
      files: [{ id: '11111111-1111-4111-8111-111111111111' }],
      info: bureauInfo,
      issueDetails: tradelinesForIssues(['late', 'dup']),
      issues: ['late', 'dup'],
    })

    expect(result.agencies).toEqual(['equifax', 'experian'])
    expect(result.issues).toEqual(['late', 'dup'])
    expect(result.fileIds).toEqual(['11111111-1111-4111-8111-111111111111'])
    expect(result.info.email).toBe('user@example.com')
    expect(result.info.includeDobInLetters).toBe(false)
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
      issueDetails: tradelinesForIssues(['late']),
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
        issueDetails: tradelinesForIssues(['late']),
        issues: ['late'],
        letterType: 'pirate-letter',
      }),
    ).toThrow(/Letter type/)
  })

  it('rejects bureau letters when any issue lacks creditor/account details', () => {
    expect(() =>
      normalizeGenerationRequest({
        agencies: ['equifax'],
        files: [{ id: '11111111-1111-4111-8111-111111111111' }],
        info: bureauInfo,
        issueDetails: { late: { creditorName: 'A' } },
        issues: ['late', 'dup'],
      }),
    ).toThrow(/Each selected category needs at least one creditor/)
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
          address: '1 Main',
          city: 'X',
          email: 'not-an-email',
          firstName: 'Jane',
          lastName: 'Doe',
          state: 'NY',
          zip: '10001',
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
    ).toThrow(/Upload at least one credit report file/)

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
      letterType: 'furnisher',
    })
    expect(withIssue.issueDetails.late.creditorName).toBe('Test Bank')
  })
})
