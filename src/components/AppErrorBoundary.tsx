import { Component, type ErrorInfo, type ReactNode } from 'react'
import { MarketingMain, SkipToContent } from './MarketingPageFrame'
import { captureClientError } from '../lib/monitoring'

type Props = { children: ReactNode }
type State = { error: Error | null }

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error: toError(error) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const err = toError(error)
    console.error('[AppErrorBoundary]', err, info.componentStack)
    captureClientError(err, {
      componentStack: (info.componentStack || '').slice(0, 480),
    })
  }

  render() {
    if (this.state.error) {
      const message = this.state.error.message || 'Unknown error'
      return (
        <div className="page active">
          <SkipToContent />
          <MarketingMain>
            <div className="hero" style={{ maxWidth: 640 }}>
              <div className="hero-badge">
                <div className="pulse-dot"></div> Something Went Wrong
              </div>
              <h1>
                We hit an unexpected <em>error</em>
              </h1>
              <p className="hero-sub">
                Please refresh the page and try again. If this keeps happening, contact support and include the
                message below.
              </p>
              <pre
                className="disc"
                style={{
                  fontSize: 12,
                  marginBottom: 20,
                  maxHeight: 200,
                  overflow: 'auto',
                  textAlign: 'left',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {message}
              </pre>
              <button className="btn-xl" onClick={() => window.location.assign('/')} type="button">
                Return Home
              </button>
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-ghost" onClick={() => this.setState({ error: null })} type="button">
                  Try again
                </button>
              </div>
            </div>
          </MarketingMain>
        </div>
      )
    }
    return this.props.children
  }
}
