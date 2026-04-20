import { Link } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { ScoreSimulatorTool } from '../components/ScoreSimulatorTool'
import { SITE_URL } from '../lib/site'
import type { TradelineRow } from '../types'

interface ScoreSimulatorPageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

/**
 * Realistic-looking sample dataset so the public marketing page can run a
 * fully working simulator without requiring sign-in or any real data. Every
 * field maps to the TradelineRow shape so the simulator code path is the
 * same one we'll use for authenticated users in a follow-up PR.
 */
const SAMPLE_TRADELINES: TradelineRow[] = [
  {
    id: 'sample-1',
    report_id: 'demo',
    user_id: 'demo',
    creditor: 'Capital Bank Visa',
    account_last4: '4421',
    account_type: 'Revolving',
    account_status: 'Open',
    payment_status: 'Pays as agreed',
    worst_delinquency: null,
    balance_cents: 184_500,
    high_balance_cents: 250_000,
    credit_limit_cents: 500_000,
    past_due_cents: 0,
    monthly_payment_cents: 5_500,
    opened_on: '2019-08-01',
    reported_on: '2026-03-15',
    closed_on: null,
    payment_history: [],
    raw: {},
    created_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 'sample-2',
    report_id: 'demo',
    user_id: 'demo',
    creditor: 'Sallie Mae Student Loans',
    account_last4: '0093',
    account_type: 'Installment',
    account_status: 'Open',
    payment_status: '120 days past due',
    worst_delinquency: '120',
    balance_cents: 1_840_000,
    high_balance_cents: 2_500_000,
    credit_limit_cents: null,
    past_due_cents: 78_000,
    monthly_payment_cents: 26_000,
    opened_on: '2014-06-01',
    reported_on: '2026-03-12',
    closed_on: null,
    payment_history: [],
    raw: {},
    created_at: '2026-03-12T00:00:00Z',
  },
  {
    id: 'sample-3',
    report_id: 'demo',
    user_id: 'demo',
    creditor: 'Midland Credit Mgmt',
    account_last4: '2210',
    account_type: 'Collection',
    account_status: 'Open',
    payment_status: 'Collection account',
    worst_delinquency: 'Collection',
    balance_cents: 47_800,
    high_balance_cents: 47_800,
    credit_limit_cents: null,
    past_due_cents: 47_800,
    monthly_payment_cents: 0,
    opened_on: '2024-09-01',
    reported_on: '2026-03-18',
    closed_on: null,
    payment_history: [],
    raw: {},
    created_at: '2026-03-18T00:00:00Z',
  },
  {
    id: 'sample-4',
    report_id: 'demo',
    user_id: 'demo',
    creditor: 'Discover It Cash Back',
    account_last4: '8819',
    account_type: 'Revolving',
    account_status: 'Open',
    payment_status: 'Pays as agreed',
    worst_delinquency: null,
    balance_cents: 36_400,
    high_balance_cents: 180_000,
    credit_limit_cents: 700_000,
    past_due_cents: 0,
    monthly_payment_cents: 2_500,
    opened_on: '2020-11-01',
    reported_on: '2026-03-21',
    closed_on: null,
    payment_history: [],
    raw: {},
    created_at: '2026-03-21T00:00:00Z',
  },
  {
    id: 'sample-5',
    report_id: 'demo',
    user_id: 'demo',
    creditor: 'Toyota Financial Services',
    account_last4: '5031',
    account_type: 'Auto loan',
    account_status: 'Closed',
    payment_status: '30 days past due',
    worst_delinquency: '30',
    balance_cents: 0,
    high_balance_cents: 2_400_000,
    credit_limit_cents: null,
    past_due_cents: 0,
    monthly_payment_cents: 39_500,
    opened_on: '2020-02-01',
    reported_on: '2025-11-30',
    closed_on: '2025-11-30',
    payment_history: [],
    raw: {},
    created_at: '2025-11-30T00:00:00Z',
  },
]

export function ScoreSimulatorPage({ onHome, onSignIn, onStartTrial }: ScoreSimulatorPageProps) {
  return (
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <div className="hero" style={{ maxWidth: 880, paddingBottom: 24, textAlign: 'center' }}>
          <div className="hero-badge">
            <div className="pulse-dot"></div> Score impact estimator
          </div>
          <h1>
            See how a <em>successful dispute</em> could move your score
          </h1>
          <p className="hero-sub" style={{ margin: '0 auto', maxWidth: 720 }}>
            Transparent, rule-based estimator (not a real FICO or VantageScore) that shows the likely score-signal
            change when an item is removed: utilization shift, length-of-history recalculation, derogatory removal.
            Educational only — your real score depends on the bureaus, not on us.
          </p>
        </div>

        <div className="section" style={{ paddingTop: 0, maxWidth: 980, margin: '0 auto' }}>
          <ScoreSimulatorTool tradelines={SAMPLE_TRADELINES} datasetLabel="Sample report (try it now, no sign-in)" />
          <div className="disc" style={{ marginTop: 12, textAlign: 'center' }}>
            Want to run this on your own report? <Link to="/signup">Create an account</Link>, upload a credit-report
            PDF, and the simulator switches to your real tradelines.
          </div>
        </div>

        <div className="section" style={{ paddingTop: 8, maxWidth: 760, margin: '0 auto' }}>
          <h2 className="sec-title">
            Why we&apos;re labeling this <em>educational</em>
          </h2>
          <p className="disc">
            FICO and VantageScore models are proprietary. Anyone who promises to predict your exact future score is
            guessing. Our simulator publishes every formula it uses (see <code>src/lib/scoreSimulator.ts</code> in our
            open repo) so you can audit the math. We label it a <strong>signal estimator</strong>, not a score
            predictor.
          </p>
          <p className="disc">
            When a real FICO or VantageScore API becomes available to consumers without burning the dispute budget on
            score pulls, we&apos;ll add it as a paid add-on alongside the rule-based estimator.
          </p>
        </div>

        <footer aria-label="Site footer" className="footer">
          <div className="fbrand">
            Credit<span>Clear</span> AI
          </div>
          <div className="flinks">
            <a href={`${SITE_URL}/privacy`}>Privacy</a>
            <a href={`${SITE_URL}/terms`}>Terms</a>
            <a href={`${SITE_URL}/disclaimer`}>Disclaimer</a>
            <a href={`${SITE_URL}/disclosures`}>Disclosures</a>
          </div>
          <div className="fcopy">© 2026 CreditClear AI — Educational and document assistance only.</div>
        </footer>
      </MarketingMain>
    </div>
  )
}
