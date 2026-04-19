import type { AgencyId, CreditFile } from '../types'
import { formatAgencyName } from './formatters'

/**
 * Ensures every selected bureau has at least one upload that could apply:
 * unlabeled, Combined, or matching bureau tag.
 */
export function validateFileCoverageForAgencies(agencies: AgencyId[], files: CreditFile[]): string | null {
  if (files.length === 0) {
    return null
  }

  for (const ag of agencies) {
    const has = files.some((f) => {
      const b = f.report_bureau
      return b == null || b === 'combined' || b === ag
    })
    if (!has) {
      return `Label an upload as your ${formatAgencyName(ag)} report (or Combined for one tri-merge file). Every selected bureau needs a matching file.`
    }
  }
  return null
}
