import { Link } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { CTA_TRIAL_LABEL } from '../lib/site'

interface SignupPageProps {
  acceptedTerms: boolean
  authLoading: boolean
  authLoadingSlowHint?: boolean
  error: string
  notice: string
  onAcceptedTermsChange: (value: boolean) => void
  onBackHome: () => void
  onEmailChange: (value: string) => void
  onGoogle: () => void
  onLoginRoute: () => void
  onNameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSignIn: () => void
  onSignup: () => void
  onStartTrial: () => void
  signupEmail: string
  signupName: string
  signupPassword: string
}

export function SignupPage({
  acceptedTerms,
  authLoading,
  authLoadingSlowHint = false,
  error,
  notice,
  onAcceptedTermsChange,
  onBackHome,
  onEmailChange,
  onGoogle,
  onLoginRoute,
  onNameChange,
  onPasswordChange,
  onSignIn,
  onSignup,
  onStartTrial,
  signupEmail,
  signupName,
  signupPassword,
}: SignupPageProps) {
  const errText = error.trim()
  const noticeText = notice.trim()

  return (
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onBackHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <div className="hero" style={{ maxWidth: 520 }}>
          <div className="hero-badge">
            <div className="pulse-dot"></div> {CTA_TRIAL_LABEL}
          </div>
          <h1>
            Build Your <em>Credit Workspace</em>
          </h1>
          <p className="hero-sub">
            Create an account to organize issues, upload report documents, and generate review-ready draft
            disputes.
          </p>
          <div className="modal" style={{ margin: '0 auto', maxWidth: 440 }}>
            <div className="auth-err" style={{ display: errText ? 'block' : 'none' }}>
              {errText}
            </div>
            <div className="auth-msg" style={{ display: noticeText ? 'block' : 'none' }}>
              {noticeText}
            </div>
            <div className="ff">
              <label htmlFor="signup-name">Full Name</label>
              <input
                autoComplete="name"
                id="signup-name"
                onChange={(event) => onNameChange(event.target.value)}
                type="text"
                value={signupName}
              />
            </div>
            <div className="ff">
              <label htmlFor="signup-email">Email Address</label>
              <input
                autoComplete="email"
                id="signup-email"
                onChange={(event) => onEmailChange(event.target.value)}
                type="email"
                value={signupEmail}
              />
            </div>
            <div className="ff">
              <label htmlFor="signup-password">Password</label>
              <input
                autoComplete="new-password"
                id="signup-password"
                onChange={(event) => onPasswordChange(event.target.value)}
                type="password"
                value={signupPassword}
              />
            </div>
            <label className="check-row">
              <input
                checked={acceptedTerms}
                onChange={(event) => onAcceptedTermsChange(event.target.checked)}
                type="checkbox"
              />
              <span>
                I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
              </span>
            </label>
            <button className="btn-auth" disabled={authLoading} onClick={onSignup} type="button">
              {authLoading
                ? authLoadingSlowHint
                  ? 'Connecting to server...'
                  : 'Creating Account...'
                : 'Create Account'}
            </button>
            <div className="auth-div">
              <span>or</span>
            </div>
            <button className="social-btn" disabled={authLoading} onClick={onGoogle} type="button">
              Continue with Google
            </button>
            <div className="auth-switch">
              Already have an account?{' '}
              <button onClick={onLoginRoute} type="button">
                Sign in
              </button>
            </div>
          </div>
        </div>
      </MarketingMain>
    </div>
  )
}
