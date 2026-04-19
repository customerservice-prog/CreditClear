import { Link } from 'react-router-dom'
import { Navbar } from '../components/Navbar'

interface LoginPageProps {
  authLoading: boolean
  error: string
  loginEmail: string
  loginPassword: string
  onBackHome: () => void
  onEmailChange: (value: string) => void
  onForgotPassword: () => void
  onGoogle: () => void
  onLogin: () => void
  onPasswordChange: (value: string) => void
  onSignIn: () => void
  onSignupRoute: () => void
  onStartTrial: () => void
  notice: string
}

export function LoginPage({
  authLoading,
  error,
  loginEmail,
  loginPassword,
  onBackHome,
  onEmailChange,
  onForgotPassword,
  onGoogle,
  onLogin,
  onPasswordChange,
  onSignIn,
  onSignupRoute,
  onStartTrial,
  notice,
}: LoginPageProps) {
  return (
    <div className="page active">
      <Navbar onHomeClick={onBackHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <div className="hero" style={{ maxWidth: 520 }}>
        <div className="hero-badge"><div className="pulse-dot"></div> Secure Sign In</div>
        <h1>
          Access Your <em>Workspace</em>
        </h1>
        <p className="hero-sub">Sign in to review saved disputes, uploads, and editable draft documents.</p>
        <div className="modal" style={{ margin: '0 auto', maxWidth: 440 }}>
          <div className="auth-err" style={{ display: error ? 'block' : 'none' }}>{error}</div>
          <div className="auth-msg" style={{ display: notice ? 'block' : 'none' }}>{notice}</div>
          <div className="ff">
            <label>Email Address</label>
            <input onChange={(event) => onEmailChange(event.target.value)} type="email" value={loginEmail} />
          </div>
          <div className="ff">
            <label>Password</label>
            <input onChange={(event) => onPasswordChange(event.target.value)} type="password" value={loginPassword} />
          </div>
          <button className="btn-auth" disabled={authLoading} onClick={onLogin} type="button">
            {authLoading ? 'Signing In...' : 'Sign In'}
          </button>
          <div className="auth-div"><span>or</span></div>
          <button className="social-btn" disabled={authLoading} onClick={onGoogle} type="button">
            Continue with Google
          </button>
          <div className="auth-switch">
            Forgot password? <button onClick={onForgotPassword} type="button">Send reset link</button>
          </div>
          <div className="auth-switch">
            <Link to="/reset-password">I already have a reset link</Link>
          </div>
          <div className="auth-switch">
            No account? <button onClick={onSignupRoute} type="button">Create one</button>
          </div>
        </div>
      </div>
    </div>
  )
}
