import { afterEach, describe, expect, it } from 'vitest'
import { AGGREGATOR_BUREAUS, isAggregatorEnabled, pullAggregatorReport } from './aggregator-stub.js'

const ORIGINAL_ENV = process.env.AGGREGATOR_ENABLED

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.AGGREGATOR_ENABLED
  } else {
    process.env.AGGREGATOR_ENABLED = ORIGINAL_ENV
  }
})

describe('isAggregatorEnabled', () => {
  it('defaults to false when env is unset', () => {
    delete process.env.AGGREGATOR_ENABLED
    expect(isAggregatorEnabled()).toBe(false)
  })

  it('accepts truthy variants', () => {
    for (const value of ['1', 'true', 'TRUE', 'yes', 'on']) {
      process.env.AGGREGATOR_ENABLED = value
      expect(isAggregatorEnabled()).toBe(true)
    }
  })

  it('rejects unrecognized values', () => {
    for (const value of ['0', 'false', 'no', 'off', '']) {
      process.env.AGGREGATOR_ENABLED = value
      expect(isAggregatorEnabled()).toBe(false)
    }
  })
})

describe('pullAggregatorReport', () => {
  it('throws on unsupported bureau', () => {
    expect(() => pullAggregatorReport({ bureau: 'fakebureau' })).toThrow()
  })

  it.each([...AGGREGATOR_BUREAUS])('returns a non-empty parsed report for %s', (bureau) => {
    const report = pullAggregatorReport({ bureau, userId: 'u_1' })
    expect(report.bureau).toBe(bureau)
    expect(report.tradelines.length).toBeGreaterThan(0)
    expect(report.inquiries.length).toBeGreaterThanOrEqual(0)
    expect(report.publicRecords.length).toBeGreaterThanOrEqual(0)
    expect(report.raw && typeof report.raw === 'object').toBe(true)
    expect(report.raw.source).toBe('aggregator-stub')
  })

  it('marks every child row as aggregator-stub source', () => {
    const report = pullAggregatorReport({ bureau: 'equifax', userId: 'u_1' })
    for (const t of report.tradelines) {
      expect(t.raw && t.raw.source).toBe('aggregator-stub')
      expect(t.raw.kind).toBe('tradeline')
    }
    for (const i of report.inquiries) {
      expect(i.raw && i.raw.source).toBe('aggregator-stub')
      expect(i.raw.kind).toBe('inquiry')
    }
  })

  it('returns tradelines with valid normalized cents fields', () => {
    const report = pullAggregatorReport({ bureau: 'experian', userId: 'u_2' })
    for (const t of report.tradelines) {
      expect(typeof t.creditor === 'string' && t.creditor.length > 0).toBe(true)
      expect(t.balanceCents === null || Number.isFinite(t.balanceCents)).toBe(true)
      expect(t.creditLimitCents === null || Number.isFinite(t.creditLimitCents)).toBe(true)
      expect(Array.isArray(t.payment_history)).toBe(true)
    }
  })
})
