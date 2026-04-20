import { describe, expect, it } from 'vitest'
import {
  detectBureau,
  dollarsToCents,
  extractAccountLast4,
  extractCreditorName,
  extractReportDate,
  extractSections,
  parseCreditReportText,
  parseDate,
  parseInquiries,
  parsePublicRecords,
  parseTradelines,
  splitTradelineBlocks,
} from './credit-report-parser.js'

const EQUIFAX_FIXTURE = `
Equifax Personal Credit Report
Generated for: JANE A DOE
Report Date: 2026-04-19

PERSONAL INFORMATION
Name: JANE A DOE
Address: 123 MAIN ST, NEW YORK, NY 10001

ACCOUNTS
CAPITAL ONE BANK USA NA
Account Number: ****1234
Account Type: Credit Card
Account Status: Open
Payment Status: Pays as agreed
Date Opened: 03/15/2018
Date Reported: 03/01/2026
Current Balance: $1,234.56
Credit Limit: $5,000
High Balance: $4,800
Past Due: $0
Monthly Payment: $35

SYNCHRONY BANK / WALMART
Account Number: ****5678
Account Type: Revolving
Account Status: Closed by credit grantor
Payment Status: Charge-off
Date Opened: 06/01/2015
Date Closed: 09/01/2022
Date Reported: 02/01/2026
Current Balance: $4,200.00
High Balance: $5,000
Past Due: $4,200

INQUIRIES
03/15/2026  CHASE BANK USA  Hard Inquiry
02/08/2026  AMERICAN EXPRESS  Hard Inquiry
01/12/2026  CAPITAL ONE  Soft Inquiry

PUBLIC RECORDS
Civil Judgment
Case Number: CV-2024-1234
Court: Suffolk County Civil Court
Date Filed: 04/15/2024
Judgment Amount: $2,500.00
Status: Open
`

const EXPERIAN_FIXTURE = `
Experian Credit Report
Date Issued: 04/19/2026

Accounts in good standing

CHASE FREEDOM
Account Number ****9876
Type Credit Card
Status Open / Pays as agreed
Date Opened 11/01/2019
Open Balance $0.00
Limit/High Balance $10,000
Date Reported 04/01/2026

Negative accounts

PORTFOLIO RECOVERY
Account Number ****4321
Type Collection
Status Collection
Date Opened 07/05/2021
Open Balance $1,875.42
Date Reported 03/28/2026

Credit Inquiries
04/02/2026 Wells Fargo Bank Hard Inquiry
03/15/2026 Apple Card / Goldman Sachs Hard Inquiry

Public records
None
`

const TRANSUNION_FIXTURE = `
TransUnion Credit Report
Generated on: April 19, 2026

ACCOUNTS

Creditor: BANK OF AMERICA
Account #: ****2468
Account Type: Mortgage
Account Status: Open
Payment Status: Current
Date Opened: 02/2017
Reported: 03/2026
Balance: $234,567.00
High Balance: $300,000
Monthly Payment: $1,950

Creditor: TOYOTA MOTOR CREDIT
Account #: ****1357
Account Type: Auto Loan
Account Status: Closed
Payment Status: Paid
Date Opened: 05/2019
Date Closed: 11/2023
Reported: 11/2023
Balance: $0
High Balance: $28,000

Inquiries
03/19/2026  USAA  hard inquiry
02/14/2026  T-MOBILE  hard inquiry

Public Records
Bankruptcy
Chapter 7
Court: US Bankruptcy Court Eastern District
Filed: 06/12/2018
Discharged: 09/30/2018
Status: Discharged
`

describe('detectBureau', () => {
  it('detects Equifax', () => {
    expect(detectBureau(EQUIFAX_FIXTURE)).toBe('equifax')
  })
  it('detects Experian', () => {
    expect(detectBureau(EXPERIAN_FIXTURE)).toBe('experian')
  })
  it('detects TransUnion', () => {
    expect(detectBureau(TRANSUNION_FIXTURE)).toBe('transunion')
  })
  it('returns null for unrelated text', () => {
    expect(detectBureau('lorem ipsum dolor sit amet')).toBeNull()
  })
})

describe('extractSections', () => {
  it('finds the major sections in an Equifax fixture', () => {
    const sections = extractSections(EQUIFAX_FIXTURE)
    expect(Object.keys(sections)).toEqual(expect.arrayContaining(['accounts', 'inquiries', 'publicRecords']))
    expect(sections.accounts).toContain('CAPITAL ONE BANK USA NA')
    expect(sections.inquiries).toContain('CHASE BANK USA')
    expect(sections.publicRecords).toContain('Civil Judgment')
  })
})

