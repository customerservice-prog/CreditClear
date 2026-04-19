import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { PricingCard } from '../components/PricingCard'
import { AGENCIES, ANALYSIS_STEPS, ISSUES, PILLS, STEPS } from '../lib/constants'
import { disputeLetterCount, formatDateLabel } from '../lib/formatters'
import { getPersonalFieldErrors } from '../lib/validators'
import type { AgencyId, AppInfo, AppState, AppTab, DisputeRecord, IssueId, Letter, ReportBureauTag } from '../types'

interface AppPageProps {
  appState: AppState
  billingLoading: boolean
  billingMessage: string
  canAccessApp: boolean
  disputes: DisputeRecord[]
  disputesLoading: boolean
  onAddFiles: (files: FileList | null) => void
  onAppTabChange: (tab: AppTab) => void
  onAdvanceFromPersonalStep: () => void
  onBeginCheckout: () => void
  onDisputeTitleChange: (value: string) => void
  onDownloadAll: () => void
  onDownloadLetter: (letter: Letter) => void
  onFieldChange: <K extends keyof AppInfo>(field: K, value: AppInfo[K]) => void
  onGoToStep: (step: number) => void
  onLoadDispute: (record: DisputeRecord) => void
  onRemoveFile: (index: number) => void
  onResetApp: () => void
  onSetFileReportBureau: (fileId: string, bureau: ReportBureauTag | null) => void
  onSetOpenLetter: (id: string | null) => void
  onSetSelectedAgencies: (agencies: AgencyId[]) => void
  onSetSelectedIssues: (issues: IssueId[]) => void
  onShowHome: () => void
  onSignOut: () => void
  onStartAnalysis: () => void
  onUpdateLetterText: (letterId: string, text: string) => void
  statusLabel: string
  userDisplayName: string
}

