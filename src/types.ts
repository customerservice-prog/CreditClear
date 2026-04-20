export type AppTab = 'generator' | 'disputes'
export type AgencyId = 'equifax' | 'experian' | 'transunion'
export type IssueId =
  | 'late'
  | 'coll'
  | 'inq'
  | 'id'
  | 'dup'
  | 'bal'
  | 'bk'
  | 'repo'
  | 'jud'
  | 'cl'
  | 'sl'
  | 'med'

export interface Agency {
  id: AgencyId
  name: string
}

export interface Issue {
  id: IssueId
  label: string
  icon: string
}

/** Bureau-specific file, tri-merge, or unset (treated as applicable to any bureau until labeled). */
export type ReportBureauTag = AgencyId | 'combined'

export interface CreditFile {
  id?: string
  dispute_id?: string | null
  file_name?: string
  file_path?: string
  name: string
  size: number
  type: string
  base64?: string
  publicUrl?: string | null
  report_bureau?: ReportBureauTag | null
}

export interface Letter {
  id: string
  issue: IssueId
  issueLabel: string
  issueIcon: string
  agency: AgencyId | 'general'
  agencyName: string
  issueType?: string
  subject?: string
  text: string
}

export interface StoredLetter {
  id: string
  issue: string
  issueLabel: string
  issueIcon: string
  agency: string
  agencyName: string
  text: string
}

export interface AppInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  ssn: string
  dob: string
}

/** Per selected issue: tradeline details that populate dispute letters. */
export interface IssueAccountDetail {
  creditorName: string
  accountLast4: string
  amountOrBalance: string
  reportedDate: string
  disputeReason: string
}

export type IssueDetailsMap = Partial<Record<IssueId, IssueAccountDetail>>

export interface AppState {
  tab: AppTab
  step: number
  analyzing: boolean
  analysisStep: number
  streamMessage: string
  openLetter: string | null
  info: AppInfo
  /** Optional label shown in My Disputes; auto-generated on save if left blank. */
  disputeTitle: string
  agencies: AgencyId[]
  issues: IssueId[]
  /** Account-level details entered in Step 3 (per issue). */
  issueDetails: IssueDetailsMap
  files: CreditFile[]
  letters: Letter[]
  currentDisputeId?: string | null
  aiSummary?: string
  recommendations?: string[]
}

/** Profile JSON persisted for wizard prefill (keys mirror AppInfo). */
export type SavedContact = Partial<AppInfo>

export interface Profile {
  id: string
  email: string
  created_at: string
  full_name: string | null
  updated_at?: string
  saved_contact?: SavedContact
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string | null
  plan_name: string | null
  price_id: string | null
  current_period_end: string | null
  trial_ends_at: string | null
  created_at: string
  updated_at?: string
}

export interface AppUser {
  id: string
  email: string
  name: string | null
  created_at: string
  /** Saved wizard contact fields for prefill on return visits. */
  saved_contact?: SavedContact
  subscription_id?: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  subscription_price_id: string | null
  subscription_current_period_end: string | null
  trial_ends_at: string | null
}

export interface DisputeRecord {
  id: string
  user_id: string
  title: string
  status: string
  bureau_targets: string[]
  issue_categories: string[]
  /** Saved Step 3 issue account rows (optional). */
  issue_account_details?: IssueDetailsMap | null
  personal_info: AppInfo
  ai_summary: string | null
  created_at: string
  updated_at?: string
  /** Populated list queries via `letters(count)` embed; detail uses full `letters`. */
  letter_count?: number
  letters?: StoredLetter[]
  uploads?: UploadRecord[]
}

export interface UploadRecord {
  id: string
  user_id: string
  dispute_id: string | null
  file_path: string
  file_name: string
  mime_type: string
  file_size: number
  report_bureau?: string | null
  created_at: string
}

export interface DisputeDetail extends DisputeRecord {
  letters: StoredLetter[]
  uploads: UploadRecord[]
}

/**
 * Source-of-truth tag for how a credit_reports row entered the system.
 *  - 'upload'     : parsed from a user-uploaded PDF (PR 3)
 *  - 'aggregator' : pulled from a bureau-aggregator API (PR 4)
 *  - 'manual'     : hand-entered by the user (fallback path)
 */
export type CreditReportSource = 'upload' | 'aggregator' | 'manual'

export type InquiryType = 'hard' | 'soft' | 'unknown'

export type PublicRecordType =
  | 'bankruptcy'
  | 'judgment'
  | 'lien'
  | 'foreclosure'
  | 'civil_claim'
  | 'other'

/** One snapshot of one bureau report for one user. */
export interface CreditReportRow {
  id: string
  user_id: string
  dispute_id: string | null
  upload_id: string | null
  bureau: AgencyId
  source: CreditReportSource
  pulled_at: string
  report_date: string | null
  /** Full parsed JSON payload from parser/aggregator; source of truth for re-derivation. */
  raw: Record<string, unknown>
  created_at: string
  updated_at?: string
}

/** One account / tradeline as it appeared on a single bureau report. */
export interface TradelineRow {
  id: string
  report_id: string
  user_id: string
  creditor: string | null
  account_last4: string | null
  account_type: string | null
  account_status: string | null
  payment_status: string | null
  worst_delinquency: string | null
  balance_cents: number | null
  high_balance_cents: number | null
  credit_limit_cents: number | null
  past_due_cents: number | null
  monthly_payment_cents: number | null
  opened_on: string | null
  reported_on: string | null
  closed_on: string | null
  /** Bureau-provided 24-month payment grid; shape is bureau-specific. */
  payment_history: unknown[]
  raw: Record<string, unknown>
  created_at: string
}

export interface ReportInquiryRow {
  id: string
  report_id: string
  user_id: string
  inquirer: string | null
  inquiry_type: InquiryType | null
  inquired_on: string | null
  raw: Record<string, unknown>
  created_at: string
}

export interface ReportPublicRecordRow {
  id: string
  report_id: string
  user_id: string
  record_type: PublicRecordType | null
  court: string | null
  reference_number: string | null
  filed_on: string | null
  resolved_on: string | null
  amount_cents: number | null
  status: string | null
  raw: Record<string, unknown>
  created_at: string
}

/** Convenience shape returned by detail queries that embed children. */
export interface CreditReportDetail extends CreditReportRow {
  tradelines: TradelineRow[]
  inquiries: ReportInquiryRow[]
  public_records: ReportPublicRecordRow[]
}

export interface LetterStreamEvent {
  type: 'status' | 'letter' | 'complete' | 'error'
  message?: string
  letter?: Letter
  letters?: Letter[]
  summary?: string
  recommendations?: string[]
}
