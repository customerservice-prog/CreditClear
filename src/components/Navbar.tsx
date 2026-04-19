import { useState } from 'react'
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
  onScrollTo?: (id: string) => void
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
  onScrollTo,
  statusLabel,
  userDisplayName,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

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
      {onScrollTo ? (
        <div className="nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#features-sec">What We Fix</a>
          <a href="#pricing-sec">Pricing</a>
          <a href="#results-sec">Results</a>
        </div>
      ) : null}
      <div className="nav-right">
        {onScrollTo ? (
          <button
            aria-expanded={menuOpen}
            aria-haspopup="true"
            className="btn-nav-ghost nav-menu-btn"
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            Menu
          </button>
        ) : null}
        <button
          className="btn-nav-ghost"
          onClick={() => (onSignIn ? onSignIn() : onOpenAuth?.('login'))}
          type="button"
        >
          Sign In
        </button>
        <button
          className="btn-nav-gold"
          onClick={() => (onStartTrial ? onStartTrial() : onOpenAuth?.('signup'))}
          type="button"
        >
          {CTA_TRIAL_LABEL}
        </button>
      </div>
      {onScrollTo && menuOpen ? (
        <div className="nav-mobile-menu" id="nav-mobile-panel">
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
            How It Works
          </a>
          <a href="#features-sec" onClick={() => setMenuOpen(false)}>
            What We Fix
          </a>
          <a href="#pricing-sec" onClick={() => setMenuOpen(false)}>
            Pricing
          </a>
          <a href="#results-sec" onClick={() => setMenuOpen(false)}>
            Results
          </a>
        </div>
      ) : null}
    </nav>
  )
}