const infoFieldMap: Array<{
  id: string
  field: keyof AppInfo
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
  billingLoading,
  billingMessage,
  canAccessApp,
  disputes,
  disputesLoading,
  onAddFiles,
  onAdvanceFromPersonalStep,
  onAppTabChange,
  onBeginCheckout,
  onDisputeTitleChange,
  onDownloadAll,
  onDownloadLetter,
  onFieldChange,
  onGoToStep,
  onLoadDispute,
  onRemoveFile,
  onResetApp,
  onSetFileReportBureau,
  onSetOpenLetter,
  onSetSelectedAgencies,
  onSetSelectedIssues,
  onShowHome,
  onSignOut,
  onStartAnalysis,
  onUpdateLetterText,
  statusLabel,
  userDisplayName,
}: AppPageProps) {
  const [personalFieldErrors, setPersonalFieldErrors] = useState<Partial<Record<keyof AppInfo, string>>>({})
  const canContinueFromPersonal =
    Boolean(appState.info.firstName) &&
    Boolean(appState.info.lastName) &&
    Boolean(appState.info.email)
  const letterCount = appState.issues.length * (appState.agencies.length || 1)

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
            <div className="pulse-dot"></div> Dispute Engine
          </div>
          <h1>
            Review Every <em>Reporting Issue</em>
            <br />
            With A Structured Workflow
          </h1>
          <p>Organize report concerns, upload supporting files, and generate editable draft dispute documents for your review.</p>
        </div>
        {billingMessage ? <div className="app-note error">{billingMessage}</div> : null}

        {!canAccessApp ? (
          <div className="price-wrap">
            <PricingCard
              badge="✓ Subscription Required"
              buttonLabel="Activate Pro Subscription →"
              loading={billingLoading}
              note={
                billingMessage ||
                'Your free trial has ended. Subscribe to CreditClear Pro to keep generating dispute letter drafts and access your saved disputes.'
              }
              onClick={onBeginCheckout}
              title="CreditClear Pro"
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
          <div className="card">
            <div className="anim">
              <div className="spin">
                <div className="sr"></div>
                <div className="sr"></div>
                <div className="sr"></div>
              </div>
              <div className="anim-h">Building Your Dispute Letters</div>
              <div className="anim-s">
                {appState.streamMessage || 'Reviewing your report and assembling dispute drafts bureau by bureau.'}
              </div>
              <div className="a-steps">
                {ANALYSIS_STEPS.map((step, index) => (
                  <div
                    className={`a-step${appState.analysisStep > index ? '' : appState.analysisStep === index ? ' current' : ' dim'}`}
                    key={step.txt}
                  >
                    <span className="a-ico">{step.icon}</span>
                    <span className="a-txt">{step.txt}</span>
                    {appState.analysisStep > index ? <span className="a-ok">✓ Done</span> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          renderGeneratorStep({
            appState,
            canContinueFromPersonal,
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
            onGoToStep,
            onRemoveFile,
            onResetApp,
            onSetFileReportBureau,
            onSetOpenLetter,
            onSetSelectedAgencies,
            onSetSelectedIssues,
            onStartAnalysis,
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
  letterCount,
  onAddFiles,
  onAttemptContinuePersonal,
  onDisputeTitleChange,
  onDownloadAll,
  onDownloadLetter,
  onGoToStep,
  onRemoveFile,
  onResetApp,
  onSetFileReportBureau,
  onSetOpenLetter,
  onSetSelectedAgencies,
  onSetSelectedIssues,
  onStartAnalysis,
  onPersonalFieldChange,
  personalFieldErrors,
  onUpdateLetterText,
}: {
  appState: AppState
  canContinueFromPersonal: boolean
  letterCount: number
  onAddFiles: (files: FileList | null) => void
  onAttemptContinuePersonal: () => void
  onDisputeTitleChange: (value: string) => void
  onDownloadAll: () => void
  onDownloadLetter: (letter: Letter) => void
  onGoToStep: (step: number) => void
  onRemoveFile: (index: number) => void
  onResetApp: () => void
  onSetFileReportBureau: (fileId: string, bureau: ReportBureauTag | null) => void
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
          letterCount,
          onAddFiles,
          onAttemptContinuePersonal,
          onDisputeTitleChange,
          onGoToStep,
          onPersonalFieldChange,
          personalFieldErrors,
          onRemoveFile,
          onSetFileReportBureau,
          onSetSelectedAgencies,
          onSetSelectedIssues,
          onStartAnalysis,
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
        <div className="sm">
          <div className="smn">{appState.issues.length}</div>
          <div className="sml">Issues</div>
        </div>
        <div className="sm">
          <div className="smn">{appState.agencies.length || 1}</div>
          <div className="sml">Bureaus</div>
        </div>
      </div>
      {appState.letters.map((letter) => (
        <div className={`lc${appState.openLetter === letter.id ? ' open' : ''}`} key={letter.id}>
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
              <button className="b-dl" onClick={() => onDownloadLetter(letter)} type="button">
                ↓ Download .txt
              </button>
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
          ↓ Download All
        </button>
      </div>
    </div>
  )
}

function renderWizardStep({
  appState,
  canContinueFromPersonal,
  letterCount,
  onAddFiles,
  onAttemptContinuePersonal,
  onDisputeTitleChange,
  onGoToStep,
  onPersonalFieldChange,
  personalFieldErrors,
  onRemoveFile,
  onSetFileReportBureau,
  onSetSelectedAgencies,
  onSetSelectedIssues,
  onStartAnalysis,
}: {
  appState: AppState
  canContinueFromPersonal: boolean
  letterCount: number
  onAddFiles: (files: FileList | null) => void
  onAttemptContinuePersonal: () => void
  onDisputeTitleChange: (value: string) => void
  onGoToStep: (step: number) => void
  onPersonalFieldChange: <K extends keyof AppInfo>(field: K, value: AppInfo[K]) => void
  personalFieldErrors: Partial<Record<keyof AppInfo, string>>
  onRemoveFile: (index: number) => void
  onSetFileReportBureau: (fileId: string, bureau: ReportBureauTag | null) => void
  onSetSelectedAgencies: (agencies: AgencyId[]) => void
  onSetSelectedIssues: (issues: IssueId[]) => void
  onStartAnalysis: () => void
}) {
  if (appState.step === 0) {
    return (
      <div className="card">
        <div className="card-t">Personal Information</div>
        <div className="card-s">Used only to personalize your dispute letters. Never shared or sold.</div>
        <div className="fg">
          <div className="f sp">
            <label htmlFor="dispute-title">Name this dispute (optional)</label>
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
        </div>
        <div className="btn-row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <button className="btn btn-gold" onClick={onAttemptContinuePersonal} type="button">
            Continue →
          </button>
          {!canContinueFromPersonal ? (
            <span className="btn-hint">Fill in first name, last name, and a valid email to continue.</span>
          ) : null}
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
        <div className="card-t">What&apos;s on Your Report?</div>
        <div className="card-s">
          Select every issue type — we&apos;ll create a targeted draft for each one.
        </div>
        <button className="sa-btn" onClick={() => onSetSelectedIssues(allSelected ? [] : ISSUES.map((item) => item.id))} type="button">
          {allSelected ? 'Deselect All' : 'Select All Issues'}
        </button>
        <div className="ig">
          {ISSUES.map((issue) => {
            const selected = appState.issues.includes(issue.id)
            return (
              <button
                className={`ic${selected ? ' sel' : ''}`}
                key={issue.id}
                onClick={() =>
                  onSetSelectedIssues(
                    selected ? appState.issues.filter((value) => value !== issue.id) : [...appState.issues, issue.id],
                  )
                }
                type="button"
              >
                <span className="ii">{issue.icon}</span>
                <span className="il">{issue.label}</span>
              </button>
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

  return (
    <div className="card">
      <div className="card-t">Upload Your Credit Report</div>
      <div className="card-s">
        Drag &amp; drop a PDF or screenshot to attach to your dispute (optional). For each file, choose which bureau it belongs to (or Combined for one tri-merge file) so letters reference the correct report.{' '}
        <Link style={{ color: 'var(--gold)' }} to="/credit-reports">
          View all your saved report uploads
        </Link>
        .
      </div>
      <label className="uz">
        <span className="ui-big">📂</span>
        <div className="ut">Drop Your Credit Report Here</div>
        <div className="us">Drag &amp; drop or click to browse · PDF, JPG, PNG, HEIC</div>
        <div className="utags">
          <span className="utag">PDF</span>
          <span className="utag">JPG</span>
          <span className="utag">PNG</span>
          <span className="utag">Screenshot</span>
        </div>
        <input accept="image/*,.pdf" multiple onChange={(event) => onAddFiles(event.target.files)} style={{ display: 'none' }} type="file" />
      </label>
      <div className="ulist">
        {appState.files.map((file, index) => (
          <div className="frow frow-report" key={file.id ?? `${file.name}-${index}`}>
            <div className="frow-main">
              <span>📄</span>
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
      <button className="btn-gen" onClick={onStartAnalysis} type="button">
        ⚡ Generate {letterCount} Dispute Letter{letterCount === 1 ? '' : 's'}
      </button>
      <div className="skip-lnk">
        <button onClick={onStartAnalysis} type="button">
          Skip upload — generate from my selections
        </button>
      </div>
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
