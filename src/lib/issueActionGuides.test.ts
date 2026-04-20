import { describe, expect, it } from 'vitest'
import { getIssueActionGuide, isValidIssueId } from './issueActionGuides'
import type { IssueId } from '../types'

const ALL: IssueId[] = [
  'late',
  'coll',
  'inq',
  'id',
  'dup',
  'bal',
  'bk',
  'repo',
  'jud',
  'cl',
  'sl',
  'med',
]

describe('issueActionGuides', () => {
  it('has a non-empty guide for every IssueId', () => {
    for (const id of ALL) {
      const g = getIssueActionGuide(id)
      expect(g.issueId).toBe(id)
      expect(g.headline.length).toBeGreaterThan(3)
      expect(g.summary.length).toBeGreaterThan(20)
      expect(g.steps.length).toBeGreaterThanOrEqual(3)
      expect(g.letterRoundHint.length).toBeGreaterThan(10)
    }
  })

  it('isValidIssueId rejects unknown strings', () => {
    expect(isValidIssueId('late')).toBe(true)
    expect(isValidIssueId('not_an_issue')).toBe(false)
  })
})
