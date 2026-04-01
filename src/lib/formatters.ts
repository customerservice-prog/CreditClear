import type { Letter } from '../types'

const ISSUE_LABELS: Record<string, string> = {
  late: 'Late Payments',
  coll: 'Collections',
  inq: 'Hard Inquiries',
  id: 'Identity Errors',
  dup: 'Duplicate Accounts',
  bal: 'Wrong Balances',
  bk: 'Bankruptcy',
  repo: 'Repossessions',
  jud: 'Judgments / Liens',
  cl: 'Closed Accounts',
  sl: 'Student Loans',
  med: 'Medical Debt',
}

export function formatFileSize(size: number) {
  return size < 1048576 ? `${Math.round(size / 1024)}KB` : `${(size / 1048576).toFixed(1)}MB`
}

export function formatDateLabel(value?: string | null) {
  if (!value) {
    return 'N/A'
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function buildLetterFileName(letter: Letter) {
  return `Dispute_${letter.agencyName}_${letter.issueLabel.replace(/[\s/]+/g, '_')}.txt`
}

export function formatAgencyName(value: string) {
  if (value === 'equifax') return 'Equifax'
  if (value === 'experian') return 'Experian'
  if (value === 'transunion') return 'TransUnion'
  return value
}

export function formatIssueLabel(value: string) {
  return ISSUE_LABELS[value] || value
}

export function formatDisputeStatusLabel(value?: string | null) {
  if (!value) {
    return 'Unknown'
  }

  if (value === 'draft_ready') {
    return 'Draft Ready'
  }

  if (value === 'draft') {
    return 'Draft'
  }

  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
