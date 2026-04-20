import type { AgencyId, CreditFile } from '../types'
import { formatAgencyName } from './formatters'

/**
 * Every selected bureau must have at least one upload labeled for that bureau
 * or a single "Combined" file. Unlabeled uploads do not satisfy coverage.
 */
export function validateFileCoverageForAgencies(agencies: AgencyId[], files: CreditFile[]): string | null {
  if (files.length === 0) {
    return 'Upload at least one credit report file before generating letters.'
  }

  for (const ag of agencies) {
    const has = files.some((f) => {
      const b = f.report_bureau
      return b === 'combined' || b === ag
    })
    if (!has) {
      return `Label an upload as your ${formatAgencyName(ag)} report (or Combined if one file covers all bureaus). Each bureau you selected needs an explicitly labeled file.`
    }
  }
  return null
}
