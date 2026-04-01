export function NotFoundPage({ onHome }: { onHome: () => void }) {
  return (
    <div className="page active">
      <div className="hero">
        <div className="hero-badge"><div className="pulse-dot"></div> Page Not Found</div>
        <h1>
          This page could not be <em>found</em>
        </h1>
        <p className="hero-sub">Return to the CreditClear home page to continue exploring the platform.</p>
        <button className="btn-xl" onClick={onHome} type="button">
          Return Home
        </button>
      </div>
    </div>
  )
}
