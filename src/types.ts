export type AuthTab = 'login' | 'signup'
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

export interface AnalysisStep {
  icon: string
  txt: string
}

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

export interface AppState {
  tab: AppTab
  step: number
  analyzing: boolean
  analysisStep: number
  streamMessage: string
  openLetter: string | null
  info: AppInfo
  agencies: AgencyId[]
  issues: IssueId[]
  files: CreditFile[]
  letters: Letter[]
  currentDisputeId?: string | null
  aiSummary?: string
  recommendations?: string[]
}

export interface Profile {
  id: string
  email: string
  created_at: string
  full_name: string | null
  updated_at?: string
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
  personal_info: AppInfo
  ai_summary: string | null
  created_at: string
  updated_at?: string
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
  created_at: string
}

export interface DisputeDetail extends DisputeRecord {
  letters: StoredLetter[]
  uploads: UploadRecord[]
}

export interface LetterStreamEvent {
  type: 'status' | 'letter' | 'complete' | 'error'
  message?: string
  letter?: Letter
  letters?: Letter[]
  summary?: string
  recommendations?: string[]
}
