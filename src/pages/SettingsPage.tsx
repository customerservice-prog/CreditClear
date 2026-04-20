import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { ComingSoon } from '../components/ComingSoon'
import { deleteAccountRequest, downloadAccountExport } from '../lib/apiClient'
import { FEATURE_FLAGS } from '../lib/featureFlags'
import type { AppTab, AppUser } from '../types'

interface SettingsPageProps {
  appMessage?: string
  appTab?: AppTab
  onAppTabChange?: (tab: AppTab) => void
  onShowHome: () => void
  onSignOut: () => void
  statusLabel: string
  user: AppUser | null
  userDisplayName: string
}

const DELETE_CONFIRM_PHRASE = 'DELETE MY ACCOUNT'

export function SettingsPage({
  appMessage,
  appTab,
  onAppTabChange,
  onShowHome,
  onSignOut,
  statusLabel,
  user,
  userDisplayName,
}: SettingsPageProps) {
  const [exportBusy, setExportBusy] = useState(false)
  const [exportError, setExportError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteNotice, setDeleteNotice] = useState('')

  async function handleExport() {
    setExportBusy(true)
    setExportError('')
    try {
      await downloadAccountExport()
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Could not download your export.')
    } finally {
      setExportBusy(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== DELETE_CONFIRM_PHRASE) {
      setDeleteError(`Type "${DELETE_CONFIRM_PHRASE}" to confirm.`)
      return
    }
    setDeleteBusy(true)
    setDeleteError('')
    setDeleteNotice('')
    try {
      const result = await deleteAccountRequest({ confirm: deleteConfirm, reason: deleteReason })
      setDeleteNotice(result.message)
      setDeleteConfirm('')
      setDeleteReason('')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not request account deletion.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <AppShell
      appTab={appTab}
      heading={
        <>
          Account <em>Settings</em>
        </>
      }
      message={appMessage}
      onAppTabChange={onAppTabChange}
      onHomeClick={onShowHome}
      onSignOut={onSignOut}
      statusLabel={statusLabel}
      subheading="Review your profile, exercise your data rights, and manage account access."
      userDisplayName={userDisplayName}
    >
      <div className="card">
        <div className="card-t">Profile</div>
        <div className="card-s">Basic account information synced from Supabase authentication.</div>
        <div className="fg">
          <div className="f">
            <label>Full Name</label>
            <input disabled value={user?.name || ''} />
          </div>
          <div className="f">
            <label>Email</label>
            <input disabled value={user?.email || ''} />
          </div>
        </div>
        <div className="disc">
          CreditClear helps you organize information and generate review-ready draft documents.
          You remain responsible for verifying all content before use.
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={onSignOut} type="button">
            Sign Out
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-t">Your data rights</div>
        <div className="card-s">
          You can review every disclosure CreditClear is required to give you (CROA, FCRA, and the
          Notice of Cancellation) on the{' '}
          <Link style={{ color: 'var(--gold)' }} to="/disclosures">
            disclosures page
          </Link>
          .
        </div>
        <div style={{ display: 'grid', gap: 16, marginTop: 12 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Download all of your data</div>
            <div className="disc" style={{ marginTop: 0, marginBottom: 8 }}>
              Returns a JSON file with every row CreditClear stores about you (profile,
              subscriptions, disputes, letters, uploads, parsed report data, waitlist signups).
              Uploaded PDFs themselves stay in private storage; the export lists their paths.
            </div>
            <div className="btn-row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button className="btn btn-ghost" disabled={exportBusy} onClick={() => void handleExport()} type="button">
                {exportBusy ? 'Preparing export…' : 'Download my data (JSON)'}
              </button>
            </div>
            {exportError ? <div className="ferr" style={{ marginTop: 6 }}>{exportError}</div> : null}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Delete my account</div>
            <div className="disc" style={{ marginTop: 0, marginBottom: 8 }}>
              Schedules permanent deletion of your CreditClear account and all associated rows.
              We hold the request for 7 days so you can change your mind — email{' '}
              <a href="mailto:support@creditclearai.com" style={{ color: 'var(--gold)' }}>
                support@creditclearai.com
              </a>{' '}
              before then to cancel.
            </div>
            <div className="fg">
              <div className="f sp">
                <label htmlFor="delete-reason">Reason (optional, helps us improve)</label>
                <textarea
                  id="delete-reason"
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Tell us why, if you'd like."
                  rows={2}
                  value={deleteReason}
                />
              </div>
              <div className="f sp">
                <label htmlFor="delete-confirm">
                  Type <code>{DELETE_CONFIRM_PHRASE}</code> to confirm
                </label>
                <input
                  id="delete-confirm"
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={DELETE_CONFIRM_PHRASE}
                  value={deleteConfirm}
                />
              </div>
            </div>
            <div className="btn-row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button
                className="btn"
                disabled={deleteBusy || deleteConfirm !== DELETE_CONFIRM_PHRASE}
                onClick={() => void handleDelete()}
                style={{
                  background: 'rgba(220, 80, 80, 0.18)',
                  border: '1px solid rgba(220, 80, 80, 0.5)',
                  color: '#ff8a8a',
                }}
                type="button"
              >
                {deleteBusy ? 'Submitting request…' : 'Request account deletion'}
              </button>
            </div>
            {deleteError ? <div className="ferr" style={{ marginTop: 6 }}>{deleteError}</div> : null}
            {deleteNotice ? (
              <div className="disc" style={{ marginTop: 6, color: '#30c878' }}>
                {deleteNotice}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <ComingSoon feature={FEATURE_FLAGS.certified_mail} source="settings_cert_mail_panel" />
      </div>
    </AppShell>
  )
}
