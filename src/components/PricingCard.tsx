interface PricingCardProps {
  badge?: string
  buttonLabel: string
  loading?: boolean
  note: string
  onClick: () => void
  title?: string
}

export function PricingCard({
  badge = '✓ Most Popular',
  buttonLabel,
  loading,
  note,
  onClick,
  title = 'CreditClear Pro',
}: PricingCardProps) {
  return (
    <div className="price-card">
      <div className="price-badge">{badge}</div>
      <div className="price-name">{title}</div>
      <div className="price-amt">
        <sup>$</sup>49
      </div>
      <div className="price-per">per month · cancel anytime</div>
      <div className="price-div"></div>
      <div className="price-feats">
        <div className="pf">
          <span className="pf-ck">✓</span>
          <span>Unlimited dispute letters per month</span>
        </div>
        <div className="pf">
          <span className="pf-ck">✓</span>
          <span>All 12 dispute categories covered</span>
        </div>
        <div className="pf">
          <span className="pf-ck">✓</span>
          <span>All 3 bureaus — Equifax, Experian, TransUnion</span>
        </div>
        <div className="pf">
          <span className="pf-ck">✓</span>
          <span>Credit report upload &amp; optional attachments</span>
        </div>
        <div className="pf">
          <span className="pf-ck">✓</span>
          <span>Structured dispute drafts tailored to your selections</span>
        </div>
      </div>
      <button
        className="btn-xl"
        disabled={loading}
        onClick={onClick}
        style={{ justifyContent: 'center', width: '100%' }}
        type="button"
      >
        {loading ? 'Loading...' : buttonLabel}
      </button>
      <div className="price-note">{note}</div>
    </div>
  )
}
