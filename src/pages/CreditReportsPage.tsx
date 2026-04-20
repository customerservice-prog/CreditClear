import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { BureauPullCard } from '../components/BureauPullCard'
import { parseUploadRequest } from '../lib/apiClient'
import { listCreditReportsForCurrentUser, type CreditReportSummary } from '../lib/creditReportQueries'
import { formatDateLabel, formatFileSize, formatReportBureauLabel } from '../lib/formatters'
import { isImageUploadMime } from '../lib/validators'
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
  const [reportSummaries, setReportSummaries] = useState<CreditReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [parsingId, setParsingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = requireSupabase()
    setLoading(true)
    setError('')
    const [uploadsResult, reportsResult] = await Promise.all([
      listUploadsForCurrentUser(supabase),
      listCreditReportsForCurrentUser(supabase),
    ])

    setLoading(false)
    if (uploadsResult.error) {
      setError('Could not load your credit report files.')
      return
    }
    setRows((uploadsResult.data ?? []) as UploadRecord[])
    setReportSummaries(reportsResult.data)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const summariesByUpload = useMemo(() => {
    const map = new Map<string, CreditReportSummary>()
    for (const summary of reportSummaries) {
      if (summary.upload_id) {
        const existing = map.get(summary.upload_id)
        if (!existing || existing.pulled_at < summary.pulled_at) {
          map.set(summary.upload_id, summary)
        }
      }
    }
    return map
  }, [reportSummaries])

  async function reparseUpload(upload: UploadRecord) {
    setActionError('')
    setParsingId(upload.id)
    try {
      await parseUploadRequest({ uploadId: upload.id })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not parse this report. Try again in a moment.')
    } finally {
      setParsingId(null)
    }
  }

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
      subheading="Upload phone screenshots, photos, or PDFs from your credit report. Parse any PDF or image to run tradeline extraction (OCR for screenshots)."
      userDisplayName={userDisplayName}
    >
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-t">Connect your credit report</div>
        <div className="card-s">
          Use screenshots from your phone, exports from a bureau app, or a downloaded PDF. Pick whichever is fastest.
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
              <span>Upload screenshots or a PDF</span>
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
              PNG, JPG, WebP, HEIC, or PDF — from any bureau site, MyFICO, Credit Karma, or annualcreditreport.com. We attach
              every file to your dispute. Use Parse or Re-parse on any row to extract tradelines (OCR for images).
            </div>
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button className="btn btn-gold" onClick={() => navigate('/disputes/new')} type="button">
                Start a dispute &amp; upload &rarr;
              </button>
            </div>
          </div>
          <BureauPullCard onPulled={() => void load()} />
        </div>
      </div>

      <div className="card">
        <div className="card-t">Uploaded reports</div>
        <div className="card-s">
          Stored privately in your account. Open or download any file. Images and PDFs you upload yourself are not pulled automatically from the bureaus by CreditClear.
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
          <div className="disc">
            No uploads yet. Start a dispute and add screenshots or PDFs on the upload step — they will appear here.
          </div>
        ) : (
          <div className="history-list">
            {rows.map((upload) => {
              const summary = summariesByUpload.get(upload.id)
              const isPdf = upload.mime_type === 'application/pdf'
              const isImage = isImageUploadMime(upload.mime_type)
              const canParse = isPdf || isImage
              return (
                <div className="history-card" key={upload.id}>
                  <div className="history-head">
                    <div>
                      <div className="history-title">{upload.file_name}</div>
                      <div className="history-sub">
                        {formatDateLabel(upload.created_at)} · {formatFileSize(upload.file_size)} ·{' '}
                        {formatReportBureauLabel(upload.report_bureau)}
                        {isImage ? ' · Image / screenshot' : ''}
                      </div>
                      {isImage ? (
                        <div className="history-sub" style={{ marginTop: 6, color: 'var(--muted)' }}>
                          Kept as your exhibit. Use Parse to run OCR and extract tradelines from this screenshot.
                        </div>
                      ) : null}
                      {canParse && (
                        <div
                          className="history-sub"
                          style={{ marginTop: 6, color: summary ? '#9ad8b8' : 'var(--muted)' }}
                        >
                          {summary
                            ? `Parsed: ${summary.tradeline_count} tradeline${
                                summary.tradeline_count === 1 ? '' : 's'
                              } · ${summary.inquiry_count} inquir${summary.inquiry_count === 1 ? 'y' : 'ies'} · ${summary.public_record_count} public record${
                                summary.public_record_count === 1 ? '' : 's'
                              } (${summary.bureau})`
                            : parsingId === upload.id
                              ? isImage
                                ? 'Running OCR and parsing…'
                                : 'Parsing report…'
                              : 'Not parsed yet — click "Re-parse" to try again.'}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button className="btn btn-ghost" onClick={() => void openSigned(upload)} type="button">
                        Open
                      </button>
                      <button className="btn btn-gold" onClick={() => void downloadSigned(upload)} type="button">
                        Download
                      </button>
                      {canParse && (
                        <button
                          className="btn btn-ghost"
                          disabled={parsingId === upload.id}
                          onClick={() => void reparseUpload(upload)}
                          type="button"
                          title={
                            isImage
                              ? 'Re-run OCR and the credit-report parser on this image.'
                              : 'Re-run the credit-report parser against this PDF.'
                          }
                        >
                          {parsingId === upload.id ? 'Parsing…' : summary ? 'Re-parse' : 'Parse'}
                        </button>
                      )}
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
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
