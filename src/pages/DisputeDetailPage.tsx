import { useEffect, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { DisputeRoundsPanel } from '../components/DisputeRoundsPanel'
import { ComingSoon } from '../components/ComingSoon'
import { useMailings, formatPostage, type MailingRow } from '../hooks/useMailings'
import { getBillingStatus, mailLetterRequest } from '../lib/apiClient'
import { FEATURE_FLAGS } from '../lib/featureFlags'
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
            <DisputeLetters
              detail={detail}
              onDownloadLetter={onDownloadLetter}
              onOpenInGenerator={onOpenInGenerator}
              onSaveLetterEdit={onSaveLetterEdit}
            />

            <DisputeRoundsPanel disputeId={detail.id} userId={userId ?? null} />
          </>
        )}
      </div>
    </AppShell>
  )
}

interface DisputeLettersProps {
  detail: DisputeDetail
  onDownloadLetter: (text: string, fileName: string) => void
  onOpenInGenerator?: () => void
  onSaveLetterEdit: (letterId: string, text: string) => void
}

function DisputeLetters({ detail, onDownloadLetter, onOpenInGenerator, onSaveLetterEdit }: DisputeLettersProps) {
  const { mailings, reload: reloadMailings, error: mailingsError } = useMailings(detail.id)
  const [mailOpen, setMailOpen] = useState<boolean | null>(null)
  const [mailingBusy, setMailingBusy] = useState<string | null>(null)
  const [mailError, setMailError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const status = await getBillingStatus()
        if (!cancelled) setMailOpen(status.mail_open)
      } catch {
        if (!cancelled) setMailOpen(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const mailingByLetter = new Map<string, MailingRow>()
  for (const m of mailings) {
    if (m.letter_id) mailingByLetter.set(m.letter_id, m)
  }

  async function handleMail(letterId: string) {
    setMailingBusy(letterId)
    setMailError('')
    try {
      await mailLetterRequest({ letterId })
      await reloadMailings()
    } catch (err) {
      setMailError(err instanceof Error ? err.message : 'Could not mail this letter.')
    } finally {
      setMailingBusy(null)
    }
  }

  const allBureauLetters = detail.letters.filter(
    (l) => l.agency === 'equifax' || l.agency === 'experian' || l.agency === 'transunion',
  )
  const showMailFallback = mailOpen === false && allBureauLetters.length > 0

  return (
    <>
      {mailingsError ? <div className="ferr" style={{ marginTop: 8 }}>{mailingsError}</div> : null}
      {mailError ? <div className="ferr" style={{ marginTop: 8 }}>{mailError}</div> : null}
      {detail.letters.map((letter) => {
        const mailing = mailingByLetter.get(letter.id)
        const isMailableBureau = letter.agency === 'equifax' || letter.agency === 'experian' || letter.agency === 'transunion'
        return (
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
                {isMailableBureau && mailOpen === true && !mailing ? (
                  <button
                    className="b-dl"
                    disabled={mailingBusy === letter.id}
                    onClick={() => void handleMail(letter.id)}
                    type="button"
                    title="Send via certified mail with USPS tracking."
                  >
                    {mailingBusy === letter.id ? '✉ Mailing…' : '✉ Mail certified'}
                  </button>
                ) : null}
              </div>
              {mailing ? (
                <div
                  className="disc"
                  style={{
                    marginTop: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(48, 200, 120, 0.4)',
                    background: 'rgba(48, 200, 120, 0.08)',
                    color: '#9ad8b8',
                  }}
                >
                  Mailed certified via {mailing.carrier?.toUpperCase() || 'USPS'} ·{' '}
                  Tracking <code>{mailing.tracking_number}</code> · Postage{' '}
                  {formatPostage(mailing.postage_cents)}
                  {mailing.mailed_at ? ` · Sent ${formatDateLabel(mailing.mailed_at)}` : ''}
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
      <div className="btn-row">
        <button className="btn btn-gold" onClick={onOpenInGenerator} type="button">
          Open In Generator
        </button>
      </div>
      {showMailFallback ? (
        <div style={{ marginTop: 14 }}>
          <ComingSoon
            feature={FEATURE_FLAGS.certified_mail}
            source="dispute_detail_letter_mail"
            headline="Mail your dispute letters certified, in one click"
            ctaLabel="Notify me when in-app mailing launches"
          />
        </div>
      ) : null}
    </>
  )
}
