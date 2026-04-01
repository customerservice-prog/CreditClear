import type { ReactNode } from 'react'
import { Sentry } from '../lib/monitoring'

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={
        <div className="page active">
          <div className="hero" style={{ maxWidth: 640 }}>
            <div className="hero-badge">
              <div className="pulse-dot"></div> Something Went Wrong
            </div>
            <h1>
              We hit an unexpected <em>error</em>
            </h1>
            <p className="hero-sub">
              The issue has been captured for review when monitoring is configured. Please refresh the page and try again.
            </p>
            <button className="btn-xl" onClick={() => window.location.assign('/')} type="button">
              Return Home
            </button>
          </div>
        </div>
      }
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
