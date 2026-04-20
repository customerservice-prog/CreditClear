/**
 * Single source of truth for which product capabilities are live vs. coming-soon.
 * Components read from here so flipping a feature on means changing one line.
 *
 * Status semantics:
 *  - 'live'         the feature works end-to-end in production today
 *  - 'coming_soon'  scaffolded UI exists; the work is not implemented yet
 *  - 'disabled'     intentionally turned off (e.g. Stripe checkout during the rebuild)
 */
export type FeatureStatus = 'live' | 'coming_soon' | 'disabled'

export interface FeatureFlag {
  id: string
  label: string
  status: FeatureStatus
  /** Short user-facing description shown on Coming Soon cards. */
  description: string
  /** Honest event-based ETA. Empty string = no ETA shown. */
  eta: string
  /** Route that renders this feature (or its Coming Soon page). */
  route: string
  /** Optional homepage tile icon (emoji). */
  icon?: string
}

export const FEATURE_FLAGS = {
  upload_credit_report: {
    id: 'upload_credit_report',
    label: 'Upload your credit report',
    status: 'live',
    description: 'Drop in a PDF from any bureau, MyFICO, Credit Karma, or annualcreditreport.com.',
    eta: '',
    route: '/credit-reports',
    icon: '📄',
  },
  bureau_connect: {
    id: 'bureau_connect',
    label: 'One-click bureau connect',
    status: 'coming_soon',
    description: 'Pull all three bureaus through a single secure connection — no PDF needed.',
    eta: 'Launches with our bureau-data partner integration',
    route: '/credit-reports',
    icon: '🔌',
  },
  tradeline_editing: {
    id: 'tradeline_editing',
    label: 'Tradeline-level dispute editing',
    status: 'coming_soon',
    description:
      'Pick the exact accounts, inquiries, and public records you want to dispute, with per-item dispute reasons.',
    eta: 'Available to founding members',
    route: '/letter-types',
    icon: '🎯',
  },
  letter_types_six: {
    id: 'letter_types_six',
    label: '6 dispute letter types',
    status: 'live',
    description:
      'Bureau initial, MOV, furnisher §1681s-2(b), debt validation §1692g, goodwill, and CFPB complaint templates.',
    eta: '',
    route: '/letter-types',
    icon: '✉️',
  },
  certified_mail: {
    id: 'certified_mail',
    label: 'Certified mail tracking',
    status: 'coming_soon',
    description: "We'll mail your letters certified with USPS tracking so you have proof of delivery.",
    eta: 'Launches when our mailing partner is onboarded — first-100 pricing for waitlist members',
    route: '/settings',
    icon: '📬',
  },
  score_simulator: {
    id: 'score_simulator',
    label: 'Score impact simulator',
    status: 'coming_soon',
    description:
      'See an educational estimate of how a successful dispute could affect your utilization and account-age signals.',
    eta: 'Early access in Q3 2026',
    route: '/score-simulator',
    icon: '📈',
  },
  pro_dashboard: {
    id: 'pro_dashboard',
    label: 'Pro dashboard for credit consultants',
    status: 'coming_soon',
    description:
      'Manage your full client book — invite clients, run disputes for them, and bill from a single workspace.',
    eta: 'Invite-only beta opening Q3 2026',
    route: '/pro',
    icon: '👥',
  },
  round_tracking: {
    id: 'round_tracking',
    label: 'Round 1 dispute tracking',
    status: 'live',
    description: 'Track your initial bureau dispute round end-to-end.',
    eta: '',
    route: '/dashboard',
    icon: '🗂️',
  },
  round_tracking_2_4: {
    id: 'round_tracking_2_4',
    label: 'Rounds 2–4 (MOV, furnisher, CFPB)',
    status: 'coming_soon',
    description:
      'Automated 30-day follow-ups for method-of-verification, direct-to-furnisher, and CFPB-complaint letters.',
    eta: 'Unlocks 30 days after Round 1 is mailed',
    route: '/letter-types',
    icon: '🔁',
  },
  stripe_checkout: {
    id: 'stripe_checkout',
    label: 'Subscription checkout',
    status: 'disabled',
    description:
      "We're upgrading the product to a no-advance-fee, bill-per-letter model. Existing subscribers keep their access.",
    eta: 'New signups reopen when round-tracking + compliance are live',
    route: '/pricing',
    icon: '💳',
  },
} as const satisfies Record<string, FeatureFlag>

export type FeatureId = keyof typeof FEATURE_FLAGS

export function isLive(id: FeatureId): boolean {
  return FEATURE_FLAGS[id].status === 'live'
}

export function isComingSoon(id: FeatureId): boolean {
  return FEATURE_FLAGS[id].status === 'coming_soon'
}

export function isDisabled(id: FeatureId): boolean {
  return FEATURE_FLAGS[id].status === 'disabled'
}

export function statusBadgeLabel(status: FeatureStatus): string {
  if (status === 'live') return 'Live'
  if (status === 'coming_soon') return 'Coming Soon'
  return 'Paused'
}