describe('parseCreditReportText - Equifax', () => {
  const parsed = parseCreditReportText(EQUIFAX_FIXTURE)

  it('returns a normalized report shape', () => {
    expect(parsed).not.toBeNull()
    expect(parsed.bureau).toBe('equifax')
    expect(parsed.reportDate).toBe('2026-04-19')
    expect(parsed.tradelines.length).toBe(2)
    expect(parsed.inquiries.length).toBe(3)
    expect(parsed.publicRecords.length).toBe(1)
    expect(parsed.raw.text.length).toBeGreaterThan(0)
  })

  it('parses each tradeline with money columns as integer cents', () => {
    const cap = parsed.tradelines.find((t) => /CAPITAL ONE/i.test(t.creditor || ''))
    expect(cap).toBeDefined()
    expect(cap.accountLast4).toBe('1234')
    expect(cap.balanceCents).toBe(123456)
    expect(cap.creditLimitCents).toBe(500000)
    expect(cap.highBalanceCents).toBe(480000)
    expect(cap.pastDueCents).toBe(0)
    expect(cap.openedOn).toBe('2018-03-15')
    expect(cap.reportedOn).toBe('2026-03-01')

    const sync = parsed.tradelines.find((t) => /SYNCHRONY/i.test(t.creditor || ''))
    expect(sync.accountLast4).toBe('5678')
    expect(sync.balanceCents).toBe(420000)
    expect(sync.closedOn).toBe('2022-09-01')
    expect(sync.paymentStatus?.toLowerCase()).toContain('charge')
  })

  it('parses inquiries with bureau-typed line', () => {
    const chase = parsed.inquiries.find((i) => /chase/i.test(i.inquirer || ''))
    expect(chase).toBeDefined()
    expect(chase.inquiryType).toBe('hard')
    expect(chase.inquiredOn).toBe('2026-03-15')

    const cap = parsed.inquiries.find((i) => /capital/i.test(i.inquirer || ''))
    expect(cap?.inquiryType).toBe('soft')
  })

  it('parses public records into typed rows', () => {
    const judgment = parsed.publicRecords[0]
    expect(judgment.recordType).toBe('judgment')
    expect(judgment.amountCents).toBe(250000)
    expect(judgment.filedOn).toBe('2024-04-15')
  })
})

/** Mimics Experian "printable report" PDFs where pdf-parse often omits the word "Experian" but keeps FICO 8 + summary labels. */
const EXPERIAN_PRINTABLE_NO_BRAND = `
Prepared for: SAMPLE USER
FICO® Score 8
480
Poor
Account summary
Open accounts 3
Self reported accounts 0
Accounts ever late 7
Overall credit usage
Credit card and credit line debt $750
PERSONAL INFORMATION
Name
`

describe('parseCreditReportText - Experian', () => {
  const parsed = parseCreditReportText(EXPERIAN_FIXTURE)

  it('detects bureau and at least one tradeline per section', () => {
    expect(parsed.bureau).toBe('experian')
    expect(parsed.tradelines.length).toBe(2)
    const chase = parsed.tradelines.find((t) => /CHASE/i.test(t.creditor || ''))
    expect(chase.accountLast4).toBe('9876')
    expect(chase.creditLimitCents).toBe(1000000)
    const port = parsed.tradelines.find((t) => /PORTFOLIO/i.test(t.creditor || ''))
    expect(port.balanceCents).toBe(187542)
  })

  it('parses inquiries and ignores empty public records', () => {
    expect(parsed.inquiries.length).toBe(2)
    expect(parsed.publicRecords.length).toBe(0)
  })
})

describe('detectBureau - Experian printable / browser PDF', () => {
  it('detects Experian when the brand word is missing but FICO 8 and summary rows are present', () => {
    expect(detectBureau(EXPERIAN_PRINTABLE_NO_BRAND)).toBe('experian')
    const parsed = parseCreditReportText(EXPERIAN_PRINTABLE_NO_BRAND)
    expect(parsed).not.toBeNull()
    expect(parsed?.bureau).toBe('experian')
  })

  it('detects Experian from usa.experian printable URL in extracted text', () => {
    const text =
      'https://usa.experian.com/mfe/credit/printable-report/experian/now\nAccount summary\nOpen accounts 2'
    expect(detectBureau(text)).toBe('experian')
    expect(parseCreditReportText(text)?.bureau).toBe('experian')
  })
})

