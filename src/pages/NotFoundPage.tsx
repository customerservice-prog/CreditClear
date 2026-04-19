import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'

interface NotFoundPageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

export function NotFoundPage({ onHome, onSignIn, onStartTrial }: NotFoundPageProps) {
  return (
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <div className="hero">
          <div className="hero-badge">
            <div className="pulse-dot"></div> Page Not Found
          </div>
          <h1>
            This page could not be <em>found</em>
          </h1>
          <p className="hero-sub">
            Return to the CreditClear home page to continue exploring the platform.
          </p>
          <button className="btn-xl" onClick={onHome} type="button">
            Return Home
          </button>
        </div>
      </MarketingMain>
    </div>
  )
}
