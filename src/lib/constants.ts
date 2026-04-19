import type { Agency, AnalysisStep, AppState, Issue } from '../types'

export const STEPS = ['Personal Info', 'Agencies', 'Issues', 'Upload', 'Letters']

export const AGENCIES: Agency[] = [
  { id: 'equifax', name: 'Equifax' },
  { id: 'experian', name: 'Experian' },
  { id: 'transunion', name: 'TransUnion' },
]

export const ISSUES: Issue[] = [
  { id: 'late', label: 'Late Payments', icon: '⏰' },
  { id: 'coll', label: 'Collections', icon: '📋' },
  { id: 'inq', label: 'Hard Inquiries', icon: '🔍' },
  { id: 'id', label: 'Identity Errors', icon: '👤' },
  { id: 'dup', label: 'Duplicate Accounts', icon: '📂' },
  { id: 'bal', label: 'Wrong Balances', icon: '💰' },
  { id: 'bk', label: 'Bankruptcy', icon: '⚖️' },
  { id: 'repo', label: 'Repossessions', icon: '🚗' },
  { id: 'jud', label: 'Judgments / Liens', icon: '🔨' },
  { id: 'cl', label: 'Closed Accounts', icon: '🔒' },
  { id: 'sl', label: 'Student Loans', icon: '🎓' },
  { id: 'med', label: 'Medical Debt', icon: '🏥' },
]

export const ANALYSIS_STEPS: AnalysisStep[] = [
  { icon: '🔍', txt: 'Scanning credit report for negative items...' },
  { icon: '⚖️', txt: 'Identifying FCRA & FDCPA violation grounds...' },
  { icon: '📊', txt: 'Analyzing account histories & discrepancies...' },
  { icon: '✍️', txt: 'Drafting legally-grounded dispute letters...' },
  { icon: '✅', txt: 'Finalizing & optimizing letter effectiveness...' },
]

export const PILLS: Record<string, string> = {
  equifax: 'peq',
  experian: 'pex',
  transunion: 'ptu',
  general: 'pgen',
}

export const GENERATOR_TABS = [
  { id: 'generator', label: 'Dispute Engine' },
  { id: 'disputes', label: 'My Disputes' },
] as const

export function createInitialState(): AppState {
  return {
    tab: 'generator',
    step: 0,
    analyzing: false,
    analysisStep: 0,
    streamMessage: '',
    openLetter: null,
    info: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      ssn: '',
      dob: '',
    },
    agencies: [],
    issues: [],
    files: [],
    letters: [],
    disputeTitle: '',
  }
}
