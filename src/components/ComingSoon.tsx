import { useState } from 'react'
import { joinWaitlistRequest } from '../lib/apiClient'
import type { FeatureFlag } from '../lib/featureFlags'

interface ComingSoonProps {
  feature: FeatureFlag
  /** Override the default headline for embedded usage (e.g. inside a tile). */
  headline?: string
  /** Optional CTA label override. */
  ctaLabel?: string
  /** Override the source string written to waitlist_signups (defaults to feature id). */
  source?: string
  /** Render as a compact inline card (no big icon) for use inside grids. */
  compact?: boolean
}

export function ComingSoon({
  feature,
  headline,
  ctaLabel,
  source,
  compact = false,
}: ComingSoonProps) {
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
      await joinWaitlistRequest({
        email: trimmed,
        featureId: feature.id,
        source: source || feature.id,
      })
      setDone(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your spot. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="card"
      style={{
        borderColor: 'rgba(212, 175, 55, 0.35)',
        background:
          'linear-gradient(180deg, rgba(212, 175, 55, 0.06), rgba(255, 255, 255, 0.02))',
        ...(compact ? { padding: 18 } : {}),
      }}
    >
      {!compact && feature.icon ? (
        <div style={{ fontSize: 32, marginBottom: 6 }} aria-hidden="true">
          {feature.icon}
        </div>
      ) : null}
      <div className="card-t" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span>{headline || feature.label}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 999,
            background: 'rgba(212, 175, 55, 0.15)',
            color: 'var(--gold, #d4af37)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
          }}
        >
          Coming Soon
        </span>
      </div>
      <div className="card-s">{feature.description}</div>
      {feature.eta ? (
        <div className="disc" style={{ marginTop: 4, marginBottom: 12, opacity: 0.85 }}>
          {feature.eta}
        </div>
      ) : null}

      {done ? (
        <div
          className="disc"
          style={{ marginTop: 8, color: 'var(--gold, #d4af37)' }}
          role="status"
          aria-live="polite"
        >
          Got it. We&apos;ll email you the moment {feature.label.toLowerCase()} is live.
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            style={{
              flex: '1 1 220px',
              minWidth: 200,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(0,0,0,0.25)',
              color: 'inherit',
            }}
            aria-label={`Email me when ${feature.label} launches`}
          />
          <button
            className="btn btn-gold"
            type="submit"
            disabled={submitting}
            style={{ flex: '0 0 auto' }}
          >
            {submitting ? 'Saving…' : ctaLabel || 'Tell me when this launches'}
          </button>
          {error ? (
            <div className="ferr" style={{ flex: '1 1 100%' }}>
              {error}
            </div>
          ) : null}
        </form>
      )}
    </div>
  )
}
