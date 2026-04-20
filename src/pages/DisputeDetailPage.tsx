import { AppShell } from '../components/layout/AppShell'
import { DisputeRoundsPanel } from '../components/DisputeRoundsPanel'
import { buildLetterFileName, formatAgencyName, formatDateLabel, formatDisputeStatusLabel } from '../lib/formatters'
import type { AppTab, DisputeDetail, Letter } from '../types'

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
  userId?: string | null
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
  userId,
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

            <DisputeRoundsPanel disputeId={detail.id} userId={userId ?? null} />
          </>
        )}
      </div>
    </AppShell>
  )
}
