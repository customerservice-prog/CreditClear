import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { ComingSoon } from '../components/ComingSoon'
import { DisputeIssueActionPanel } from '../components/DisputeIssueActionPanel'
import { IssueStepsLink } from '../components/IssueStepsLink'
import { TradelinePicker } from '../components/TradelinePicker'
import { WaitlistCard } from '../components/WaitlistCard'
import type { PickableTradeline } from '../hooks/useTradelines'
import { BUREAU_DISPLAY_LINES } from '../lib/bureauMail'
import {
  AGENCIES,
  BUREAU_LETTER_REQUIREMENTS_HINT,
  GENERATION_PHASES,
  ISSUES,
  LETTER_TYPE_OPTIONS,
  PILLS,
  STEPS,
  generationPhaseForMessage,
} from '../lib/constants'
import { FEATURE_FLAGS } from '../lib/featureFlags'
import { disputeLetterCount, formatDateLabel } from '../lib/formatters'
import { letterCardElementId } from '../lib/issueActionGuides'
import { getPersonalFieldErrors, isImageUploadMime } from '../lib/validators'
import type {
  AgencyId,
  AppInfo,
  AppState,
  AppTab,
  DisputeRecord,
  IssueAccountDetail,
  IssueAccountLine,
  IssueId,
  Letter,
  LetterType,
  ReportBureauTag,
} from '../types'

const EMPTY_ACCOUNT_LINE = (): IssueAccountLine => ({
  accountLast4: '',
  amountOrBalance: '',
  creditorName: '',
  disputeReason: '',
  reportedDate: '',
})

interface AppPageProps {
  appState: AppState
  /**
   * Reserved for when checkout reopens; while billing is paused these props are unused.
   * Kept on the interface so the call-site does not need to change shape.
   */
  billingLoading?: boolean
  billingMessage: string
  canAccessApp: boolean
  disputes: DisputeRecord[]
  disputesLoading: boolean
  /** True while a file is uploading and (when applicable) being parsed for tradelines. */
  filesUploading: boolean
  onAddFiles: (files: FileList | null) => void
  onAppTabChange: (tab: AppTab) => void
  onAdvanceFromPersonalStep: () => void
  /** Reserved for when checkout reopens; currently unused (see billingLoading). */
  onBeginCheckout?: () => void
  onDisputeTitleChange: (value: string) => void
  onDownloadAll: () => void
  onDownloadLetter: (letter: Letter) => void
  onDownloadLetterPdf: (letter: Letter) => void
  onFieldChange: <K extends keyof AppInfo>(field: K, value: AppInfo[K]) => void
  onIssueDetailChange: (issue: IssueId, patch: Partial<IssueAccountDetail>) => void
  onGoToStep: (step: number) => void
  onLoadDispute: (record: DisputeRecord) => void
  onRemoveFile: (index: number) => void
  onResetApp: () => void
  onSetFileReportBureau: (fileId: string, bureau: ReportBureauTag | null) => void
  onSetLetterType: (letterType: LetterType) => void
  onSetOpenLetter: (id: string | null) => void
  onSetSelectedAgencies: (agencies: AgencyId[]) => void
  onSetSelectedIssues: (issues: IssueId[]) => void
  onShowHome: () => void
  onSignOut: () => void
  onStartAnalysis: () => void
  onUpdateLetterText: (letterId: string, text: string) => void
  statusLabel: string
  tradelines: PickableTradeline[]
  tradelinesError: string
  tradelinesLoading: boolean
  userDisplayName: string
}

/** Personal step text inputs only (`includeDobInLetters` uses a separate checkbox). */
type AppInfoTextField = Exclude<keyof AppInfo, 'includeDobInLetters'>

const infoFieldMap: Array<{
  id: string
  field: AppInfoTextField
  label: string
  placeholder: string
  type?: string
  span?: boolean
  maxLength?: number
}> = [
  { id: 'fn', field: 'firstName', label: 'First Name *', placeholder: 'John' },
  { id: 'ln', field: 'lastName', label: 'Last Name *', placeholder: 'Smith' },
  { id: 'em', field: 'email', label: 'Email Address *', placeholder: 'john@email.com', span: true },
  { id: 'ph', field: 'phone', label: 'Phone Number', placeholder: '(555) 000-0000' },
  { id: 'zp', field: 'zip', label: 'ZIP Code', placeholder: '10001' },
  { id: 'ad', field: 'address', label: 'Street Address', placeholder: '123 Main Street', span: true },
  { id: 'ci', field: 'city', label: 'City', placeholder: 'New York' },
  { id: 'st', field: 'state', label: 'State', placeholder: 'NY' },
  { id: 'db', field: 'dob', label: 'Date of Birth', placeholder: '', type: 'date' },
  { id: 'ss', field: 'ssn', label: 'Last 4 of SSN', placeholder: 'XXXX', maxLength: 4 },
]

