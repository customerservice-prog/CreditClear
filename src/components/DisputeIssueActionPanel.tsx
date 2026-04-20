import { useState } from 'react'
import { ISSUES } from '../lib/constants'
import { formatIssueAccountHint, getIssueActionGuide } from '../lib/issueActionGuides'
import type { IssueAccountDetail, IssueId } from '../types'

interface DisputeIssueActionPanelProps {
  issueIds: IssueId[]
  issueDetails?: Partial<Record<IssueId, IssueAccountDetail>> | null
  /** When set, scroll margin for anchor links from dashboard */
  id?: string
}

/**
 * After letters are generated, lists each selected dispute issue as a
 * clickable row. Expanding an issue shows educational, actionable steps
 * (what to gather, what to mail, and how it maps to bureau rounds).
 */
export function DisputeIssueActionPanel({ issueIds, issueDetails, id: sectionId }: DisputeIssueActionPanelProps) {
  const unique = Array.from(new Set(issueIds))
  const [openId, setOpenId] = useState<IssueId | null>(unique.length === 1 ? unique[0] : null)

  if (unique.length === 0) return null

  const metaById = new Map(ISSUES.map((i) => [i.id, i]))

  return (
    <div className="card" id={sectionId} style={{ marginTop: 0, marginBottom: 16 }}>
      <div className="card-t">What to do for each issue</div>
      <p className="card-s" style={{ marginBottom: 12 }}>
        Click an issue below for step-by-step guidance: what to verify, what to send, and how it fits your dispute rounds.
        This is educational information only, not legal advice.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {unique.map((issueId) => {
          const meta = metaById.get(issueId)
          const guide = getIssueActionGuide(issueId)
          const detail = issueDetails?.[issueId]
          const accountHint = formatIssueAccountHint(detail)
          const isOpen = openId === issueId
          return (
            <div
              key={issueId}
              style={{
                borderRadius: 10,
                border: isOpen ? '1px solid rgba(212, 175, 55, 0.45)' : '1px solid rgba(255,255,255,0.1)',
                background: isOpen ? 'rgba(212, 175, 55, 0.06)' : 'rgba(255,255,255,0.02)',
                overflow: 'hidden',
              }}
            >
              <button
                className="lh"
                onClick={() => setOpenId(isOpen ? null : issueId)}
                style={{
                  width: '100%',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  textAlign: 'left',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
                type="button"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <span aria-hidden="true" style={{ fontSize: 20 }}>
                    {meta?.icon ?? '•'}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600 }}>{meta?.label ?? guide.headline}</span>
                    {accountHint ? (
                      <span style={{ display: 'block', fontSize: 12, opacity: 0.75, marginTop: 2 }}>{accountHint}</span>
                    ) : null}
                  </span>
                </span>
                <span className="l-chev" style={{ flexShrink: 0 }} aria-hidden={true}>
                  {isOpen ? '⌃' : '⌄'}
                </span>
              </button>
              {isOpen ? (
                <div
                  style={{
                    padding: '0 14px 14px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <p className="disc" style={{ marginTop: 10, marginBottom: 12 }}>
                    {guide.summary}
                  </p>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 8 }}>
                    Steps
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
                    {guide.steps.map((step, idx) => (
                      <li key={idx} style={{ lineHeight: 1.45 }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                  {guide.evidenceTips && guide.evidenceTips.length > 0 ? (
                    <>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          opacity: 0.8,
                          marginTop: 14,
                          marginBottom: 8,
                        }}
                      >
                        Evidence to gather
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4, opacity: 0.9 }}>
                        {guide.evidenceTips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  <div
                    style={{
                      marginTop: 14,
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'rgba(48, 200, 120, 0.08)',
                      border: '1px solid rgba(48, 200, 120, 0.25)',
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    <strong style={{ color: '#9ad8b8' }}>Letters in this app</strong>
                    <br />
                    {guide.letterRoundHint}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
