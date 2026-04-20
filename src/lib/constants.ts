import type { Agency, AppState, Issue, LetterType } from '../types'

export const STEPS = ['Personal Info', 'Agencies', "Accounts & items you're disputing", 'Upload', 'Letters']

/** Six dispute letter templates the user can choose from on Step 4. */
export const LETTER_TYPE_OPTIONS: Array<{
  id: LetterType
  label: string
  citation: string
  blurb: string
}> = [
  {
    id: 'bureau_initial',
    label: 'Bureau initial dispute (Round 1)',
    citation: 'FCRA §611',
    blurb: 'Mailed to the credit bureau requesting a reasonable reinvestigation. Start here.',
  },
  {
    id: 'mov',
    label: 'Method-of-verification (Round 2)',
    citation: 'FCRA §611(a)(7)',
    blurb: 'Use after a bureau "verified" an item — forces them to disclose how they verified.',
  },
  {
    id: 'furnisher',
    label: 'Furnisher direct dispute (Round 3)',
    citation: 'FCRA §1681s-2(b)',
    blurb: 'Mailed to the original creditor or collector — replace the [Furnisher] block with the company\'s consumer-disputes address before sending.',
  },
  {
    id: 'validation',
    label: 'Debt validation',
    citation: 'FDCPA §1692g',
    blurb: 'Sent to a collection agency within 30 days of first contact to validate the debt.',
  },
  {
    id: 'goodwill',
    label: 'Goodwill request',
    citation: 'Courtesy — no statute',
    blurb: 'For technically-accurate late items where you have an otherwise good history with the creditor.',
  },
  {
    id: 'cfpb',
    label: 'CFPB complaint draft (Round 4)',
    citation: 'consumerfinance.gov/complaint',
    blurb: 'Generates the text to paste into the CFPB online portal. Use after rounds 1-3 stall.',
  },
]

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

// Real backend phases of letter generation, in execution order. The wizard highlights
// whichever phase is currently active based on SSE status messages from the server.
// Nothing here is cosmetic — every label maps to a real server-side step.
export const GENERATION_PHASES = [
  { id: 'scan', icon: '📥', label: 'Reviewing your uploads and selections' },
  { id: 'read', icon: '📑', label: 'Reading text from your credit-report files' },
  { id: 'draft', icon: '✍️', label: 'Drafting your dispute letters' },
  { id: 'finalize', icon: '📦', label: 'Finalizing letters for download' },
] as const

export type GenerationPhaseId = (typeof GENERATION_PHASES)[number]['id']

/**
 * Map the freeform server status message to one of the generation phases above.
 * Strings come from api/generate-letters.js sendEvent({ type: 'status', message }).
 */
export function generationPhaseForMessage(message: string): GenerationPhaseId {
  const lower = message.toLowerCase()
  if (lower.startsWith('reading') || lower.includes('report pdf')) return 'read'
  if (lower.includes('drafting')) return 'draft'
  if (lower.includes('finalizing') || lower.includes('generated')) return 'finalize'
  return 'scan'
}

export const PILLS: Record<string, string> = {
  equifax: 'peq',
  experian: 'pex',
  transunion: 'ptu',
  general: 'pgen',
}

export const GENERATOR_TABS = [
  { id: 'generator', label: 'Dispute Workflow' },
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
    letterType: 'bureau_initial',
    disputeTitle: '',
    issueDetails: {},
  }
}