describe('parseCreditReportText - TransUnion', () => {
  const parsed = parseCreditReportText(TRANSUNION_FIXTURE)

  it('handles MM/YYYY dates and a bankruptcy public record', () => {
    expect(parsed.bureau).toBe('transunion')
    expect(parsed.tradelines.length).toBe(2)
    const boa = parsed.tradelines.find((t) => /BANK OF AMERICA/i.test(t.creditor || ''))
    expect(boa.accountLast4).toBe('2468')
    expect(boa.openedOn).toBe('2017-02-01')
    expect(boa.reportedOn).toBe('2026-03-01')
    expect(boa.monthlyPaymentCents).toBe(195000)

    expect(parsed.publicRecords[0].recordType).toBe('bankruptcy')
    expect(parsed.publicRecords[0].filedOn).toBe('2018-06-12')
    expect(parsed.publicRecords[0].resolvedOn).toBe('2018-09-30')
  })
})

describe('helpers', () => {
  it('parseDate handles common formats', () => {
    expect(parseDate('2026-04-19')).toBe('2026-04-19')
    expect(parseDate('04/19/2026')).toBe('2026-04-19')
    expect(parseDate('4/9/26')).toBe('2026-04-09')
    expect(parseDate('04/2026')).toBe('2026-04-01')
    expect(parseDate('April 19, 2026')).toBe('2026-04-19')
    expect(parseDate('Apr 2026')).toBe('2026-04-01')
    expect(parseDate('2026')).toBe('2026-01-01')
    expect(parseDate('not a date')).toBeNull()
  })

  it('dollarsToCents normalizes currency strings', () => {
    expect(dollarsToCents('$1,234.56')).toBe(123456)
    expect(dollarsToCents('1234')).toBe(123400)
    expect(dollarsToCents('0')).toBe(0)
    expect(dollarsToCents(null)).toBeNull()
    expect(dollarsToCents('abc')).toBeNull()
  })

  it('extractAccountLast4 finds masked + unmasked numbers', () => {
    expect(extractAccountLast4('Account Number: ****1234')).toBe('1234')
    expect(extractAccountLast4('Acct # XXXX-5678')).toBe('5678')
    expect(extractAccountLast4('Account Number 5178051234567890')).toBe('7890')
  })

  it('extractCreditorName ignores label-only lines', () => {
    expect(extractCreditorName('CAPITAL ONE\nAccount Number: 1234')).toBe('CAPITAL ONE')
    expect(extractCreditorName('Account Number: 1234\nBalance: $0')).toBeNull()
  })

  it('splitTradelineBlocks groups by account-marker boundaries', () => {
    const blocks = splitTradelineBlocks(`CAPITAL ONE\nAccount Number: ****1\nBalance $1\n\nCHASE\nAccount Number: ****2\nBalance $2`)
    expect(blocks.length).toBe(2)
  })

  it('parseInquiries returns empty for blank text', () => {
    expect(parseInquiries('')).toEqual([])
  })

  it('parsePublicRecords returns empty for blank text', () => {
    expect(parsePublicRecords('')).toEqual([])
  })

  it('extractReportDate falls back to first ISO date', () => {
    expect(extractReportDate('Generated 2026-04-19')).toBe('2026-04-19')
  })
})

describe('robustness', () => {
  it('returns null for empty / non-string input', () => {
    expect(parseCreditReportText('')).toBeNull()
    expect(parseCreditReportText(null)).toBeNull()
    expect(parseCreditReportText(undefined)).toBeNull()
  })

  it('returns null when no bureau signature is present', () => {
    expect(parseCreditReportText('hello world this is not a credit report')).toBeNull()
  })

  it('honors a bureauHint override', () => {
    const parsed = parseCreditReportText(`hello\n\nACCOUNTS\nCAPITAL ONE\nAccount Number: ****1234\nBalance: $100`, {
      bureauHint: 'equifax',
    })
    expect(parsed?.bureau).toBe('equifax')
    expect(parsed?.tradelines.length).toBe(1)
  })

  it('caps tradeline output at the configured maximum', () => {
    const lots = Array.from({ length: 250 })
      .map((_, i) => `BANK${i}\nAccount Number: ****${String(i).padStart(4, '0').slice(-4)}\nBalance: $${i}`)
      .join('\n\n')
    const parsed = parseCreditReportText(`Equifax Report\nACCOUNTS\n${lots}`)
    expect(parsed.tradelines.length).toBeLessThanOrEqual(200)
  })
})
