import { ISSUES } from './constants'
import type { AgencyId, IssueId, Letter } from '../types'

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

export function formatReportBureauLabel(value?: string | null) {
  if (!value) {
    return 'Not labeled'
  }
  if (value === 'combined') {
    return 'All 3 bureaus (one file)'
  }
  return formatAgencyName(value)
}

const AGENCY_SHORT: Record<string, string> = {
  equifax: 'Equifax',
  experian: 'Experian',
  transunion: 'TransUnion',
}

/** Short title for My Disputes cards when the user did not name the dispute. */
export function buildAutoDisputeTitle(agencies: AgencyId[], issues: IssueId[]) {
  const bureauPart =
    agencies.length === 0
      ? 'Credit bureaus'
      : agencies.length === 3
        ? '3 Bureaus'
        : agencies.map((id) => AGENCY_SHORT[id] || id).join(' & ')
  const issueLabels = issues
    .map((id) => ISSUES.find((i) => i.id === id)?.label)
    .filter(Boolean) as string[]
  const issuePart =
    issueLabels.length === 0
      ? 'Dispute'
      : issueLabels.length <= 2
        ? issueLabels.join(' & ')
        : `${issueLabels.slice(0, 2).join(', ')} +${issueLabels.length - 2}`
  return `${bureauPart} · ${issues.length || 0} issues · ${issuePart}`
}

export function disputeLetterCount(record: { letter_count?: number; letters?: { length?: number } }) {
  if (typeof record.letter_count === 'number' && !Number.isNaN(record.letter_count)) {
    return record.letter_count
  }
  return record.letters?.length ?? 0
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