export function AppPage({
  appState,
  billingMessage,
  canAccessApp,
  disputes,
  disputesLoading,
  filesUploading,
  onAddFiles,
  onAdvanceFromPersonalStep,
  onAppTabChange,
  onDisputeTitleChange,
  onDownloadAll,
  onDownloadLetter,
  onDownloadLetterPdf,
  onFieldChange,
  onIssueDetailChange,
  onGoToStep,
  onLoadDispute,
  onRemoveFile,
  onResetApp,
  onSetFileReportBureau,
  onSetLetterType,
  onSetOpenLetter,
  onSetSelectedAgencies,
  onSetSelectedIssues,
  onShowHome,
  onSignOut,
  onStartAnalysis,
  onUpdateLetterText,
  statusLabel,
  tradelines,
  tradelinesError,
  tradelinesLoading,
  userDisplayName,
}: AppPageProps) {
  const [personalFieldErrors, setPersonalFieldErrors] = useState<Partial<Record<keyof AppInfo, string>>>({})
  const canContinueFromPersonal =
    Boolean(appState.info.firstName) &&
    Boolean(appState.info.lastName) &&
    Boolean(appState.info.email)
  const bureauOneLetterPerBureau =
    appState.letterType === 'bureau_initial' ||
    appState.letterType === 'mov' ||
    appState.letterType === 'cfpb'
  const letterCount = bureauOneLetterPerBureau
    ? Math.max(1, appState.agencies.length || 1)
    : appState.issues.length * (appState.agencies.length || 1)

  useEffect(() => {
    if (appState.step !== 0) {
      setPersonalFieldErrors({})
    }
  }, [appState.step])

  return (
    <div className="page active" id="page-app">
      <SkipToContent />
      <Navbar
        appTab={appState.tab}
        isApp
        onAppTabChange={onAppTabChange}
        onHomeClick={onShowHome}
        onSignOut={onSignOut}
        statusLabel={statusLabel}
        userDisplayName={userDisplayName}
      />
      <MarketingMain>
      <div className="app-wrap">
        <div className="app-hdr">
          <div className="app-badge">
            <div className="pulse-dot"></div> Dispute Workflow
          </div>
          <h1>
            Review Every <em>Reporting Issue</em>
            <br />
            With A Structured Workflow
          </h1>
          <p>Organize report concerns, upload supporting files, and generate editable draft dispute documents for your review.</p>
        </div>
        {canAccessApp && appState.tab === 'generator' ? (
          <div
            className="app-note"
            style={{
              background: 'rgba(234, 179, 8, 0.14)',
              border: '1px solid rgba(234, 179, 8, 0.5)',
              color: 'var(--txt2, #ddd)',
              marginBottom: 16,
            }}
          >
            <strong>Free preview — not for production mailing without your own legal review.</strong> Draft quality depends on
            tradeline details you enter for <em>each</em> selected category and on labeling each upload to the correct bureau.
            Round 1 bureau letters are combined into <strong>one letter per bureau</strong> listing every account you add below.
            Full auto-parsing from PDFs/screenshots is planned.
          </div>
        ) : null}
        {billingMessage ? <div className="app-note error">{billingMessage}</div> : null}

        {!canAccessApp ? (
          <div className="price-wrap">
            <WaitlistCard
              badge="✦ Subscription paused"
              title="Founders' waitlist"
              note={
                billingMessage ||
                "New subscriptions are paused while we rebuild billing for our no-advance-fee, bill-per-letter model. Join the founders' waitlist to lock in launch pricing."
              }
            />
          </div>
        ) : appState.tab === 'disputes' ? (
          <DisputesPanel
            disputes={disputes}
            disputesLoading={disputesLoading}
            onDownloadLetter={onDownloadLetter}
            onLoadDispute={onLoadDispute}
          />
        ) : appState.analyzing ? (
          (() => {
            const activePhaseId = generationPhaseForMessage(appState.streamMessage || '')
            const activeIndex = GENERATION_PHASES.findIndex((phase) => phase.id === activePhaseId)
            return (
              <div className="card">
                <div className="anim">
                  <div className="spin">
                    <div className="sr"></div>
                    <div className="sr"></div>
                    <div className="sr"></div>
                  </div>
                  <div className="anim-h">Building Your Dispute Letters</div>
                  <div className="anim-s">
                    {appState.streamMessage || 'Reviewing your selections and uploads.'}
                  </div>
                  <div className="a-steps">
                    {GENERATION_PHASES.map((phase, index) => (
                      <div
                        className={`a-step${
                          index < activeIndex ? '' : index === activeIndex ? ' current' : ' dim'
                        }`}
                        key={phase.id}
                      >
                        <span className="a-ico">{phase.icon}</span>
                        <span className="a-txt">{phase.label}</span>
                        {index < activeIndex ? <span className="a-ok">✓ Done</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()
        ) : (
          renderGeneratorStep({
            appState,
            canContinueFromPersonal,
            filesUploading,
            letterCount,
            onAddFiles,
            onAttemptContinuePersonal: () => {
              const nextErrors = getPersonalFieldErrors(appState.info)
              setPersonalFieldErrors(nextErrors)
              if (Object.keys(nextErrors).length > 0) {
                return
              }
              onAdvanceFromPersonalStep()
            },
            onDisputeTitleChange,
            onDownloadAll,
            onDownloadLetter,
            onDownloadLetterPdf,
            onGoToStep,
            onIssueDetailChange,
            onRemoveFile,
            onResetApp,
            onSetFileReportBureau,
            onSetLetterType,
            onSetOpenLetter,
            onSetSelectedAgencies,
            onSetSelectedIssues,
            onStartAnalysis,
            tradelines,
            tradelinesLoading,
            tradelinesError,
            onPersonalFieldChange: (field, value) => {
              setPersonalFieldErrors((previous) => {
                const next = { ...previous }
                delete next[field]
                return next
              })
              onFieldChange(field, value)
            },
            personalFieldErrors,
            onUpdateLetterText,
          })
        )}
      </div>
      </MarketingMain>
    </div>
  )
}

function DisputesPanel({
  disputes,
  disputesLoading,
  onDownloadLetter,
  onLoadDispute,
}: {
  disputes: DisputeRecord[]
  disputesLoading: boolean
  onDownloadLetter: (letter: Letter) => void
  onLoadDispute: (record: DisputeRecord) => void
}) {
  return (
    <div className="card">
      <div className="card-t">My Disputes</div>
      <div className="card-s">Every saved dispute session lives here so you can revisit and download previous letters any time.</div>
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
      ) : disputes.length === 0 ? (
        <div className="disc">
          No saved disputes yet. Generate your first dispute letter draft to build your history.
        </div>
      ) : (
        <div className="history-list">
          {disputes.map((record) => (
            <div className="history-card" key={record.id}>
              <div className="history-head">
                <div>
                  <div className="history-title">{record.title?.trim() || 'Untitled dispute'}</div>
                  <div className="history-sub">
                    {formatDateLabel(record.created_at)} · {disputeLetterCount(record)} letter
                    {disputeLetterCount(record) === 1 ? '' : 's'} · {record.bureau_targets.map((b) => b).join(', ')} ·{' '}
                    {record.issue_categories.length} issue{record.issue_categories.length === 1 ? '' : 's'}
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={() => onLoadDispute(record)} type="button">
                  Open in Generator
                </button>
              </div>
              <div className="history-letters">
                {(record.letters || []).map((letter) => (
                  <div className="history-letter" key={letter.id}>
                    <div>
                      <div className="l-title">
                        {letter.issueIcon} {letter.issueLabel}
                      </div>
                      <div className="l-sub">{letter.agencyName}</div>
                    </div>
                    <button
                      className="b-dl"
                      onClick={() => onDownloadLetter(letter as Letter)}
                      type="button"
                    >
                      ↓ Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function renderGeneratorStep({
  appState,
  canContinueFromPersonal,
  filesUploading,
  letterCount,
  onAddFiles,
  onAttemptContinuePersonal,
  onDisputeTitleChange,
  onDownloadAll,
  onDownloadLetter,
  onDownloadLetterPdf,
  onGoToStep,
  onIssueDetailChange,
  onRemoveFile,
  onResetApp,
  onSetFileReportBureau,
  onSetLetterType,
  onSetOpenLetter,
  onSetSelectedAgencies,
  onSetSelectedIssues,
  onStartAnalysis,
  onPersonalFieldChange,
  personalFieldErrors,
  onUpdateLetterText,
  tradelines,
  tradelinesLoading,
  tradelinesError,
}: {
  appState: AppState
  canContinueFromPersonal: boolean
  filesUploading: boolean
  letterCount: number
  tradelines: PickableTradeline[]
  tradelinesLoading: boolean
  tradelinesError: string
  onAddFiles: (files: FileList | null) => void
  onAttemptContinuePersonal: () => void
  onDisputeTitleChange: (value: string) => void
  onDownloadAll: () => void
  onDownloadLetter: (letter: Letter) => void
  onDownloadLetterPdf: (letter: Letter) => void
  onGoToStep: (step: number) => void
  onIssueDetailChange: (issue: IssueId, patch: Partial<IssueAccountDetail>) => void
  onRemoveFile: (index: number) => void
  onResetApp: () => void
  onSetFileReportBureau: (fileId: string, bureau: ReportBureauTag | null) => void
  onSetLetterType: (letterType: LetterType) => void
  onSetOpenLetter: (id: string | null) => void
  onSetSelectedAgencies: (agencies: AgencyId[]) => void
  onSetSelectedIssues: (issues: IssueId[]) => void
  onStartAnalysis: () => void
  onPersonalFieldChange: <K extends keyof AppInfo>(field: K, value: AppInfo[K]) => void
  personalFieldErrors: Partial<Record<keyof AppInfo, string>>
  onUpdateLetterText: (letterId: string, text: string) => void
}) {
  if (appState.step < 4) {
    return (
      <>
        <div className="progress" id="prog">
          {STEPS.map((step, index) => {
            const className = index < appState.step ? 'done' : index === appState.step ? 'active' : ''
            return (
              <div className={`si ${className}`.trim()} key={step}>
                <div className="sc">{index < appState.step ? '✓' : index + 1}</div>
                <div className="sl">{step}</div>
              </div>
            )
          })}
        </div>
        {renderWizardStep({
          appState,
          canContinueFromPersonal,
          filesUploading,
          letterCount,
          onAddFiles,
          onAttemptContinuePersonal,
          onDisputeTitleChange,
          onGoToStep,
          onIssueDetailChange,
          onPersonalFieldChange,
          personalFieldErrors,
          onRemoveFile,
          onSetFileReportBureau,
          onSetLetterType,
          onSetSelectedAgencies,
          onSetSelectedIssues,
          onStartAnalysis,
          tradelines,
          tradelinesLoading,
          tradelinesError,
        })}
      </>
    )
  }

  const letterWord = `dispute letter draft${appState.letters.length === 1 ? '' : 's'}`

  return (
    <div className="card">
      <div className="suc-badge">✓ Generation Complete</div>
      <div className="card-t">Your Dispute Letters Are Ready</div>
      <div className="card-s">
        Generated {appState.letters.length} {letterWord} tailored to your selected bureaus and dispute issues.
      </div>
      <div className="stats-mini">
        <div className="sm">
          <div className="smn">{appState.letters.length}</div>
          <div className="sml">Letters</div>
        </div>
        <a
          className="sm"
          href="#issue-action-guides"
          style={{ color: 'inherit', display: 'block', textDecoration: 'none' }}
          title="Jump to step-by-step guidance for each issue"
        >
          <div className="smn">{appState.issues.length}</div>
          <div className="sml">Issues — what to do</div>
        </a>
        <div className="sm">
          <div className="smn">{appState.agencies.length || 1}</div>
          <div className="sml">Bureaus</div>
        </div>
      </div>
      <DisputeIssueActionPanel
        id="issue-action-guides"
        issueDetails={appState.issueDetails}
        issueIds={appState.issues}
        lettersForNav={appState.letters.map((l) => ({
          id: l.id,
          issue: l.issue,
          agencyLabel: l.agencyName,
        }))}
      />
      {appState.letters.map((letter) => (
        <div
          className={`lc${appState.openLetter === letter.id ? ' open' : ''}`}
          id={letterCardElementId(letter.id)}
          key={letter.id}
          style={{ scrollMarginTop: 96 }}
        >
          <button
            className="lh"
            onClick={() => onSetOpenLetter(appState.openLetter === letter.id ? null : letter.id)}
            type="button"
          >
            <div className="lhl">
              <span className={`pill ${PILLS[letter.agency] || 'pgen'}`}>{letter.agencyName}</span>
              <div>
                <div className="l-title">
                  {letter.issueIcon} {letter.issueLabel}
                </div>
                <div className="l-sub">Dispute Letter Draft</div>
              </div>
            </div>
            <span className="l-chev">⌄</span>
          </button>
          <div className="l-body">
            <textarea
              className="l-editor"
              onChange={(event) => onUpdateLetterText(letter.id, event.target.value)}
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
              <button className="b-dl" onClick={() => onDownloadLetterPdf(letter)} type="button">
                ↓ Download PDF
              </button>
              <button className="b-copy" onClick={() => onDownloadLetter(letter)} type="button">
                ↓ Download .txt
              </button>
              <IssueStepsLink issueId={letter.issue} />
            </div>
          </div>
        </div>
      ))}
      <div className="disc">
        <strong style={{ color: 'var(--gold)' }}>Important Notice:</strong>{' '}
        These dispute drafts are assembled from your selections and any materials you upload, for you to edit. Review everything before mailing. CreditClear is not a law firm and does not provide legal advice.
      </div>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onResetApp} type="button">
          New Dispute
        </button>
        <button className="btn btn-gold" onClick={onDownloadAll} type="button">
          ↓ Download all as PDF
        </button>
      </div>

      <div className="card-t" style={{ marginTop: 28 }}>
        Mail your letters
      </div>
      <div className="card-s">
        Two ways to get your letters into the bureau&apos;s mail stream. Pick whichever fits your timeline.
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
            <span>Download &amp; mail yourself</span>
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
            Print your PDF letters and mail them USPS Certified Mail with Return Receipt. We recommend keeping copies of
            everything you send.
          </div>
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn btn-gold" onClick={onDownloadAll} type="button">
              ↓ Download all PDFs
            </button>
          </div>
        </div>
        <ComingSoon feature={FEATURE_FLAGS.certified_mail} source="wizard_step5_mail_tile" />
      </div>
    </div>
  )
}

function renderWizardStep({
  appState,
  canContinueFromPersonal,
  filesUploading,
  letterCount,
  onAddFiles,
  onAttemptContinuePersonal,
  onDisputeTitleChange,
  onGoToStep,
  onIssueDetailChange,
  onPersonalFieldChange,
  personalFieldErrors,
  onRemoveFile,
  onSetFileReportBureau,
  onSetLetterType,
  onSetSelectedAgencies,
  onSetSelectedIssues,
  onStartAnalysis,
  tradelines,
  tradelinesLoading,
  tradelinesError,
}: {
  appState: AppState
  canContinueFromPersonal: boolean
  filesUploading: boolean
  letterCount: number
  onAddFiles: (files: FileList | null) => void
  onAttemptContinuePersonal: () => void
  onDisputeTitleChange: (value: string) => void
  onGoToStep: (step: number) => void
  onIssueDetailChange: (issue: IssueId, patch: Partial<IssueAccountDetail>) => void
  onPersonalFieldChange: <K extends keyof AppInfo>(field: K, value: AppInfo[K]) => void
  personalFieldErrors: Partial<Record<keyof AppInfo, string>>
  onRemoveFile: (index: number) => void
  onSetFileReportBureau: (fileId: string, bureau: ReportBureauTag | null) => void
  onSetLetterType: (letterType: LetterType) => void
  onSetSelectedAgencies: (agencies: AgencyId[]) => void
  onSetSelectedIssues: (issues: IssueId[]) => void
  onStartAnalysis: () => void
  tradelines: PickableTradeline[]
  tradelinesLoading: boolean
  tradelinesError: string
}) {
  if (appState.step === 0) {
    return (
      <div className="card">
        <div className="card-t">Personal Information</div>
        <div className="card-s">
          Used only to personalize your dispute letters. Never shared or sold. Street, city, state, and ZIP are required before generating — they appear on each letter to the bureaus.
        </div>
        <div className="fg">
          <div className="f sp">
            <label htmlFor="dispute-title">Name this dispute</label>
            <input
              id="dispute-title"
              onChange={(event) => onDisputeTitleChange(event.target.value)}
              placeholder="e.g., Experian — duplicate & collections"
              type="text"
              value={appState.disputeTitle}
            />
            <div className="card-s" style={{ marginBottom: 0, marginTop: 4, fontSize: 12 }}>
              Shown in My Disputes so you can tell saved sessions apart. Leave blank for an automatic title from your selections.
            </div>
          </div>
          {infoFieldMap.map((field) => (
            <div className={`f${field.span ? ' sp' : ''}`} key={field.id}>
              <label htmlFor={field.id}>{field.label}</label>
              <input
                className={personalFieldErrors[field.field] ? 'input-err' : undefined}
                id={field.id}
                maxLength={field.maxLength}
                onChange={(event) => onPersonalFieldChange(field.field, event.target.value)}
                placeholder={field.placeholder}
                type={field.type ?? 'text'}
                value={appState.info[field.field]}
              />
              {personalFieldErrors[field.field] ? <div className="ferr">{personalFieldErrors[field.field]}</div> : null}
            </div>
          ))}
          <div className="f sp">
            <label style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
              <input
                checked={Boolean(appState.info.includeDobInLetters)}
                onChange={(event) => onPersonalFieldChange('includeDobInLetters', event.target.checked)}
                type="checkbox"
              />
              <span>Include date of birth on mailed letters (optional; off by default)</span>
            </label>
            <div className="card-s" style={{ fontSize: 12, marginBottom: 0, marginTop: 6 }}>
              Name and mailing address are always printed. Social Security numbers are never included in letter text.
            </div>
          </div>
        </div>
        <div className="btn-row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <button className="btn btn-gold" onClick={onAttemptContinuePersonal} type="button">
            Continue →
          </button>
          {!canContinueFromPersonal ? (
            <span className="btn-hint">Fill in first name, last name, and a valid email to continue.</span>
          ) : (
            <span className="btn-hint" style={{ opacity: 0.7 }}>
              Your details save to your CreditClear profile so you don&apos;t have to retype them next time.
            </span>
          )}
        </div>
      </div>
    )
  }

  if (appState.step === 1) {
    return (
      <div className="card">
        <div className="card-t">Select Credit Bureaus</div>
        <div className="card-s">Choose which bureaus to dispute with. Select all three for maximum coverage.</div>
        <div className="ag-g">
          {AGENCIES.map((agency) => {
            const selected = appState.agencies.includes(agency.id)
            return (
              <button
                className={`ac${selected ? ' sel' : ''}`}
                key={agency.id}
                onClick={() =>
                  onSetSelectedAgencies(
                    selected ? appState.agencies.filter((value) => value !== agency.id) : [...appState.agencies, agency.id],
                  )
                }
                type="button"
              >
                <div className="an">{agency.name}</div>
                <div className="asub">Credit Bureau</div>
                <div className="abus" style={{ fontSize: 10, color: 'var(--txt3)', lineHeight: 1.45, marginTop: 10 }}>
                  {BUREAU_DISPLAY_LINES[agency.id].map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
                <div className="ach">{selected ? '✓' : ''}</div>
              </button>
            )
          })}
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={() => onGoToStep(0)} type="button">
            ← Back
          </button>
          <button className="btn btn-gold" disabled={appState.agencies.length === 0} onClick={() => onGoToStep(2)} type="button">
            Continue →
          </button>
        </div>
      </div>
    )
  }

  if (appState.step === 2) {
    const allSelected = appState.issues.length === ISSUES.length
    return (
      <div className="card">
        <div className="card-t">Accounts &amp; items you&apos;re disputing</div>
        <div className="card-s">
          Pick the issue types that match what you see on your credit report. <strong>Upload a bureau PDF or screenshot below</strong> to extract accounts and pre-fill creditor fields automatically (same as the Upload step). You can still type details manually or add more files on the next step.
          Each combination of bureau × issue gets its own letter with distinct dispute language.
        </div>
        <label
          className="uz"
          style={{
            marginBottom: 14,
            opacity: filesUploading ? 0.65 : 1,
            pointerEvents: filesUploading ? 'none' : undefined,
          }}
        >
          <span className="ui-big">📂</span>
          <div className="ut">{filesUploading ? 'Uploading & parsing report…' : 'Upload credit report to auto-fill accounts'}</div>
          <div className="us">
            PDF or image (PNG, JPG, WebP, HEIC) — we read the file now so the list below fills in. Up to 10 MB per file.
          </div>
          <div className="utags">
            <span className="utag">PDF</span>
            <span className="utag">Screenshot</span>
            <span className="utag">Photo</span>
          </div>
          <input
            accept="image/*,.pdf"
            disabled={filesUploading}
            multiple
            onChange={(event) => {
              onAddFiles(event.target.files)
              event.target.value = ''
            }}
            style={{ display: 'none' }}
            type="file"
          />
        </label>
        {appState.files.length > 0 ? (
          <div className="card-s" style={{ marginTop: -6, marginBottom: 14, fontSize: 13 }}>
            {appState.files.length} file{appState.files.length === 1 ? '' : 's'} attached — label each for its bureau on the{' '}
            <button className="btn btn-ghost" onClick={() => onGoToStep(3)} style={{ padding: '2px 8px', fontSize: 13 }} type="button">
              Upload
            </button>{' '}
            step when you&apos;re ready.
          </div>
        ) : null}
        <TradelinePicker
          error={tradelinesError}
          issueDetails={appState.issueDetails}
          loading={tradelinesLoading}
          onAssignTradeline={(issue, detail) => {
            if (!appState.issues.includes(issue)) {
              onSetSelectedIssues([...appState.issues, issue])
            }
            onIssueDetailChange(issue, detail)
          }}
          selectedIssues={appState.issues}
          tradelines={tradelines}
        />
        <button className="sa-btn" onClick={() => onSetSelectedIssues(allSelected ? [] : ISSUES.map((item) => item.id))} type="button">
          {allSelected ? 'Deselect All' : 'Select All Issues'}
        </button>
        <div className="issue-acc">
          {ISSUES.map((issue) => {
            const selected = appState.issues.includes(issue.id)
            const detail = appState.issueDetails[issue.id] ?? {
              accountLast4: '',
              amountOrBalance: '',
              creditorName: '',
              disputeReason: '',
              reportedDate: '',
            }
            return (
              <div className={`issue-acc-row${selected ? ' open' : ''}`} key={issue.id}>
                <button
                  className={`ic ic-block${selected ? ' sel' : ''}`}
                  onClick={() =>
                    onSetSelectedIssues(
                      selected ? appState.issues.filter((value) => value !== issue.id) : [...appState.issues, issue.id],
                    )
                  }
                  type="button"
                >
                  <span className="ii">{issue.icon}</span>
                  <span className="il">{issue.label}</span>
                  <span className="ic-hint">{selected ? 'Details below · click to deselect' : 'Click to select — account form opens below'}</span>
                </button>
                {selected ? (
                  <div className="idetail">
                    <div className="card-s" style={{ marginBottom: 12, fontSize: 13 }}>
                      <strong>Required for bureau letters:</strong> at least one creditor (and ideally last four / balance) per
                      category you selected. Round 1 combines every category into one letter per bureau — each row you add
                      becomes a bullet in that letter.
                    </div>
                    <div className="fg">
                      <div className="f sp">
                        <label>Creditor / subscriber name</label>
                        <input
                          onChange={(e) => onIssueDetailChange(issue.id, { creditorName: e.target.value })}
                          placeholder="As shown on your report or screenshot"
                          value={detail.creditorName}
                        />
                      </div>
                      <div className="f">
                        <label>Account (last 4 or partial)</label>
                        <input
                          onChange={(e) => onIssueDetailChange(issue.id, { accountLast4: e.target.value })}
                          placeholder="4821"
                          value={detail.accountLast4}
                        />
                      </div>
                      <div className="f">
                        <label>Balance / amount (optional)</label>
                        <input
                          onChange={(e) => onIssueDetailChange(issue.id, { amountOrBalance: e.target.value })}
                          placeholder="$1,234"
                          value={detail.amountOrBalance}
                        />
                      </div>
                      <div className="f">
                        <label>Date / status as reported (optional)</label>
                        <input
                          onChange={(e) => onIssueDetailChange(issue.id, { reportedDate: e.target.value })}
                          placeholder="Mar 2024 / Open / Charged off"
                          value={detail.reportedDate}
                        />
                      </div>
                      <div className="f sp">
                        <label>Why are you disputing this?</label>
                        <textarea
                          onChange={(e) => onIssueDetailChange(issue.id, { disputeReason: e.target.value })}
                          placeholder="Brief explanation for the bureau"
                          rows={3}
                          value={detail.disputeReason}
                        />
                      </div>
                    </div>
                    <div className="card-s" style={{ marginTop: 16, marginBottom: 8, fontWeight: 600 }}>
                      Additional accounts in this category (optional)
                    </div>
                    {(detail.items ?? []).map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        style={{
                          borderLeft: '2px solid rgba(212, 175, 55, 0.45)',
                          marginBottom: 14,
                          paddingLeft: 12,
                        }}
                      >
                        <div className="fg">
                          <div className="f sp">
                            <label>Creditor / subscriber name</label>
                            <input
                              onChange={(e) => {
                                const next = (detail.items ?? []).map((row, i) =>
                                  i === itemIdx ? { ...row, creditorName: e.target.value } : row,
                                )
                                onIssueDetailChange(issue.id, { items: next })
                              }}
                              placeholder="As on your report"
                              value={item.creditorName}
                            />
                          </div>
                          <div className="f">
                            <label>Account (last 4)</label>
                            <input
                              onChange={(e) => {
                                const next = (detail.items ?? []).map((row, i) =>
                                  i === itemIdx ? { ...row, accountLast4: e.target.value } : row,
                                )
                                onIssueDetailChange(issue.id, { items: next })
                              }}
                              value={item.accountLast4}
                            />
                          </div>
                          <div className="f">
                            <label>Balance (optional)</label>
                            <input
                              onChange={(e) => {
                                const next = (detail.items ?? []).map((row, i) =>
                                  i === itemIdx ? { ...row, amountOrBalance: e.target.value } : row,
                                )
                                onIssueDetailChange(issue.id, { items: next })
                              }}
                              value={item.amountOrBalance}
                            />
                          </div>
                          <div className="f">
                            <label>Date / status (optional)</label>
                            <input
                              onChange={(e) => {
                                const next = (detail.items ?? []).map((row, i) =>
                                  i === itemIdx ? { ...row, reportedDate: e.target.value } : row,
                                )
                                onIssueDetailChange(issue.id, { items: next })
                              }}
                              value={item.reportedDate}
                            />
                          </div>
                          <div className="f sp">
                            <label>Dispute reason (optional)</label>
                            <textarea
                              onChange={(e) => {
                                const next = (detail.items ?? []).map((row, i) =>
                                  i === itemIdx ? { ...row, disputeReason: e.target.value } : row,
                                )
                                onIssueDetailChange(issue.id, { items: next })
                              }}
                              rows={2}
                              value={item.disputeReason}
                            />
                          </div>
                          <button
                            className="btn btn-ghost"
                            onClick={() => {
                              const next = (detail.items ?? []).filter((_, i) => i !== itemIdx)
                              onIssueDetailChange(issue.id, { items: next.length ? next : undefined })
                            }}
                            type="button"
                          >
                            Remove this account
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      className="btn btn-ghost"
                      onClick={() =>
                        onIssueDetailChange(issue.id, {
                          items: [...(detail.items ?? []), EMPTY_ACCOUNT_LINE()],
                        })
                      }
                      style={{ marginTop: 4 }}
                      type="button"
                    >
                      + Add another account in this category
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={() => onGoToStep(1)} type="button">
            ← Back
          </button>
          <button className="btn btn-gold" disabled={appState.issues.length === 0} onClick={() => onGoToStep(3)} type="button">
            Continue →
          </button>
        </div>
      </div>
    )
  }

  const bureauOneLetterPerBureau =
    appState.letterType === 'bureau_initial' ||
    appState.letterType === 'mov' ||
    appState.letterType === 'cfpb'

  return (
    <div className="card">
      <div className="card-t">Upload your credit report (screenshots or files)</div>
      {bureauOneLetterPerBureau ? (
        <div
          className="card-s"
          style={{
            background: 'rgba(234, 179, 8, 0.12)',
            border: '1px solid rgba(234, 179, 8, 0.35)',
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {BUREAU_LETTER_REQUIREMENTS_HINT}
        </div>
      ) : null}
      <div className="card-s">
        Bureau dispute letters require at least one file <strong>labeled</strong> for each bureau you chose (or one Combined file). You already entered account rows on the previous step — those become the bullets in each bureau letter.
        Label each upload for the bureau it belongs to (or Combined). If parsing says it could not detect a bureau, open{' '}
        <Link style={{ color: 'var(--gold)' }} to="/credit-reports">
          Credit Reports
        </Link>
        , choose the bureau under <strong>Bureau for parsing</strong>, then Parse or upload again. Downloadable PDFs let us extract tradelines; images stay in your dispute as exhibits.{' '}
        <Link style={{ color: 'var(--gold)' }} to="/credit-reports">
          View saved uploads
        </Link>
        .
      </div>
      <label className="uz" style={{ opacity: filesUploading ? 0.65 : 1, pointerEvents: filesUploading ? 'none' : undefined }}>
        <span className="ui-big">📂</span>
        <div className="ut">{filesUploading ? 'Uploading & parsing…' : 'Drop screenshots or PDFs here'}</div>
        <div className="us">
          Camera roll, screen capture, or bureau &quot;download PDF&quot; — all supported up to 10 MB per file.
        </div>
        <div className="utags">
          <span className="utag">Screenshot</span>
          <span className="utag">Photo</span>
          <span className="utag">PDF</span>
          <span className="utag">HEIC</span>
        </div>
        <input
          accept="image/*,.pdf"
          disabled={filesUploading}
          multiple
          onChange={(event) => {
            onAddFiles(event.target.files)
            event.target.value = ''
          }}
          style={{ display: 'none' }}
          type="file"
        />
      </label>
      <div className="ulist">
        {appState.files.map((file, index) => (
          <div className="frow frow-report" key={file.id ?? `${file.name}-${index}`}>
            <div className="frow-main">
              <span aria-hidden="true">{isImageUploadMime(file.type) ? '📷' : '📄'}</span>
              <span className="fn">{file.name}</span>
              <span className="fz">{formatSize(file.size)}</span>
              <button className="frm" onClick={() => onRemoveFile(index)} type="button">
                ✕
              </button>
            </div>
            {file.id ? (
              <label className="report-pick">
                <span className="rl">This file is my report for</span>
                <select
                  onChange={(event) => {
                    const value = event.target.value
                    onSetFileReportBureau(
                      file.id!,
                      value === '' ? null : (value as ReportBureauTag),
                    )
                  }}
                  value={file.report_bureau ?? ''}
                >
                  <option value="">Select bureau…</option>
                  {AGENCIES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                  <option value="combined">All three bureaus (one combined file)</option>
                </select>
              </label>
            ) : null}
          </div>
        ))}
      </div>
      <div
        className="card"
        style={{
          marginTop: 18,
          background: 'rgba(212, 175, 55, 0.06)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
        }}
      >
        <div className="card-t" style={{ marginBottom: 4 }}>
          Choose your letter type
        </div>
        <div className="card-s" style={{ marginBottom: 10 }}>
          {bureauOneLetterPerBureau ? (
            <>
              We&apos;ll draft <strong>{letterCount}</strong> {letterCount === 1 ? 'letter' : 'letters'} —{' '}
              <strong>one per bureau</strong>, each listing every disputed account from the categories you selected. Furnisher /
              validation letters still generate one per bureau × issue.
            </>
          ) : (
            <>
              We&apos;ll draft <strong>{letterCount}</strong> {letterCount === 1 ? 'letter' : 'letters'} — one per selected
              bureau and issue for this template type.
            </>
          )}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {LETTER_TYPE_OPTIONS.map((opt) => {
            const active = appState.letterType === opt.id
            return (
              <label
                key={opt.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: active ? '1px solid var(--gold, #d4af37)' : '1px solid rgba(255,255,255,0.08)',
                  background: active ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                }}
              >
                <input
                  checked={active}
                  name="letter-type"
                  onChange={() => onSetLetterType(opt.id)}
                  style={{ marginTop: 4 }}
                  type="radio"
                  value={opt.id}
                />
                <span style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontWeight: 600 }}>{opt.label}</span>
                  <span style={{ display: 'block', fontSize: 12, opacity: 0.75 }}>
                    <em>{opt.citation}</em> — {opt.blurb}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </div>
      <button className="btn-gen" onClick={onStartAnalysis} type="button">
        ⚡ Generate {letterCount} Dispute Letter{letterCount === 1 ? '' : 's'}
      </button>
      {appState.letterType !== 'bureau_initial' && appState.letterType !== 'mov' && appState.letterType !== 'cfpb' ? (
        <div className="skip-lnk">
          <button onClick={onStartAnalysis} type="button">
            Skip uploads — only if you already entered enough creditor / account detail on the issues step
          </button>
        </div>
      ) : null}
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={() => onGoToStep(2)} type="button">
          ← Back
        </button>
      </div>
    </div>
  )
}

function formatSize(size: number) {
  return size < 1048576 ? `${Math.round(size / 1024)}KB` : `${(size / 1048576).toFixed(1)}MB`
}
