import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { BureauPullCard } from '../components/BureauPullCard'
import { useAuthContext } from '../context/useAuthContext'
import { useUploads } from '../hooks/useUploads'
import { parseUploadRequest } from '../lib/apiClient'
import { listCreditReportsForCurrentUser, type CreditReportSummary } from '../lib/creditReportQueries'
import { formatDateLabel, formatFileSize, formatReportBureauLabel } from '../lib/formatters'
import { isImageUploadMime } from '../lib/validators'
import { requireSupabase } from '../lib/supabaseClient'
import { deleteUploadForCurrentUser, listUploadsForCurrentUser } from '../lib/uploadQueries'
import { AGENCIES } from '../lib/constants'
import type { AgencyId, AppTab, UploadRecord } from '../types'

function bureauTagForParseHint(value: string | null | undefined): AgencyId | undefined {
  if (!value) return undefined
  const v = value.toLowerCase()
  if (v === 'equifax' || v === 'experian' || v === 'transunion') return v
  return undefined
}

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
  const { authUser } = useAuthContext()
  const { uploadFiles, uploading: uploadBusy } = useUploads(authUser?.id)
  const [rows, setRows] = useState<UploadRecord[]>([])
  const [reportSummaries, setReportSummaries] = useState<CreditReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [parsingId, setParsingId] = useState<string | null>(null)
  const [parseBureauHint, setParseBureauHint] = useState<AgencyId | ''>('')

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
      const bureauHint = parseBureauHint || bureauTagForParseHint(upload.report_bureau)
      await parseUploadRequest({
        uploadId: upload.id,
        ...(bureauHint ? { bureauHint } : {}),
      })
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

  async function handleUploadReports(files: FileList | null) {
    setActionError('')
    try {
      await uploadFiles(files, null, {
        awaitParse: true,
        ...(parseBureauHint ? { bureauHint: parseBureauHint } : {}),
      })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Upload failed. Try again.')
    }
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
              PNG, JPG, WebP, HEIC, or PDF — from any bureau site, MyFICO, Credit Karma, or annualcreditreport.com. Upload
              here to store the file and <strong>parse tradelines immediately</strong> (OCR for images), same as in the dispute
              wizard. You can still tap Parse on any row later if needed.
            </div>
            <label
              className="uz"
              style={{
                marginTop: 12,
                opacity: uploadBusy ? 0.65 : 1,
                pointerEvents: uploadBusy ? 'none' : undefined,
              }}
            >
              <span className="ui-big">📂</span>
              <div className="ut">{uploadBusy ? 'Uploading & parsing…' : 'Choose files to upload & parse'}</div>
              <div className="us">Up to 10 MB per file. Results show in the list below when parsing finishes.</div>
              <input
                accept="image/*,.pdf"
                disabled={uploadBusy}
                multiple
                onChange={(event) => {
                  void handleUploadReports(event.target.files)
                  event.target.value = ''
                }}
                style={{ display: 'none' }}
                type="file"
              />
            </label>
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
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            marginTop: 12,
            marginBottom: 4,
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span style={{ opacity: 0.85 }}>Bureau for parsing</span>
            <select
              onChange={(event) => setParseBureauHint(event.target.value as AgencyId | '')}
              value={parseBureauHint}
            >
              <option value="">Auto-detect</option>
              {AGENCIES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <span style={{ fontSize: 12, opacity: 0.8, flex: '1 1 220px', lineHeight: 1.45 }}>
            If parsing says no bureau was detected, choose the source (e.g. Experian), then use <strong>Parse</strong> or upload again.
          </span>
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
            No uploads yet. Use <strong>Choose files</strong> in the card above, or add files while{' '}
            <button className="btn btn-ghost" onClick={() => navigate('/disputes/new')} type="button">
              starting a dispute
            </button>
            — everything shows up here.
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
