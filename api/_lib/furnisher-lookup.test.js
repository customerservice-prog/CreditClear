import { describe, expect, it } from 'vitest'
import { normalizeFurnisherName, renderFurnisherAddressLines } from './furnisher-lookup.js'

describe('normalizeFurnisherName', () => {
  it('lowercases and strips non-alphanum', () => {
    expect(normalizeFurnisherName('Capital One')).toBe('capitalone')
    expect(normalizeFurnisherName('CAPITAL-ONE, N.A.')).toBe('capitalonena')
  })

  it('removes noise tokens like inc / llc / corp', () => {
    expect(normalizeFurnisherName('Diversified Consultants Inc')).toBe('diversifiedconsultants')
    expect(normalizeFurnisherName('Synchrony Bank, LLC')).toBe('synchronybank')
  })

  it('expands ampersands', () => {
    expect(normalizeFurnisherName('Smith & Jones')).toBe('smithandjones')
  })

  it('handles empty / non-string input', () => {
    expect(normalizeFurnisherName('')).toBe('')
    expect(normalizeFurnisherName(null)).toBe('')
    expect(normalizeFurnisherName(undefined)).toBe('')
    expect(normalizeFurnisherName(42)).toBe('')
  })

  it('matches our canonical alias spellings', () => {
    expect(normalizeFurnisherName('Bank of America')).toBe('bankofamerica')
    expect(normalizeFurnisherName('BoA')).toBe('boa')
    expect(normalizeFurnisherName('JPMorgan Chase')).toBe('jpmorganchase')
    expect(normalizeFurnisherName('Midland Credit Management')).toBe('midlandcreditmanagement')
    expect(normalizeFurnisherName('ERC')).toBe('erc')
  })
})

describe('renderFurnisherAddressLines', () => {
  it('returns placeholder lines when row is null', () => {
    const lines = renderFurnisherAddressLines(null)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('[Furnisher')
    expect(lines[2]).toContain('[City')
  })

  it('renders a real row as a 4-line address block with attn line', () => {
    const row = {
      canonicalName: 'Midland Credit Management',
      street: 'PO Box 939069',
      city: 'San Diego',
      state: 'CA',
      zip: '92193',
    }
    const lines = renderFurnisherAddressLines(row)
    expect(lines).toEqual([
      'Midland Credit Management',
      'Attn: Consumer Disputes',
      'PO Box 939069',
      'San Diego, CA 92193',
    ])
  })
})
