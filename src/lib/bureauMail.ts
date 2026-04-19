import type { AgencyId } from '../types'

/** Official mail-in dispute addresses (confirm on bureau sites). Shown on Step 2. */
export const BUREAU_DISPLAY_LINES: Record<AgencyId, readonly [string, string, string]> = {
  equifax: [
    'Equifax Information Services LLC',
    'P.O. Box 740256, Atlanta, GA 30348',
    'Mail-in consumer disputes',
  ],
  experian: ['Experian', 'P.O. Box 4500, Allen, TX 75013', 'Mail-in consumer disputes'],
  transunion: ['TransUnion Consumer Solutions', 'P.O. Box 2000, Chester, PA 19022-2000', 'Mail-in consumer disputes'],
}
