import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { CTA_TRIAL_LABEL, SITE_URL } from '../lib/site'
import { NotFoundPage } from './NotFoundPage'

const BUREAU_COPY: Record<string, { body: ReactNode; h1: ReactNode }> = {
  equifax: {
    h1: (
      <>
        How to Dispute <em>Equifax</em> Credit Report Errors
      </>
    ),
    body: (
      <>
        <p>
          Disputing <strong>Equifax</strong> tradelines starts with your official report: confirm account names,
          balances, payment history, and personal identifiers. When data is wrong, consumers often file a{' '}
          <strong>credit dispute</strong> describing the inaccuracy and requesting investigation under the{' '}
          <strong>FCRA</strong>. Your <strong>credit score</strong> may reflect changes only if reporting is actually
          corrected.
        </p>
        <p>
          CreditClear AI helps you structure <strong>dispute letter</strong> drafts and keep supporting notes aligned
          with the issues you select—whether the concern is <strong>collections</strong>, <strong>late payments</strong>
          , or mixed files. Review every paragraph before mailing or submitting online.
        </p>
        <p>
          Compare with our guides for <Link to="/dispute/experian">Experian</Link> and{' '}
          <Link to="/dispute/transunion">TransUnion</Link>—each bureau has its own portal and timelines.
        </p>
      </>
    ),
  },
  experian: {
    h1: (
      <>
        How to Dispute <em>Experian</em> Credit Report Errors
      </>
    ),
    body: (
      <>
        <p>
          <strong>Experian</strong> disputes should tie each line item to concrete facts: wrong balance, unfamiliar
          account, or payment status you can document. A clear <strong>credit report</strong> dispute reduces back‑and‑
          forth and keeps your <strong>credit dispute letter</strong> focused.
        </p>
        <p>
          Software like CreditClear is not <strong>credit repair</strong> by proxy—it accelerates drafting and
          organization while you verify accuracy. Always attach redacted evidence when it strengthens your claim.
        </p>
        <p>
          See also: <Link to="/dispute/equifax">Equifax</Link> and <Link to="/dispute/transunion">TransUnion</Link>{' '}
          guides.
        </p>
      </>
    ),
  },
  transunion: {
    h1: (
      <>
        How to Dispute <em>TransUnion</em> Credit Report Errors
      </>
    ),
    body: (
      <>
        <p>
          <strong>TransUnion</strong> reports may differ from the other bureaus. Pull all three before assuming an error
          is universal. Strong <strong>FCRA</strong>-oriented disputes explain what should change and why, without
          demanding outcomes the law does not guarantee.
        </p>
        <p>
          Use CreditClear to map categories—from <strong>hard inquiries</strong> to identity mismatches—and export
          review-ready drafts. Your <strong>credit score</strong> depends on many factors beyond a single dispute.
        </p>
        <p>
          Related: <Link to="/dispute/equifax">Equifax</Link>, <Link to="/dispute/experian">Experian</Link>,{' '}
          <Link to="/blog">Blog</Link>.
        </p>
      </>
    ),
  },
}

interface BureauDisputePageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

export function BureauDisputePage({ onHome, onSignIn, onStartTrial }: BureauDisputePageProps) {
  const { bureauId } = useParams()
  const key = bureauId?.toLowerCase() || ''
  const block = BUREAU_COPY[key]

  if (!block) {
    return <NotFoundPage onHome={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
  }

  return (
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <div className="hero" style={{ maxWidth: 720, paddingBottom: 32, textAlign: 'left' }}>
          <div className="hero-badge">
            <div className="pulse-dot"></div> Bureau guide
          </div>
          <h1>{block.h1}</h1>
          <div className="disc" style={{ fontSize: 16, lineHeight: 1.75, marginTop: 20 }}>
            {block.body}
          </div>
          <div style={{ marginTop: 28 }}>
            <button className="btn-xl" onClick={onStartTrial} type="button">
              {CTA_TRIAL_LABEL}
            </button>
          </div>
          <p style={{ marginTop: 24 }}>
            <Link to="/">Home</Link>
            {' · '}
            <Link to="/pricing">Pricing</Link>
          </p>
        </div>
        <footer aria-label="Site footer" className="footer">
          <div className="fbrand">
            Credit<span>Clear</span> AI
          </div>
          <div className="flinks">
            <a href={`${SITE_URL}/privacy`}>Privacy</a>
            <Link to="/contact">Contact</Link>
          </div>
        </footer>
      </MarketingMain>
    </div>
  )
}
