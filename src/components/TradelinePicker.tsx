import { useState } from 'react'
import { ISSUES } from '../lib/constants'
import { formatTradelineMoney, type PickableTradeline } from '../hooks/useTradelines'
import type { IssueAccountDetail, IssueId } from '../types'

interface TradelinePickerProps {
  tradelines: PickableTradeline[]
  loading: boolean
  error: string
  selectedIssues: IssueId[]
  /** Called with an issue + a fully-prefilled detail row. The host wires this
   *  to the same callbacks Step 3's manual form uses, so the picker behaves
   *  like a one-click prefill of the existing accordion. */
  onAssignTradeline: (issue: IssueId, detail: IssueAccountDetail) => void
}

const BUREAU_BADGE: Record<string, { label: string; color: string }> = {
  equifax: { label: 'Equifax', color: '#7d3aff' },
  experian: { label: 'Experian', color: '#0a85ff' },
  transunion: { label: 'TransUnion', color: '#ff7d3a' },
}

/**
 * Renders the parsed tradelines from the user's uploaded credit reports
 * (PR 3 pipeline) as a click-to-assign list. Picking an issue from the
 * dropdown next to a tradeline prefills that issue's Step 3 detail row.
 */
export function TradelinePicker({
  tradelines,
  loading,
  error,
  selectedIssues,
  onAssignTradeline,
}: TradelinePickerProps) {
  const [recentlyAssigned, setRecentlyAssigned] = useState<Record<string, IssueId>>({})

  if (loading) {
    return (
      <div className="card" style={{ background: 'rgba(255,255,255,0.02)', marginBottom: 14 }}>
        <div className="card-t">Pull from your parsed report</div>
        <div className="card-s">Loading tradelines…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" style={{ background: 'rgba(220,80,80,0.06)', border: '1px solid rgba(220,80,80,0.3)', marginBottom: 14 }}>
        <div className="card-t">Pull from your parsed report</div>
        <div className="card-s">Could not load parsed tradelines: {error}</div>
      </div>
    )
  }

  if (tradelines.length === 0) {
    return null
  }

  return (
    <div
      className="card"
      style={{
        marginBottom: 14,
        background: 'rgba(48, 200, 120, 0.06)',
        border: '1px solid rgba(48, 200, 120, 0.25)',
      }}
    >
      <div className="card-t" style={{ marginBottom: 4 }}>
        Pull from your parsed report ({tradelines.length})
      </div>
      <div className="card-s" style={{ marginBottom: 10 }}>
        We extracted these tradelines from the credit-report PDFs you uploaded. Pick the issue
        category for any account you want to dispute — that fills in Step 3 below for you, with
        the creditor name, account number, balance, and reported date already populated.
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {tradelines.map((tradeline) => {
          const bureau = BUREAU_BADGE[tradeline.bureau] ?? { label: tradeline.bureau, color: '#888' }
          const balance = formatTradelineMoney(tradeline.balanceCents)
          const recent = recentlyAssigned[tradeline.id]
          return (
            <div
              key={tradeline.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: `${bureau.color}22`,
                  color: bureau.color,
                  border: `1px solid ${bureau.color}55`,
                }}
              >
                {bureau.label}
              </span>
              <span style={{ fontWeight: 600, minWidth: 140 }}>{tradeline.creditor || 'Unnamed creditor'}</span>
              {tradeline.accountLast4 ? (
                <span style={{ opacity: 0.8, fontSize: 13 }}>•••• {tradeline.accountLast4}</span>
              ) : null}
              {balance ? <span style={{ opacity: 0.8, fontSize: 13 }}>{balance}</span> : null}
              {tradeline.paymentStatus ? (
                <span style={{ opacity: 0.7, fontSize: 12 }}>{tradeline.paymentStatus}</span>
              ) : null}
              <span style={{ flex: 1 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ opacity: 0.75 }}>Assign to</span>
                <select
                  onChange={(event) => {
                    const issue = event.target.value as IssueId | ''
                    if (!issue) return
                    onAssignTradeline(issue, {
                      creditorName: tradeline.creditor || '',
                      accountLast4: tradeline.accountLast4 || '',
                      amountOrBalance: balance,
                      reportedDate: tradeline.reportedOn || '',
                      disputeReason: '',
                    })
                    setRecentlyAssigned((prev) => ({ ...prev, [tradeline.id]: issue }))
                  }}
                  value={recent ?? ''}
                >
                  <option value="">Pick an issue…</option>
                  {ISSUES.map((issue) => (
                    <option key={issue.id} value={issue.id}>
                      {issue.icon} {issue.label}
                      {selectedIssues.includes(issue.id) ? ' (selected)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              {recent ? (
                <span style={{ fontSize: 11, color: '#30c878', fontWeight: 600 }}>✓ Filled</span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
