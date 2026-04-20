import type { AppTab } from '../types'
import { AppShell } from '../components/layout/AppShell'
import { WaitlistCard } from '../components/WaitlistCard'
import { formatDateLabel } from '../lib/formatters'

interface BillingPageProps {
  appMessage?: string
  appTab?: AppTab
  billingLoading: boolean
  currentPeriodEnd?: string | null
  onAppTabChange?: (tab: AppTab) => void
  /**
   * Reserved for when checkout reopens; while billing is paused this prop is
   * unused. Kept on the interface so the call-site does not need to change.
   */
  onBeginCheckout?: () => void
  onManageBilling: () => void
  onShowHome: () => void
  onSignOut: () => void
  statusLabel: string
  trialEndsAt?: string | null
  userDisplayName: string
}

export function BillingPage({
  appMessage,
  appTab,
  billingLoading,
  currentPeriodEnd,
  onAppTabChange,
  onManageBilling,
  onShowHome,
  onSignOut,
  statusLabel,
  trialEndsAt,
  userDisplayName,
}: BillingPageProps) {
  return (
    <AppShell
      appTab={appTab}
      heading={
        <>
          Billing &amp; <em>Access</em>
        </>
      }
      message={appMessage}
      onAppTabChange={onAppTabChange}
      onHomeClick={onShowHome}
      onSignOut={onSignOut}
      statusLabel={statusLabel}
      subheading="If you have an active subscription, manage it here. New subscriptions are paused while we rebuild billing for our no-advance-fee model."
      userDisplayName={userDisplayName}
    >
      <div className="dash-grid">
        <div className="card">
          <div className="card-t">Current status</div>
          <div className="card-s">
            Status: <strong style={{ color: 'var(--gold)' }}>{statusLabel}</strong>
          </div>
          <div className="disc">
            Trial end: {formatDateLabel(trialEndsAt)}
            <br />
            Renewal / period end: {formatDateLabel(currentPeriodEnd)}
          </div>
          <div className="btn-row" style={{ justifyContent: 'flex-start' }}>
            <button className="btn btn-ghost" disabled={billingLoading} onClick={onManageBilling} type="button">
              Manage billing
            </button>
          </div>
          <div className="disc" style={{ marginTop: 12, opacity: 0.8 }}>
            Existing subscribers keep full access. The &quot;Manage billing&quot; button opens your secure Stripe portal
            where you can update your payment method, download invoices, or cancel.
          </div>
        </div>
        <div className="price-wrap">
          <WaitlistCard
            featureId="stripe_checkout"
            source="billing_page"
            badge="✦ Checkout paused"
            title="Founders' waitlist"
            note="We're rebuilding billing to a CROA-compliant, bill-per-letter model. New checkouts reopen as soon as that lands. Join the waitlist to be the first to know."
          />
        </div>
      </div>
    </AppShell>
  )
}
