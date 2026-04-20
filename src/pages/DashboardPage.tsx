import { Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { disputeLetterCount, formatDateLabel } from '../lib/formatters'
import type { AppTab, DisputeRecord } from '../types'

interface DashboardPageProps {
  appMessage?: string
  appTab?: AppTab
  deletingDisputeId: string | null
  disputes: DisputeRecord[]
  disputesError?: string
  disputesLoading: boolean
  onAppTabChange?: (tab: AppTab) => void
  onDeleteDispute: (id: string) => void
  onOpenBilling: () => void
  onOpenDispute: (id: string) => void
  onOpenNewDispute: () => void
  onRetryDisputes?: () => void
  onShowHome: () => void
  onSignOut: () => void
  statusLabel: string
  userDisplayName: string
}

export function DashboardPage({
  appMessage,
  appTab,
  deletingDisputeId,
  disputes,
  disputesError,
  disputesLoading,
  onAppTabChange,
  onDeleteDispute,
  onOpenBilling,
  onOpenDispute,
  onOpenNewDispute,
  onRetryDisputes,
  onShowHome,
  onSignOut,
  statusLabel,
  userDisplayName,
}: DashboardPageProps) {
  return (
    <AppShell
      appTab={appTab}
      heading={
        <>
          Welcome Back, <em>{userDisplayName}</em>
        </>
      }
      message={appMessage}
      onAppTabChange={onAppTabChange}
      onHomeClick={onShowHome}
      onSignOut={onSignOut}
      statusLabel={statusLabel}
      subheading="Track subscription access, revisit saved draft disputes, and start a new document-preparation workflow."
      userDisplayName={userDisplayName}
    >
      <div className="dash-grid">
        <div className="card">
          <div className="card-t">Start a New Dispute</div>
          <div className="card-s">
            Organize report issues, upload supporting files, and generate review-ready draft letters.
          </div>
          <div className="btn-row">
            <button className="btn btn-gold" onClick={onOpenNewDispute} type="button">
              New Dispute →
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-t">Billing Status</div>
          <div className="card-s">
            Current access: <strong style={{ color: 'var(--gold)' }}>{statusLabel}</strong>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={onOpenBilling} type="button">
              Manage Billing
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-t">Credit report files</div>
          <div className="card-s">
            Open a single place to view or download every report PDF or image you have uploaded, with bureau labels.
          </div>
          <div className="btn-row">
            <Link className="btn btn-gold" style={{ textAlign: 'center', textDecoration: 'none' }} to="/credit-reports">
              My Credit Reports →
            </Link>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-t">Recent Disputes</div>
        <div className="card-s">Saved sessions remain editable and reviewable. Nothing generated here should be sent without your review.</div>
        {disputesLoading ? (
          <div className="history-list">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="history-skel" key={index}>
                <div className="skel-line short"></div>
                <div className="skel-line"></div>
                <div className="skel-line medium"></div>
              </div>
            ))}
          </div>
        ) : disputesError ? (
          <div className="disc">
            {disputesError}
            <div className="muted-row">
              <span>Try again to restore your saved dispute history.</span>
              <button className="btn btn-ghost" onClick={onRetryDisputes} type="button">
                Retry
              </button>
            </div>
          </div>
        ) : disputes.length === 0 ? (
          <div className="disc">No disputes saved yet. Start one to generate summaries, editable drafts, and upload-backed records.</div>
        ) : (
          <div className="history-list">
            {disputes.slice(0, 6).map((dispute) => (
              <div className="history-card" key={dispute.id}>
                <div className="history-head">
                  <div>
                    <div className="history-title">{dispute.title || 'Untitled Dispute'}</div>
                    <div className="history-sub">
                      {formatDateLabel(dispute.created_at)} · {disputeLetterCount(dispute)} letter
                      {disputeLetterCount(dispute) === 1 ? '' : 's'} · {dispute.issue_categories.length} issue categories ·{' '}
                      {dispute.bureau_targets.length} bureaus
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => onOpenDispute(dispute.id)} type="button">
                      Open
                    </button>
                    <button
                      className="btn btn-ghost"
                      disabled={deletingDisputeId === dispute.id}
                      onClick={() => onDeleteDispute(dispute.id)}
                      style={{ color: 'rgba(248, 113, 113, 0.95)' }}
                      type="button"
                    >
                      {deletingDisputeId === dispute.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
