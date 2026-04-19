import { Component, type ErrorInfo, type ReactNode } from 'react'
import { MarketingMain, SkipToContent } from './MarketingPageFrame'
import { isStaleChunkLoadError } from '../lib/chunkLoadError'
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
    if (!isStaleChunkLoadError(err)) {
      captureClientError(err, {
        componentStack: (info.componentStack || '').slice(0, 480),
      })
    }
  }

  render() {
    if (this.state.error) {
      const message = this.state.error.message || 'Unknown error'
      const staleChunk = isStaleChunkLoadError(this.state.error)

      const reloadLatest = () => {
        window.location.reload()
      }

      return (
        <div className="page active">
          <SkipToContent />
          <MarketingMain>
            <div className="hero" style={{ maxWidth: 640 }}>
              <div className="hero-badge">
                <div className="pulse-dot"></div> {staleChunk ? 'Update needed' : 'Something Went Wrong'}
              </div>
              <h1>
                {staleChunk ? (
                  <>
                    Load the latest <em>version</em>
                  </>
                ) : (
                  <>
                    We hit an unexpected <em>error</em>
                  </>
                )}
              </h1>
              <p className="hero-sub">
                {staleChunk
                  ? 'The site was just updated. Reload once to fetch the newest files—this usually happens right after we ship a release.'
                  : 'Please refresh the page and try again. If this keeps happening, contact support and include the message below.'}
              </p>
              {!staleChunk ? (
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
              ) : null}
              <button className="btn-xl" onClick={reloadLatest} type="button">
                Reload page
              </button>
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-ghost" onClick={() => window.location.assign('/')} type="button">
                  Return home
                </button>
                {!staleChunk ? (
                  <button
                    className="btn btn-ghost"
                    onClick={() => this.setState({ error: null })}
                    style={{ marginLeft: 12 }}
                    type="button"
                  >
                    Try again
                  </button>
                ) : null}
              </div>
            </div>
          </MarketingMain>
        </div>
      )
    }
    return this.props.children
  }
}
