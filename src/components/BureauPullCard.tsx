import { useEffect, useState } from 'react'
import { ComingSoon } from './ComingSoon'
import { getBillingStatus, pullAggregatorReportRequest } from '../lib/apiClient'
import { FEATURE_FLAGS } from '../lib/featureFlags'

interface BureauPullCardProps {
  onPulled?: () => void
}

const BUREAU_OPTIONS = [
  { id: 'equifax', label: 'Equifax' },
  { id: 'experian', label: 'Experian' },
  { id: 'transunion', label: 'TransUnion' },
] as const

/**
 * Renders the "Pull from bureau" card on /credit-reports. When the
 * AGGREGATOR_ENABLED env flag is on, calls /api/pull-report to ingest a
 * stub-aggregator report and persist it through the same store path used by
 * uploads. When the flag is off, falls back to the canonical Coming Soon
 * waitlist card so the UI still leads to email capture.
 */
export function BureauPullCard({ onPulled }: BureauPullCardProps) {
  const [aggregatorOpen, setAggregatorOpen] = useState<boolean | null>(null)
  const [bureau, setBureau] = useState<'equifax' | 'experian' | 'transunion'>('equifax')
  const [busy, setBusy] = useState(false)
  const [resultMsg, setResultMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const status = await getBillingStatus()
        if (!cancelled) setAggregatorOpen(status.aggregator_open)
      } catch {
        if (!cancelled) setAggregatorOpen(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handlePull() {
    setBusy(true)
    setErrorMsg('')
    setResultMsg('')
    try {
      const result = await pullAggregatorReportRequest({ bureau })
      setResultMsg(
        `Pulled ${bureau}: ${result.tradelineCount} tradeline${
          result.tradelineCount === 1 ? '' : 's'
        }, ${result.inquiryCount} inquir${result.inquiryCount === 1 ? 'y' : 'ies'}, ${result.publicRecordCount} public record${
          result.publicRecordCount === 1 ? '' : 's'
        }.`,
      )
      onPulled?.()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not pull this report.')
    } finally {
      setBusy(false)
    }
  }

  if (aggregatorOpen === null) {
    return (
      <div
        className="card"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div className="card-t">One-click bureau pull</div>
        <div className="card-s">Checking availability…</div>
      </div>
    )
  }

  if (!aggregatorOpen) {
    return <ComingSoon feature={FEATURE_FLAGS.bureau_connect} source="credit_reports_hero" />
  }

  return (
    <div
      className="card"
      style={{
        borderColor: 'rgba(120, 180, 255, 0.4)',
        background: 'linear-gradient(180deg, rgba(120, 180, 255, 0.06), rgba(255,255,255,0.02))',
      }}
    >
      <div className="card-t" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span>One-click bureau pull</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 999,
            background: 'rgba(120, 180, 255, 0.15)',
            color: '#7ec3ff',
            border: '1px solid rgba(120, 180, 255, 0.4)',
          }}
        >
          Live
        </span>
      </div>
      <div className="card-s">
        Pull a fresh report straight into CreditClear. Tradelines, inquiries, and public records land in your account
        the same way an uploaded PDF would.
      </div>
      <div className="btn-row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <select
          aria-label="Choose a bureau"
          onChange={(e) => setBureau(e.target.value as 'equifax' | 'experian' | 'transunion')}
          style={{ minWidth: 160 }}
          value={bureau}
        >
          {BUREAU_OPTIONS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <button className="btn btn-gold" disabled={busy} onClick={() => void handlePull()} type="button">
          {busy ? 'Pulling…' : 'Pull report'}
        </button>
      </div>
      {resultMsg ? (
        <div className="disc" style={{ marginTop: 8, color: '#9ad8b8' }}>
          {resultMsg}
        </div>
      ) : null}
      {errorMsg ? <div className="ferr" style={{ marginTop: 8 }}>{errorMsg}</div> : null}
    </div>
  )
}
