/**
 * Canonical mail-only consumer-dispute addresses for the three nationwide CRAs.
 * IMPORTANT: keep aligned with src/lib/bureauMail.ts (display copy on Step 2).
 * Confirm at each bureau's website before mailing — addresses do change.
 */
export const BUREAU_MAILING = {
  equifax: ['Equifax Information Services LLC', 'P.O. Box 740256', 'Atlanta, GA 30348'],
  experian: ['Experian', 'P.O. Box 4500', 'Allen, TX 75013'],
  transunion: ['TransUnion Consumer Solutions', 'P.O. Box 2000', 'Chester, PA 19022-2000'],
}

export function bureauMailingLines(agency) {
  return BUREAU_MAILING[agency] || []
}
