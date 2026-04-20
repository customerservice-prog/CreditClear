import { describe, expect, it } from 'vitest'
import { LETTER_TYPES, buildLetterText, letterSubject } from './letter-templates.js'

const baseInfo = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '(555) 123-4567',
  address: '123 Main St',
  city: 'New York',
  state: 'NY',
  zip: '10001',
  dob: '1990-04-12',
  ssn: '6789',
}

const baseDetail = {
  creditorName: 'Capital Bank',
  accountLast4: '1234',
  amountOrBalance: '$425',
  reportedDate: 'March 2026',
  disputeReason: 'Account was paid in full and should not show as past due.',
}

const baseArgs = {
  agency: 'equifax',
  info: baseInfo,
  issueMeta: { label: 'Late Payments', icon: '⏰' },
  issueDetail: baseDetail,
  forBureau: [{ file_name: 'equifax-report.pdf' }],
}

describe('buildLetterText', () => {
  for (const type of LETTER_TYPES) {
    it(`produces a non-empty body for type=${type}`, () => {
      const text = buildLetterText({ ...baseArgs, type })
      expect(text.length).toBeGreaterThan(200)
      expect(text).toMatch(/Jane Doe/)
      expect(text).toMatch(/Capital Bank/)
    })
  }

  it('bureau_initial cites FCRA §611', () => {
    const text = buildLetterText({ ...baseArgs, type: 'bureau_initial' })
    expect(text).toMatch(/1681i/)
    expect(text).toMatch(/Equifax/i)
  })

  it('mov cites §611(a)(7) and asks for verification method', () => {
    const text = buildLetterText({ ...baseArgs, type: 'mov' })
    expect(text).toMatch(/1681i\(a\)\(7\)|611\(a\)\(7\)/)
    expect(text).toMatch(/method|procedure/i)
  })

  it('furnisher cites §1681s-2(b)', () => {
    const text = buildLetterText({ ...baseArgs, type: 'furnisher' })
    expect(text).toMatch(/1681s-2\(b\)/)
    expect(text).toMatch(/\[Furnisher/)
  })

  it('validation cites §1692g', () => {
    const text = buildLetterText({ ...baseArgs, type: 'validation' })
    expect(text).toMatch(/1692g/)
  })

  it('goodwill avoids dispute language', () => {
    const text = buildLetterText({ ...baseArgs, type: 'goodwill' })
    expect(text).toMatch(/goodwill/i)
    expect(text).not.toMatch(/I dispute/i)
  })

  it('cfpb produces a complaint draft, not a letter', () => {
    const text = buildLetterText({ ...baseArgs, type: 'cfpb' })
    expect(text).toMatch(/CFPB COMPLAINT/)
    expect(text).toMatch(/consumerfinance\.gov/)
  })

  it('falls back to bureau_initial for unknown types', () => {
    const text = buildLetterText({ ...baseArgs, type: 'pirate-letter' })
    expect(text).toMatch(/1681i/)
  })

  it('handles missing issueDetail gracefully', () => {
    const text = buildLetterText({ ...baseArgs, type: 'bureau_initial', issueDetail: null })
    expect(text).toMatch(/Jane Doe/)
    expect(text).not.toMatch(/Capital Bank/)
  })
})

describe('letterSubject', () => {
  it('formats subjects with bureau and template label', () => {
    expect(
      letterSubject({ type: 'mov', agency: 'experian', issueMeta: { label: 'Late Payments' } }),
    ).toMatch(/Experian/)
    expect(
      letterSubject({ type: 'cfpb', agency: 'transunion', issueMeta: { label: 'Collections' } }),
    ).toMatch(/CFPB/)
  })
})
