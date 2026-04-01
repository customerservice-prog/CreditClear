import type { AuthTab } from '../types'

interface AuthModalProps {
  authError: string
  authNotice: string
  authLoading: boolean
  authTab: AuthTab
  isOpen: boolean
  loginEmail: string
  loginPassword: string
  signupEmail: string
  signupAcceptedTerms: boolean
  signupName: string
  signupPassword: string
  onClose: () => void
  onLogin: () => void
  onLoginEmailChange: (value: string) => void
  onLoginPasswordChange: (value: string) => void
  onOverlayClick: () => void
  onForgotPassword: () => void
  onSignup: () => void
  onSignupAcceptedTermsChange: (value: boolean) => void
  onSignupEmailChange: (value: string) => void
  onSignupNameChange: (value: string) => void
  onSignupPasswordChange: (value: string) => void
  onSocial: () => void
  onTabChange: (tab: AuthTab) => void
}

export function AuthModal({
  authError,
  authNotice,
  authLoading,
  authTab,
  isOpen,
  loginEmail,
  loginPassword,
  signupEmail,
  signupAcceptedTerms,
  signupName,
  signupPassword,
  onClose,
  onLogin,
  onLoginEmailChange,
  onLoginPasswordChange,
  onOverlayClick,
  onForgotPassword,
  onSignup,
  onSignupAcceptedTermsChange,
  onSignupEmailChange,
  onSignupNameChange,
  onSignupPasswordChange,
  onSocial,
  onTabChange,
}: AuthModalProps) {
  return (
    <div
      aria-hidden={!isOpen}
      className={`modal-overlay${isOpen ? ' active' : ''}`}
      id="auth-modal"
      onClick={onOverlayClick}
    >
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} type="button">
          ✕
        </button>
        <div className="modal-logo">
          <div className="logo-mark">CC</div>
          <div className="logo-wordmark">
            Credit<span>Clear</span> AI
          </div>
        </div>
        <div className="auth-tabs">
          <button
            className={`auth-tab${authTab === 'login' ? ' active' : ''}`}
            id="tab-login"
            onClick={() => onTabChange('login')}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`auth-tab${authTab === 'signup' ? ' active' : ''}`}
            id="tab-signup"
            onClick={() => onTabChange('signup')}
            type="button"
          >
            Create Account
          </button>
        </div>
        <div className="auth-err" style={{ display: authError ? 'block' : 'none' }}>
          {authError}
        </div>
        <div className="auth-msg" style={{ display: authNotice ? 'block' : 'none' }}>
          {authNotice}
        </div>

        {authTab === 'login' ? (
          <div id="form-login">
            <div className="ff">
              <label>Email Address</label>
              <input
                id="l-email"
                onChange={(event) => onLoginEmailChange(event.target.value)}
                placeholder="john@email.com"
                type="email"
                value={loginEmail}
              />
            </div>
            <div className="ff">
              <label>Password</label>
              <input
                id="l-pass"
                onChange={(event) => onLoginPasswordChange(event.target.value)}
                placeholder="••••••••"
                type="password"
                value={loginPassword}
              />
            </div>
            <button className="btn-auth" disabled={authLoading} onClick={onLogin} type="button">
              {authLoading ? 'Signing In...' : 'Sign In to CreditClear'}
            </button>
            <div className="auth-div">
              <span>or</span>
            </div>
            <button className="social-btn" disabled={authLoading} onClick={onSocial} type="button">
              <svg height="16" viewBox="0 0 24 24" width="16">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            <div className="auth-switch">
              Forgot password? <button onClick={onForgotPassword} type="button">Send reset link</button>
            </div>
            <div className="auth-switch">
              No account? <button onClick={() => onTabChange('signup')} type="button">Create one free</button>
            </div>
          </div>
        ) : (
          <div id="form-signup">
            <div className="price-pill">
              <div>
                <div className="pp-l">CreditClear AI Pro</div>
                <div className="pp-sub">7-day free trial · then billed monthly</div>
              </div>
              <div>
                <div className="pp-p">
                  $49<span style={{ color: 'var(--txt2)', fontSize: 14 }}>/mo</span>
                </div>
              </div>
            </div>
            <div className="ff">
              <label>Full Name</label>
              <input
                id="s-name"
                onChange={(event) => onSignupNameChange(event.target.value)}
                placeholder="John Smith"
                type="text"
                value={signupName}
              />
            </div>
            <div className="ff">
              <label>Email Address</label>
              <input
                id="s-email"
                onChange={(event) => onSignupEmailChange(event.target.value)}
                placeholder="john@email.com"
                type="email"
                value={signupEmail}
              />
            </div>
            <div className="ff">
              <label>Password</label>
              <input
                id="s-pass"
                onChange={(event) => onSignupPasswordChange(event.target.value)}
                placeholder="Create a password (8+ chars)"
                type="password"
                value={signupPassword}
              />
            </div>
            <label className="check-row">
              <input
                checked={signupAcceptedTerms}
                onChange={(event) => onSignupAcceptedTermsChange(event.target.checked)}
                type="checkbox"
              />
              <span>
                I agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
              </span>
            </label>
            <button className="btn-auth" disabled={authLoading} onClick={onSignup} type="button">
              {authLoading ? 'Creating Account...' : 'Start My Free 7-Day Trial →'}
            </button>
            <div
              style={{
                color: 'var(--txt3)',
                fontSize: 11,
                lineHeight: 1.6,
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              No credit card required · Cancel anytime
            </div>
            <div className="auth-switch">
              Already have an account? <button onClick={() => onTabChange('login')} type="button">Sign in</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
