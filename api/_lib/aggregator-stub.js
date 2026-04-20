/**
 * Stub bureau-aggregator client. Returns deterministic, realistic-looking
 * ParsedReport payloads for each bureau without ever calling a real API or
 * spending money. Drop in a real client (SmartCredit, Array, CRS, MeasureOne,
 * etc.) by exporting the same `pullAggregatorReport({ bureau, userId })` shape;
 * the rest of the pipeline (persistParsedReport in credit-report-store.js)
 * does not need to change.
 *
 * The output exactly matches the `ParsedReport` typedef in
 * credit-report-parser.js so persistParsedReport accepts it directly.
 */

/** @typedef {import('./credit-report-parser.js').ParsedReport} ParsedReport */

const SUPPORTED_BUREAUS = /** @type {const} */ (['equifax', 'experian', 'transunion'])

/**
 * Returns true if the aggregator is enabled in this environment. Operators flip
 * `AGGREGATOR_ENABLED=true` once a real partner contract is in place. Until
 * then we still expose a 503 with code `aggregator_disabled`.
 */
export function isAggregatorEnabled() {
  const raw = (process.env.AGGREGATOR_ENABLED || '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

/** Deterministic seed by bureau so every pull returns the same demo payload. */
const FIXTURES = {
  equifax: {
    reportDate: '2026-04-01',
    tradelines: [
      {
        creditor: 'Capital Bank Visa',
        accountLast4: '4421',
        accountType: 'Revolving',
        accountStatus: 'Open',
        paymentStatus: 'Pays as agreed',
        worstDelinquency: null,
        balanceCents: 184_500,
        highBalanceCents: 250_000,
        creditLimitCents: 500_000,
        pastDueCents: 0,
        monthlyPaymentCents: 5_500,
        openedOn: '2019-08-01',
        reportedOn: '2026-03-15',
        closedOn: null,
      },
      {
        creditor: 'Sallie Mae Student Loans',
        accountLast4: '0093',
        accountType: 'Installment',
        accountStatus: 'Open',
        paymentStatus: '120 days past due',
        worstDelinquency: '120',
        balanceCents: 1_840_000,
        highBalanceCents: 2_500_000,
        creditLimitCents: null,
        pastDueCents: 78_000,
        monthlyPaymentCents: 26_000,
        openedOn: '2014-06-01',
        reportedOn: '2026-03-12',
        closedOn: null,
      },
    ],
    inquiries: [
      { inquirer: 'Best Buy / Citi', inquiryType: 'hard', inquiredOn: '2026-02-04' },
      { inquirer: 'Verizon Wireless', inquiryType: 'soft', inquiredOn: '2026-01-22' },
    ],
    publicRecords: [],
  },
  experian: {
    reportDate: '2026-04-02',
    tradelines: [
      {
        creditor: 'Chase Freedom Unlimited',
        accountLast4: '7702',
        accountType: 'Revolving',
        accountStatus: 'Open',
        paymentStatus: 'Pays as agreed',
        worstDelinquency: null,
        balanceCents: 92_300,
        highBalanceCents: 230_000,
        creditLimitCents: 600_000,
        pastDueCents: 0,
        monthlyPaymentCents: 3_500,
        openedOn: '2017-04-01',
        reportedOn: '2026-03-20',
        closedOn: null,
      },
      {
        creditor: 'Midland Credit Mgmt',
        accountLast4: '2210',
        accountType: 'Collection',
        accountStatus: 'Open',
        paymentStatus: 'Collection account',
        worstDelinquency: 'Collection',
        balanceCents: 47_800,
        highBalanceCents: 47_800,
        creditLimitCents: null,
        pastDueCents: 47_800,
        monthlyPaymentCents: 0,
        openedOn: '2024-09-01',
        reportedOn: '2026-03-18',
        closedOn: null,
      },
    ],
    inquiries: [
      { inquirer: 'Apple Card / Goldman Sachs', inquiryType: 'hard', inquiredOn: '2026-03-01' },
    ],
    publicRecords: [],
  },
  transunion: {
    reportDate: '2026-04-03',
    tradelines: [
      {
        creditor: 'Discover It Cash Back',
        accountLast4: '8819',
        accountType: 'Revolving',
        accountStatus: 'Open',
        paymentStatus: 'Pays as agreed',
        worstDelinquency: null,
        balanceCents: 36_400,
        highBalanceCents: 180_000,
        creditLimitCents: 700_000,
        pastDueCents: 0,
        monthlyPaymentCents: 2_500,
        openedOn: '2020-11-01',
        reportedOn: '2026-03-21',
        closedOn: null,
      },
      {
        creditor: 'Toyota Financial Services',
        accountLast4: '5031',
        accountType: 'Auto loan',
        accountStatus: 'Closed',
        paymentStatus: '30 days past due',
        worstDelinquency: '30',
        balanceCents: 0,
        highBalanceCents: 2_400_000,
        creditLimitCents: null,
        pastDueCents: 0,
        monthlyPaymentCents: 39_500,
        openedOn: '2020-02-01',
        reportedOn: '2025-11-30',
        closedOn: '2025-11-30',
      },
    ],
    inquiries: [
      { inquirer: 'Synchrony / Amazon', inquiryType: 'hard', inquiredOn: '2026-02-19' },
    ],
    publicRecords: [],
  },
}

/**
 * Builds a `ParsedReport` for the requested bureau. Throws if the bureau is
 * unknown. Each tradeline / inquiry / record gets `payment_history: []` and a
 * `raw` blob marking the row as aggregator-stub-sourced so downstream code
 * (and the user) can tell it apart from a real bureau pull.
 *
 * @param {object} args
 * @param {'equifax'|'experian'|'transunion'} args.bureau
 * @param {string} [args.userId]  Used only for the aggregator-event metadata.
 * @returns {ParsedReport}
 */
export function pullAggregatorReport({ bureau, userId }) {
  if (!SUPPORTED_BUREAUS.includes(bureau)) {
    throw new Error(`Unsupported bureau: ${bureau}`)
  }
  const fixture = FIXTURES[bureau]
  const aggregatorMeta = { source: 'aggregator-stub', userId: userId || null }

  const tradelines = fixture.tradelines.map((t) => ({
    ...t,
    payment_history: [],
    raw: { ...aggregatorMeta, kind: 'tradeline' },
  }))
  const inquiries = fixture.inquiries.map((i) => ({
    ...i,
    raw: { ...aggregatorMeta, kind: 'inquiry' },
  }))
  const publicRecords = fixture.publicRecords.map((p) => ({
    ...p,
    raw: { ...aggregatorMeta, kind: 'public_record' },
  }))

  return {
    bureau,
    reportDate: fixture.reportDate,
    tradelines,
    inquiries,
    publicRecords,
    raw: {
      source: 'aggregator-stub',
      pulled_at: new Date().toISOString(),
      counts: {
        tradelines: tradelines.length,
        inquiries: inquiries.length,
        publicRecords: publicRecords.length,
      },
    },
  }
}

export const AGGREGATOR_BUREAUS = SUPPORTED_BUREAUS
