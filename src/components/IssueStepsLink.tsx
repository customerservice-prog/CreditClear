import {
  issueGuideElementId,
  isValidIssueId,
  openIssueGuideNavigation,
} from '../lib/issueActionGuides'
import type { IssueId } from '../types'

interface IssueStepsLinkProps {
  issueId: string
  className?: string
}

/**
 * Deep-links to the matching row in `DisputeIssueActionPanel` (same page):
 * expands the accordion and smooth-scrolls into view. Hidden if `issueId`
 * is not a known category.
 */
export function IssueStepsLink({ issueId, className = 'b-copy' }: IssueStepsLinkProps) {
  if (!isValidIssueId(issueId)) return null
  const id = issueId as IssueId
  return (
    <a
      className={className}
      href={`#${issueGuideElementId(id)}`}
      onClick={(event) => {
        event.preventDefault()
        openIssueGuideNavigation(id)
      }}
      title="Open step-by-step guidance for this dispute category"
    >
      View steps for this issue
    </a>
  )
}
