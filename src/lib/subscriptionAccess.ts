import type { AppUser } from '../types'
import { emailHasOwnerComplimentaryAccess } from './ownerAccess'

export function getSubscriptionAccess(user: AppUser | null, now = Date.now()) {
  if (user && emailHasOwnerComplimentaryAccess(user.email)) {
    return {
      canAccessApp: true,
      currentPeriodEnd: user.subscription_current_period_end
        ? new Date(user.subscription_current_period_end).getTime()
        : null,
      hasPaidAccess: true,
      hasTrialAccess: false,
      needsCheckout: false,
      statusLabel: 'Complimentary access',
      trialDaysLeft: 0,
    }
  }

  const status = user?.subscription_status ?? null
  const trialEndsAt = user?.trial_ends_at ? new Date(user.trial_ends_at).getTime() : null
  const currentPeriodEnd = user?.subscription_current_period_end
    ? new Date(user.subscription_current_period_end).getTime()
    : null

  const hasPaidAccess = status === 'active'
  const hasTrialAccess = status === 'trialing' && Boolean(trialEndsAt && trialEndsAt > now)
  const canAccessApp = hasPaidAccess || hasTrialAccess
  const trialDaysLeft = hasTrialAccess && trialEndsAt ? Math.ceil((trialEndsAt - now) / 86400000) : 0

  let statusLabel = 'Expired'
  if (hasPaidAccess) {
    statusLabel = 'Pro Active'
  } else if (hasTrialAccess) {
    statusLabel = `Trial: ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left`
  } else if (status === 'past_due') {
    statusLabel = 'Past Due'
  } else if (status === 'canceled') {
    statusLabel = 'Canceled'
  }

  return {
    canAccessApp,
    currentPeriodEnd,
    hasPaidAccess,
    hasTrialAccess,
    needsCheckout: !hasTrialAccess && !hasPaidAccess,
    statusLabel,
    trialDaysLeft,
  }
}
