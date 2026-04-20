import { useCallback, useEffect, useMemo, useState } from 'react'
import { ISSUES } from '../lib/constants'
import {
  ISSUE_GUIDE_ID_PREFIX,
  OPEN_ISSUE_GUIDE_EVENT,
  formatIssueAccountHint,
  getIssueActionGuide,
  isValidIssueId,
  issueGuideElementId,
  letterCardElementId,
  openLetterCardNavigation,
  type OpenIssueGuideDetail,
} from '../lib/issueActionGuides'
import type { IssueAccountDetail, IssueId } from '../types'

/** Minimal letter list so each issue can link back to generated drafts below. */
export interface LetterNavRef {
  id: string
  /** Must match the issue category id (e.g. `late`, `coll`). */
  issue: string
  agencyLabel: string
}

interface DisputeIssueActionPanelProps {
  issueIds: IssueId[]
  issueDetails?: Partial<Record<IssueId, IssueAccountDetail>> | null
  /** When set, scroll margin for anchor links from dashboard */
  id?: string
  /** Letters on this page — used for "Jump to your letters" under each issue */
  lettersForNav?: LetterNavRef[]
}

/**
 * After letters are generated, lists each selected dispute issue as a
 * clickable row. Expanding an issue shows educational, actionable steps
 * (what to gather, what to mail, and how it maps to bureau rounds).
 *
 * Supports `#issue-guide-{issueId}` deep links and `openIssueGuideNavigation()`
 * from letter cards.
 */
export function DisputeIssueActionPanel({
  issueIds,
  issueDetails,
  id: sectionId,
  lettersForNav,
}: DisputeIssueActionPanelProps) {
  const unique = useMemo(() => Array.from(new Set(issueIds)), [issueIds])
  const [openId, setOpenId] = useState<IssueId | null>(unique.length === 1 ? unique[0] : null)

  const scrollIssueGuideIntoView = useCallback((issueId: IssueId) => {
    window.setTimeout(() => {
      const el = document.getElementById(issueGuideElementId(issueId))
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }, [])

  // Custom event from letter "View steps" buttons (works when hash unchanged)
  useEffect(() => {
    function onOpenGuide(event: Event) {
      const detail = (event as CustomEvent<OpenIssueGuideDetail>).detail
      if (!detail?.issueId || !unique.includes(detail.issueId)) return
      setOpenId(detail.issueId)
      scrollIssueGuideIntoView(detail.issueId)
    }
    window.addEventListener(OPEN_ISSUE_GUIDE_EVENT, onOpenGuide)
    return () => window.removeEventListener(OPEN_ISSUE_GUIDE_EVENT, onOpenGuide)
  }, [scrollIssueGuideIntoView, unique])

  // Initial load + browser back/forward: hash #issue-guide-{id}
  useEffect(() => {
    function applyHash() {
      const raw = window.location.hash.replace(/^#/, '')
      if (!raw.startsWith(ISSUE_GUIDE_ID_PREFIX)) return
      const id = raw.slice(ISSUE_GUIDE_ID_PREFIX.length)
      if (!isValidIssueId(id) || !unique.includes(id)) return
      setOpenId(id)
      scrollIssueGuideIntoView(id)
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [scrollIssueGuideIntoView, unique])

  if (unique.length === 0) return null

  const metaById = new Map(ISSUES.map((i) => [i.id, i]))

  return (
    <div className="card" id={sectionId} style={{ marginTop: 0, marginBottom: 16 }}>
      <div className="card-t">What to do for each issue</div>
      <p className="card-s" style={{ marginBottom: 12 }}>
        Click an issue below for step-by-step guidance: what to verify, what to send, and how it fits your dispute rounds.
        Use <strong>View steps for this issue</strong> on each letter to jump here. This is educational information only,
        not legal advice.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {unique.map((issueId) => {
          const meta = metaById.get(issueId)
          const guide = getIssueActionGuide(issueId)
          const detail = issueDetails?.[issueId]
          const accountHint = formatIssueAccountHint(detail)
          const isOpen = openId === issueId
          const lettersThisIssue =
            lettersForNav?.filter((row) => row.issue === issueId) ?? []
          return (
            <div
              key={issueId}
              id={issueGuideElementId(issueId)}
              style={{
                scrollMarginTop: 96,
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
                  {lettersThisIssue.length > 0 ? (
                    <div style={{ marginTop: 14 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          opacity: 0.85,
                          marginBottom: 8,
                        }}
                      >
                        Jump to your letters for this issue
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {lettersThisIssue.map((row) => (
                          <a
                            key={row.id}
                            className="b-copy"
                            href={`#${letterCardElementId(row.id)}`}
                            onClick={(event) => {
                              event.preventDefault()
                              openLetterCardNavigation(row.id)
                            }}
                            title={`Scroll to the ${row.agencyLabel} draft below`}
                          >
                            {row.agencyLabel}
                          </a>
                        ))}
                      </div>
                      <p className="disc" style={{ marginTop: 10, marginBottom: 0, fontSize: 12 }}>
                        One link per bureau you selected; each opens the matching draft further down the page.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
