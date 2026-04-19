import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { formatDateLabel, formatFileSize, formatReportBureauLabel } from '../lib/formatters'
import { requireSupabase } from '../lib/supabaseClient'
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
  const [rows, setRows] = useState<UploadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    const supabase = requireSupabase()
    setLoading(true)
    setError('')
    const result = await supabase
      .from('uploads')
      .select('id, user_id, dispute_id, file_path, file_name, mime_type, file_size, report_bureau, created_at')
      .order('created_at', { ascending: false })

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
