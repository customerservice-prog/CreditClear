import { Link } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { useAuthContext } from '../context/useAuthContext'
import { useProRole } from '../hooks/useProRole'
import { SITE_URL } from '../lib/site'

interface ProPageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

const PLANNED_FEATURES = [
  {
    icon: '👥',
    title: 'Multi-client roster',
    body: 'Invite clients by email, organize them by stage, and see every active dispute at a glance.',
  },
  {
    icon: '⚡',
    title: 'Bulk letter generation',
    body: 'Run the same dispute strategy across dozens of clients in one pass — perfect for shared issues like a furnisher reporting error that hits a whole book of business.',
  },
  {
    icon: '📊',
    title: 'Per-client progress dashboards',
    body: 'See round status, removed items, score impact estimates, and outstanding follow-ups for every client.',
  },
  {
    icon: '💼',
    title: 'White-label letterhead',
    body: 'Your firm name, address, and signature block appear on every letter. Clients see your brand, not ours.',
  },
  {
    icon: '🧾',
    title: 'CROA-compliant billing',
    body: 'Bill clients only after letters are mailed (no advance fees). Built-in itemized contracts and 3-day cancellation notices.',
  },
  {
    icon: '🔐',
    title: 'Audit log & client consent',
    body: 'Every action your team takes on a client\u2019s file is logged with timestamp and operator id. Full export for compliance reviews.',
  },
]

export function ProPage({ onHome, onSignIn, onStartTrial }: ProPageProps) {
  const { authUser } = useAuthContext()
  const { role } = useProRole(authUser?.id ?? null)
  const isPro = role === 'pro' || role === 'admin'

  return (
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <div className="hero" style={{ maxWidth: 880, paddingBottom: 24, textAlign: 'center' }}>
          <div className="hero-badge">
            <div className="pulse-dot"></div> CreditClear for credit consultants
          </div>
          <h1>
            Run your <em>full client book</em> from one workspace
          </h1>
          <p className="hero-sub" style={{ margin: '0 auto', maxWidth: 720 }}>
            Solo credit consultants and small firms juggle dozens of disputes across dozens of clients. CreditClear Pro
            gives you a multi-client dashboard, bulk letter generation, white-label letterhead, and CROA-compliant billing
            in one place.
          </p>
        </div>

        <div className="section" style={{ paddingTop: 0, maxWidth: 720, margin: '0 auto' }}>
          {isPro ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-t">You&apos;re in the Pro tier</div>
              <p className="card-s" style={{ marginBottom: 12 }}>
                Open your roster to invite clients and manage their disputes.
              </p>
              <Link className="btn" to="/pro/dashboard">Open Pro dashboard</Link>
            </div>
          ) : authUser ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-t">Request Pro tier access</div>
              <p className="card-s" style={{ marginBottom: 12 }}>
                Pro is invite-only at launch so we can support every firm directly through onboarding. Email{' '}
                <a href="mailto:pro@creditclear.ai">pro@creditclear.ai</a> with your firm name and we&apos;ll
                provision your account.
              </p>
              <Link className="btn" to="/contact">Contact us</Link>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-t">Already a Pro user?</div>
              <p className="card-s" style={{ marginBottom: 12 }}>
                Sign in to open your client roster. New consultants — email{' '}
                <a href="mailto:pro@creditclear.ai">pro@creditclear.ai</a> to request access.
              </p>
              <button className="btn" onClick={onSignIn} type="button">Sign in</button>
            </div>
          )}
        </div>

        <div className="section" style={{ paddingTop: 8, maxWidth: 1080, margin: '0 auto' }}>
          <h2 className="sec-title" style={{ textAlign: 'center' }}>
            What ships in the <em>Pro tier</em>
          </h2>
          <div
            className="proc-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
              marginTop: 18,
            }}
          >
            {PLANNED_FEATURES.map((item) => (
              <div className="pc" key={item.title}>
                <span aria-hidden="true" className="pico emoji">
                  {item.icon}
                </span>
                <div className="ptitle">{item.title}</div>
                <div className="pdesc">{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section" style={{ paddingTop: 8, maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <p className="disc">
            Pro is invite-only at launch so we can support every firm directly through onboarding. Add yourself to the
            waitlist above and we&apos;ll reach out as cohorts open.
          </p>
        </div>

        <footer aria-label="Site footer" className="footer">
          <div className="fbrand">
            Credit<span>Clear</span> AI
          </div>
          <div className="flinks">
            <a href={`${SITE_URL}/privacy`}>Privacy</a>
            <a href={`${SITE_URL}/terms`}>Terms</a>
            <a href={`${SITE_URL}/disclaimer`}>Disclaimer</a>
            <a href={`${SITE_URL}/disclosures`}>Disclosures</a>
          </div>
          <div className="fcopy">© 2026 CreditClear AI — Educational and document assistance only.</div>
        </footer>
      </MarketingMain>
    </div>
  )
}
