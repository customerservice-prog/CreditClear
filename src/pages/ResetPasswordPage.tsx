import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { captureClientError } from '../lib/monitoring'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import { useAuthContext } from '../context/useAuthContext'

interface ResetPasswordPageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

export function ResetPasswordPage({ onHome, onSignIn, onStartTrial }: ResetPasswordPageProps) {
  const { authUser, loading: sessionLoading } = useAuthContext()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!isSupabaseConfigured) {
      setError('This app is not configured for authentication yet.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    try {
      setSubmitting(true)
      const supabase = requireSupabase()
      const result = await supabase.auth.updateUser({ password })
      if (result.error) {
        throw result.error
      }
      setNotice(
        'Your password was updated. If you are still signed in from this reset flow, you can continue to your dashboard.',
      )
      setPassword('')
      setConfirm('')
    } catch (err) {
      captureClientError(err, { flow: 'password_reset_complete' })
      setError(err instanceof Error ? err.message : 'Unable to update password.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="page active">
        <SkipToContent />
        <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
        <MarketingMain>
          <div className="hero" style={{ maxWidth: 520 }}>
            <div className="hero-badge">
              <div className="pulse-dot"></div> Reset password
            </div>
            <h1>
              Setup <em>required</em>
            </h1>
            <p className="hero-sub">Authentication is not configured in this environment.</p>
            <div className="btn-row" style={{ justifyContent: 'center' }}>
              <Link className="btn btn-ghost" to="/login">
                Back to sign in
              </Link>
            </div>
          </div>
        </MarketingMain>
      </div>
    )
  }

  if (sessionLoading) {
    return (
      <div className="page active">
        <SkipToContent />
        <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
        <MarketingMain>
          <div aria-busy="true" aria-live="polite" className="hero" role="status" style={{ maxWidth: 520 }}>
            <div className="hero-badge">
              <div className="pulse-dot"></div> Reset password
            </div>
            <h1>
              Verifying your <em>link</em>
            </h1>
            <p className="hero-sub">Hang tight while we validate your reset session.</p>
          </div>
        </MarketingMain>
      </div>
    )
  }

  if (!authUser) {
    return (
      <div className="page active">
        <SkipToContent />
        <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
        <MarketingMain>
          <div className="hero" style={{ maxWidth: 520 }}>
            <div className="hero-badge">
              <div className="pulse-dot"></div> Reset password
            </div>
            <h1>
              Link needed to <em>continue</em>
            </h1>
            <p className="hero-sub">
              Open the password reset message we sent you and tap the link again, or request a new one
              from the sign-in page.
            </p>
            <div className="btn-row" style={{ justifyContent: 'center', gap: 12 }}>
              <Link className="btn btn-ghost" to="/login">
                Go to sign in
              </Link>
            </div>
          </div>
        </MarketingMain>
      </div>
    )
  }

  return (
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <div className="hero" style={{ maxWidth: 520 }}>
          <div className="hero-badge">
            <div className="pulse-dot"></div> Choose a new password
          </div>
          <h1>
            Secure your <em>account</em>
          </h1>
          <p className="hero-sub">Enter a new password for {authUser.email ?? 'your account'}.</p>
          <div className="modal" style={{ margin: '0 auto', maxWidth: 440 }}>
            <div className="auth-err" style={{ display: error ? 'block' : 'none' }}>
              {error}
            </div>
            <div className="auth-msg" style={{ display: notice ? 'block' : 'none' }}>
              {notice}
            </div>
            <form onSubmit={(event) => void handleSubmit(event)}>
              <div className="ff">
                <label htmlFor="reset-pass">New password</label>
                <input
                  autoComplete="new-password"
                  id="reset-pass"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </div>
              <div className="ff">
                <label htmlFor="reset-confirm">Confirm password</label>
                <input
                  autoComplete="new-password"
                  id="reset-confirm"
                  onChange={(event) => setConfirm(event.target.value)}
                  type="password"
                  value={confirm}
                />
              </div>
              <button className="btn-auth" disabled={submitting} type="submit">
                {submitting ? 'Saving...' : 'Update password'}
              </button>
              <div className="auth-switch" style={{ marginTop: 16, textAlign: 'center' }}>
                <Link style={{ marginRight: 16 }} to="/dashboard">
                  Open dashboard
                </Link>
                <Link to="/login">Sign in</Link>
              </div>
            </form>
          </div>
        </div>
      </MarketingMain>
    </div>
  )
}
