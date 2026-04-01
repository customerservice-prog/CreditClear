import type { AppTab } from '../types'
import { AppShell } from '../components/layout/AppShell'
import { PricingCard } from '../components/PricingCard'
import { formatDateLabel } from '../lib/formatters'

interface BillingPageProps {
  appMessage?: string
  appTab?: AppTab
  billingLoading: boolean
  currentPeriodEnd?: string | null
  onAppTabChange?: (tab: AppTab) => void
  onBeginCheckout: () => void
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
  onBeginCheckout,
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
      subheading="CreditClear Pro unlocks dispute-draft generation, saved sessions, and private file-backed workflows."
      userDisplayName={userDisplayName}
    >
      <div className="dash-grid">
        <div className="card">
          <div className="card-t">Current Status</div>
          <div className="card-s">Status: <strong style={{ color: 'var(--gold)' }}>{statusLabel}</strong></div>
          <div className="disc">
            Trial end: {formatDateLabel(trialEndsAt)}
            <br />
            Renewal / period end: {formatDateLabel(currentPeriodEnd)}
          </div>
          <div className="btn-row" style={{ justifyContent: 'flex-start' }}>
            <button className="btn btn-ghost" disabled={billingLoading} onClick={onManageBilling} type="button">
              Manage Billing
            </button>
          </div>
        </div>
        <div className="price-wrap">
          <PricingCard
            badge="✓ CreditClear Pro"
            buttonLabel="Continue to Checkout →"
            loading={billingLoading}
            note="Use Stripe Checkout to activate or renew your subscription. CreditClear provides drafting assistance and organization tools only, not legal advice."
            onClick={onBeginCheckout}
          />
        </div>
      </div>
    </AppShell>
  )
}
