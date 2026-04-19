import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthContext } from '../context/useAuthContext'
import type { AppTab } from '../types'
import { CTA_TRIAL_LABEL } from '../lib/site'

interface NavbarProps {
  appTab?: AppTab
  isApp?: boolean
  onAppTabChange?: (tab: AppTab) => void
  onHomeClick?: () => void
  onOpenAuth?: (tab: 'login' | 'signup') => void
  onSignIn?: () => void
  onStartTrial?: () => void
  onSignOut?: () => void
  statusLabel?: string
  userDisplayName?: string
}

export function Navbar({
  appTab = 'generator',
  isApp,
  onAppTabChange,
  onHomeClick,
  onOpenAuth,
  onSignIn,
  onStartTrial,
  onSignOut,
  statusLabel,
  userDisplayName,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { authUser } = useAuthContext()

  if (isApp) {
    return (
      <nav aria-label="Workspace" className="app-nav">
        <button className="app-nav-logo" onClick={onHomeClick} type="button">
          <div className="logo-mark">CC</div>
          <div className="logo-wordmark">
            Credit<span>Clear</span> AI
          </div>
        </button>
        <div className="app-nav-r">
          {onAppTabChange ? (
            <div className="app-tabs">
              <button
                className={`app-tab-btn${appTab === 'generator' ? ' active' : ''}`}
                onClick={() => onAppTabChange('generator')}
                type="button"
              >
                Dispute Engine
              </button>
              <button
                className={`app-tab-btn${appTab === 'disputes' ? ' active' : ''}`}
                onClick={() => onAppTabChange('disputes')}
                type="button"
              >
                My Disputes
              </button>
            </div>
          ) : null}
          {statusLabel ? <div className="sub-badge">{statusLabel}</div> : null}
          <div className="user-badge">
            <div className="user-av">{userDisplayName?.[0]?.toUpperCase() || 'U'}</div>
            <span>{userDisplayName || 'User'}</span>
          </div>
          <button className="btn-so" onClick={onSignOut} type="button">
            Sign Out
          </button>
        </div>
      </nav>
    )
  }

  return (
    <nav aria-label="Main navigation" className="nav">
      <button
        className="nav-logo"
        onClick={() => onHomeClick?.() || window.scrollTo({ top: 0, behavior: 'smooth' })}
        type="button"
      >
        <div className="logo-mark">CC</div>
        <div className="logo-wordmark">
          Credit<span>Clear</span> AI
        </div>
      </button>
      <div className="nav-links">
        <Link to="/#how-it-works">How It Works</Link>
        <Link to="/#features-sec">What We Fix</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/blog">Blog</Link>
        <Link to="/#results-sec">Results</Link>
      </div>
      <div className="nav-right">
        <button
          aria-expanded={menuOpen}
          aria-haspopup="true"
          className="btn-nav-ghost nav-menu-btn"
          onClick={() => setMenuOpen((value) => !value)}
          type="button"
        >
          Menu
        </button>
        {authUser ? (
          <Link className="btn-nav-ghost" to="/dashboard">
            Dashboard
          </Link>
        ) : (
          <button
            className="btn-nav-ghost"
            onClick={() => (onSignIn ? onSignIn() : onOpenAuth?.('login'))}
            type="button"
          >
            Sign In
          </button>
        )}
        {authUser ? (
          <Link className="btn-nav-gold" to="/dashboard">
            My workspace
          </Link>
        ) : (
          <button
            className="btn-nav-gold"
            onClick={() => (onStartTrial ? onStartTrial() : onOpenAuth?.('signup'))}
            type="button"
          >
            {CTA_TRIAL_LABEL}
          </button>
        )}
      </div>
      {menuOpen ? (
        <div className="nav-mobile-menu" id="nav-mobile-panel">
          {authUser ? (
            <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
              Dashboard
            </Link>
          ) : null}
          <Link to="/#how-it-works" onClick={() => setMenuOpen(false)}>
            How It Works
          </Link>
          <Link to="/#features-sec" onClick={() => setMenuOpen(false)}>
            What We Fix
          </Link>
          <Link to="/pricing" onClick={() => setMenuOpen(false)}>
            Pricing
          </Link>
          <Link to="/blog" onClick={() => setMenuOpen(false)}>
            Blog
          </Link>
          <Link to="/#results-sec" onClick={() => setMenuOpen(false)}>
            Results
          </Link>
        </div>
      ) : null}
    </nav>
  )
}
