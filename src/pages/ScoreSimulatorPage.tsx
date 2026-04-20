import { ComingSoon } from '../components/ComingSoon'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { FEATURE_FLAGS } from '../lib/featureFlags'
import { SITE_URL } from '../lib/site'

interface ScoreSimulatorPageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

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
            We&apos;re building a transparent, rule-based estimator (not a real FICO/VantageScore) that shows the likely
            score signal change when an item is removed: utilization shift, account-age recalculation, derogatory removal
            heuristics. Educational only — your real score depends on the bureaus, not on us.
          </p>
        </div>

        <div className="section" style={{ paddingTop: 0, maxWidth: 980, margin: '0 auto' }}>
          <ComingSoon feature={FEATURE_FLAGS.score_simulator} source="score_simulator_page" />
        </div>

        <div className="section" style={{ paddingTop: 8, maxWidth: 760, margin: '0 auto' }}>
          <h2 className="sec-title">
            Why we&apos;re labeling this <em>educational</em>
          </h2>
          <p className="disc">
            FICO and VantageScore models are proprietary. Anyone who promises to predict your exact future score is
            guessing. Our simulator will publish every formula it uses so you can see the math — and we&apos;ll clearly
            label it as a <strong>signal estimator</strong>, not a score predictor.
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
