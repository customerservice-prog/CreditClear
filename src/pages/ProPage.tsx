import { ComingSoon } from '../components/ComingSoon'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { FEATURE_FLAGS } from '../lib/featureFlags'
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

        <div className="section" style={{ paddingTop: 0, maxWidth: 980, margin: '0 auto' }}>
          <ComingSoon feature={FEATURE_FLAGS.pro_dashboard} source="pro_page_hero" />
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
          </div>
          <div className="fcopy">© 2026 CreditClear AI — Educational and document assistance only.</div>
        </footer>
      </MarketingMain>
    </div>
  )
}
