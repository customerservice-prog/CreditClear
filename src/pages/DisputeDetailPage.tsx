import { AppShell } from '../components/layout/AppShell'
import { ComingSoon } from '../components/ComingSoon'
import { FEATURE_FLAGS } from '../lib/featureFlags'
import { buildLetterFileName, formatAgencyName, formatDateLabel, formatDisputeStatusLabel } from '../lib/formatters'
import type { AppTab, DisputeDetail, Letter } from '../types'

interface RoundNode {
  id: string
  number: 1 | 2 | 3 | 4
  title: string
  detail: string
  status: 'live' | 'coming_soon'
}

const ROUND_NODES: readonly RoundNode[] = [
  {
    id: 'round-1',
    number: 1,
    title: 'Initial bureau dispute',
    detail: 'Drafted and ready to mail. Bureau has 30 days to respond once received.',
    status: 'live',
  },
  {
    id: 'round-2',
    number: 2,
    title: 'Method of verification (MOV)',
    detail: 'Auto-drafted 30 days after Round 1 mails — forces the bureau to disclose how it verified.',
    status: 'coming_soon',
  },
  {
    id: 'round-3',
    number: 3,
    title: 'Furnisher direct dispute',
    detail: 'Goes directly to the data furnisher under §1681s-2(b). Often produces deletion when bureaus stall.',
    status: 'coming_soon',
  },
  {
    id: 'round-4',
    number: 4,
    title: 'CFPB complaint escalation',
    detail: 'Auto-drafted complaint text. You submit on consumerfinance.gov; results often within days.',
    status: 'coming_soon',
  },
]

interface DisputeDetailPageProps {
  appMessage?: string
  appTab?: AppTab
  detail: DisputeDetail | null
  loading: boolean
  onAppTabChange?: (tab: AppTab) => void
  onDownloadLetter: (text: string, fileName: string) => void
  onOpenInGenerator?: () => void
  onSaveLetterEdit: (letterId: string, text: string) => void
  onShowHome: () => void
  onSignOut: () => void
  statusLabel: string
  userDisplayName: string
}

export function DisputeDetailPage({
  appMessage,
  appTab,
  detail,
  loading,
  onAppTabChange,
  onDownloadLetter,
  onOpenInGenerator,
  onSaveLetterEdit,
  onShowHome,
  onSignOut,
  statusLabel,
  userDisplayName,
}: DisputeDetailPageProps) {
  return (
    <AppShell
      appTab={appTab}
      heading={
        <>
          Dispute <em>Detail</em>
        </>
      }
      message={appMessage}
      onAppTabChange={onAppTabChange}
      onHomeClick={onShowHome}
      onSignOut={onSignOut}
      statusLabel={statusLabel}
      subheading="Review your saved issue summary, uploads, and editable draft letters."
      userDisplayName={userDisplayName}
    >
      <div className="card">
        {loading ? (
          <div className="history-skel">
            <div className="skel-line short"></div>
            <div className="skel-line"></div>
            <div className="skel-line medium"></div>
          </div>
        ) : !detail ? (
          <div className="disc">This dispute could not be loaded.</div>
        ) : (
          <>
            <div className="card-t">{detail.title}</div>
            <div className="card-s">
              {formatDisputeStatusLabel(detail.status)} · Created {formatDateLabel(detail.created_at)}
            </div>
            {detail.ai_summary ? <div className="disc">{detail.ai_summary}</div> : null}
            <div className="stats-mini">
              <div className="sm">
                <div className="smn">{detail.letters.length}</div>
                <div className="sml">Letters</div>
              </div>
              <div className="sm">
                <div className="smn">{detail.uploads.length}</div>
                <div className="sml">Uploads</div>
              </div>
              <div className="sm">
                <div className="smn">{detail.issue_categories.length}</div>
                <div className="sml">Issues</div>
              </div>
            </div>
            {detail.letters.map((letter) => (
              <div className="lc open" key={letter.id}>
                <div className="lh">
                  <div className="lhl">
                    <span className="pill pgen">{letter.agencyName}</span>
                    <div>
                      <div className="l-title">{letter.issueLabel}</div>
                      <div className="l-sub">{formatAgencyName(letter.agency)} editable draft document</div>
                    </div>
                  </div>
                </div>
                <div className="l-body" style={{ display: 'block' }}>
                  <textarea
                    className="l-editor"
                    onChange={(event) => onSaveLetterEdit(letter.id, event.target.value)}
                    value={letter.text}
                  />
                  <div className="l-acts">
                    <button
                      className="b-copy"
                      onClick={() => void navigator.clipboard.writeText(letter.text)}
                      type="button"
                    >
                      ⎘ Copy Letter
                    </button>
                    <button
                      className="b-dl"
                      onClick={() => onDownloadLetter(letter.text, buildLetterFileName(letter as Letter))}
                      type="button"
                    >
                      ↓ Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="btn-row">
              <button className="btn btn-gold" onClick={onOpenInGenerator} type="button">
                Open In Generator
              </button>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <div className="card-t">Dispute round timeline</div>
              <div className="card-s">
                A complete dispute strategy spans up to four rounds across 60–90 days. Round 1 is live today. Rounds 2–4
                roll out to founding members.
              </div>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                {ROUND_NODES.map((node) => {
                  const isLive = node.status === 'live'
                  return (
                    <div
                      key={node.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: 12,
                        borderRadius: 10,
                        border: `1px solid ${isLive ? 'rgba(48, 200, 120, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        background: isLive
                          ? 'rgba(48, 200, 120, 0.06)'
                          : 'rgba(255, 255, 255, 0.02)',
                        opacity: isLive ? 1 : 0.7,
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          flex: '0 0 auto',
                          width: 36,
                          height: 36,
                          borderRadius: 999,
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 700,
                          background: isLive ? 'rgba(48, 200, 120, 0.18)' : 'rgba(255,255,255,0.06)',
                          color: isLive ? '#30c878' : 'rgba(255,255,255,0.6)',
                          border: `1px solid ${isLive ? 'rgba(48, 200, 120, 0.5)' : 'rgba(255,255,255,0.15)'}`,
                        }}
                      >
                        {node.number}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                            fontWeight: 600,
                          }}
                        >
                          <span>Round {node.number} · {node.title}</span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              padding: '3px 8px',
                              borderRadius: 999,
                              background: isLive
                                ? 'rgba(48, 200, 120, 0.15)'
                                : 'rgba(212, 175, 55, 0.15)',
                              color: isLive ? '#30c878' : 'var(--gold, #d4af37)',
                              border: `1px solid ${
                                isLive ? 'rgba(48, 200, 120, 0.4)' : 'rgba(212, 175, 55, 0.4)'
                              }`,
                            }}
                          >
                            {isLive ? 'Live' : 'Coming Soon'}
                          </span>
                        </div>
                        <div className="disc" style={{ marginTop: 4 }}>
                          {node.detail}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 14 }}>
                <ComingSoon
                  feature={FEATURE_FLAGS.round_tracking_2_4}
                  source="dispute_detail_round_timeline"
                  headline="Auto-track Rounds 2–4"
                  ctaLabel="Notify me when Rounds 2–4 launch"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
