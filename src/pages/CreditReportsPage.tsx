import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { ComingSoon } from '../components/ComingSoon'
import { FEATURE_FLAGS } from '../lib/featureFlags'
import { formatDateLabel, formatFileSize, formatReportBureauLabel } from '../lib/formatters'
import { requireSupabase } from '../lib/supabaseClient'
import { deleteUploadForCurrentUser, listUploadsForCurrentUser } from '../lib/uploadQueries'
import type { AppTab, UploadRecord } from '../types'

const BUCKET = 'private-uploads'

interface CreditReportsPageProps {
  appMessage?: string
  appTab?: AppTab
  onAppTabChange?: (tab: AppTab) => void
  onShowHome: () => void
  onSignOut: () => void
  statusLabel: string
  userDisplayName: string
}

export function CreditReportsPage({
  appMessage,
  appTab,
  onAppTabChange,
  onShowHome,
  onSignOut,
  statusLabel,
  userDisplayName,
}: CreditReportsPageProps) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<UploadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = requireSupabase()
    setLoading(true)
    setError('')
    const result = await listUploadsForCurrentUser(supabase)

    setLoading(false)
    if (result.error) {
      setError('Could not load your credit report files.')
      return
    }
    setRows((result.data ?? []) as UploadRecord[])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function openSigned(upload: UploadRecord) {
    setActionError('')
    const supabase = requireSupabase()
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(upload.file_path, 3600)
    if (signed.error || !signed.data?.signedUrl) {
      setActionError('Could not open that file. Try again in a moment.')
      return
    }
    window.open(signed.data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function deleteUpload(upload: UploadRecord) {
    if (
      !window.confirm(
        `Permanently delete “${upload.file_name}” from CreditClear? The file will be removed from your account storage.`,
      )
    ) {
      return
    }
    setActionError('')
    setDeletingId(upload.id)
    const supabase = requireSupabase()
    const { error: delErr } = await deleteUploadForCurrentUser(supabase, upload)
    setDeletingId(null)
    if (delErr) {
      setActionError('Could not delete that file. Try again or contact support if this keeps happening.')
      return
    }
    await load()
  }

  async function downloadSigned(upload: UploadRecord) {
    setActionError('')
    const supabase = requireSupabase()
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(upload.file_path, 3600)
    if (signed.error || !signed.data?.signedUrl) {
      setActionError('Could not download that file. Try again in a moment.')
      return
    }
    const anchor = document.createElement('a')
    anchor.href = signed.data.signedUrl
    anchor.download = upload.file_name
    anchor.rel = 'noopener'
    anchor.target = '_blank'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }

  return (
    <AppShell
      appTab={appTab}
      heading={
        <>
          Your <em>credit report</em> files
        </>
      }
      message={actionError || appMessage}
      onAppTabChange={onAppTabChange}
      onHomeClick={onShowHome}
      onSignOut={onSignOut}
      statusLabel={statusLabel}
      subheading="Every report you upload to CreditClear is listed here. Label each file with the right bureau in the dispute workflow so drafts match the correct report."
      userDisplayName={userDisplayName}
    >
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-t">Connect your credit report</div>
        <div className="card-s">
          Two ways to get your report data into CreditClear. Pick whichever is fastest for you today.
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 14,
            marginTop: 12,
          }}
        >
          <div
            className="card"
            style={{
              borderColor: 'rgba(48, 200, 120, 0.4)',
              background: 'linear-gradient(180deg, rgba(48, 200, 120, 0.06), rgba(255,255,255,0.02))',
            }}
          >
            <div className="card-t" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>Upload a PDF</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: 'rgba(48, 200, 120, 0.15)',
                  color: '#30c878',
                  border: '1px solid rgba(48, 200, 120, 0.4)',
                }}
              >
                Live
              </span>
            </div>
            <div className="card-s">
              Drop in a PDF from any bureau, MyFICO, Credit Karma, or annualcreditreport.com. We&apos;ll attach it to
              your dispute and use the contents when generating letters.
            </div>
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button className="btn btn-gold" onClick={() => navigate('/disputes/new')} type="button">
                Start a dispute &amp; upload &rarr;
              </button>
            </div>
          </div>
          <ComingSoon feature={FEATURE_FLAGS.bureau_connect} source="credit_reports_hero" />
        </div>
      </div>

      <div className="card">
        <div className="card-t">Uploaded reports</div>
        <div className="card-s">
          These are stored in your private account. Open in a new tab to view (PDF or image), or download a copy. Files come from
          credit report providers or your own scans—not retrieved automatically from the bureaus by CreditClear.
        </div>
        {loading ? (
          <div className="history-list">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="history-skel" key={index}>
                <div className="skel-line short"></div>
                <div className="skel-line"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="disc">
            {error}
            <div className="muted-row">
              <button className="btn btn-ghost" onClick={() => void load()} type="button">
                Retry
              </button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="disc">No uploads yet. Start a dispute and add credit report files on the upload step—they will appear here.</div>
        ) : (
          <div className="history-list">
            {rows.map((upload) => (
              <div className="history-card" key={upload.id}>
                <div className="history-head">
                  <div>
                    <div className="history-title">{upload.file_name}</div>
                    <div className="history-sub">
                      {formatDateLabel(upload.created_at)} · {formatFileSize(upload.file_size)} ·{' '}
                      {formatReportBureauLabel(upload.report_bureau)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => void openSigned(upload)} type="button">
                      Open
                    </button>
                    <button className="btn btn-gold" onClick={() => void downloadSigned(upload)} type="button">
                      Download
                    </button>
                    <button
                      className="btn btn-ghost"
                      disabled={deletingId === upload.id}
                      onClick={() => void deleteUpload(upload)}
                      type="button"
                    >
                      {deletingId === upload.id ? 'Deleting…' : 'Delete'}
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
