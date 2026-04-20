import { useState } from 'react'
import { joinWaitlistRequest } from '../lib/apiClient'

interface WaitlistCardProps {
  /** Defaults to "founders_waitlist" — also valid in api/waitlist.js. */
  featureId?: string
  source?: string
  title?: string
  badge?: string
  bullets?: readonly string[]
  note?: string
}

const DEFAULT_BULLETS = [
  'Founder pricing locked for life',
  'Early access to round-tracking, certified mail, and the score simulator',
  'Direct line to the team for product feedback',
  'No card required to join the list',
] as const

export function WaitlistCard({
  featureId = 'founders_waitlist',
  source = 'pricing_page',
  title = "Founders' waitlist",
  badge = '✦ Open to the first 100',
  bullets = DEFAULT_BULLETS,
  note = "We're rebuilding billing to a CROA-compliant, no-advance-fee, bill-per-letter model. New checkouts reopen as soon as round-tracking lands. Existing subscribers keep their current plan.",
}: WaitlistCardProps) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Please enter your email address.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      setError('That email address does not look right.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await joinWaitlistRequest({ email: trimmed, featureId, source })
      setDone(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your spot. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="price-card">
      <div className="price-badge">{badge}</div>
      <div className="price-name">{title}</div>
      <div className="price-amt" style={{ fontSize: 36 }}>
        Free to join
      </div>
      <div className="price-per">No card · be first to know when checkout reopens</div>
      <div className="price-div"></div>
      <div className="price-feats">
        {bullets.map((line) => (
          <div className="pf" key={line}>
            <span className="pf-ck">✓</span>
            <span>{line}</span>
          </div>
        ))}
      </div>

      {done ? (
        <div
          className="disc"
          style={{
            marginTop: 16,
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid rgba(48, 200, 120, 0.4)',
            background: 'rgba(48, 200, 120, 0.08)',
            color: '#30c878',
            textAlign: 'center',
          }}
          role="status"
          aria-live="polite"
        >
          You&apos;re on the list. We&apos;ll email you when checkout reopens.
        </div>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            aria-label="Email address for the founders waitlist"
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(0,0,0,0.25)',
              color: 'inherit',
              fontSize: 16,
            }}
          />
          <button
            className="btn-xl"
            disabled={submitting}
            type="submit"
            style={{ justifyContent: 'center', width: '100%' }}
          >
            {submitting ? 'Saving…' : 'Join the waitlist'}
          </button>
          {error ? <div className="ferr">{error}</div> : null}
        </form>
      )}

      <div className="price-note">{note}</div>
    </div>
  )
}
