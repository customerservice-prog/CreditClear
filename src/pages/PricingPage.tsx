import { Link } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { PricingCard } from '../components/PricingCard'
import { trackEvent } from '../lib/analytics'
import { CTA_TRIAL_LABEL, SITE_URL } from '../lib/site'

interface PricingPageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

export function PricingPage({ onHome, onSignIn, onStartTrial }: PricingPageProps) {
  return (
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <div className="hero" style={{ maxWidth: 900, paddingBottom: 24, textAlign: 'center' }}>
          <div className="hero-badge">
            <div className="pulse-dot"></div> Pricing
          </div>
          <h1>
            AI <em>Credit Dispute Letter</em> Tool — Simple Monthly Pricing
          </h1>
          <p className="hero-sub" style={{ margin: '0 auto', maxWidth: 720 }}>
            Organize <strong>credit report</strong> errors, draft <strong>FCRA-oriented dispute letters</strong> for{' '}
            <strong>Equifax</strong>, <strong>Experian</strong>, and <strong>TransUnion</strong>, and keep everything in
            one workflow. This is <strong>not credit repair</strong> representation—it's review-ready software for people
            who want to handle their own <strong>credit disputes</strong> carefully.
          </p>
        </div>

        <div className="section" style={{ paddingTop: 0 }}>
          <p className="disc" style={{ maxWidth: 720, margin: '0 auto 28px', textAlign: 'center' }}>
            Whether you're searching for <strong>credit repair software pricing</strong>, a <strong>credit dispute</strong>{' '}
            assistant, or a structured way to improve your <strong>credit score</strong> through accurate reporting, start
            with a <strong>free 7-day trial</strong>—no card required at signup.
          </p>
          <div className="price-wrap">
            <PricingCard
              buttonLabel={CTA_TRIAL_LABEL}
              note="After trial, CreditClear Pro is $49/month. Cancel anytime. Draft assistance only—not legal advice."
              onClick={() => {
                trackEvent('cta_click', { location: 'pricing_page', target: 'signup' })
                onStartTrial()
              }}
            />
          </div>
        </div>

        <div className="section" style={{ paddingTop: 0, textAlign: 'center' }}>
          <p className="disc" style={{ maxWidth: 640, margin: '0 auto 20px' }}>
            Read the <Link to="/blog">blog</Link> for guides on <strong>dispute letters</strong> and bureau timelines, or
            compare bureau-specific tips: <Link to="/dispute/equifax">Equifax</Link>,{' '}
            <Link to="/dispute/experian">Experian</Link>, <Link to="/dispute/transunion">TransUnion</Link>.{' '}
            <Link to="/">← Back to home</Link>
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
            <Link to="/contact">Contact</Link>
          </div>
          <div className="fcopy">© 2026 CreditClear AI — Educational and document assistance only.</div>
        </footer>
      </MarketingMain>
    </div>
  )
}
