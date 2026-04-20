import { ComingSoon } from '../components/ComingSoon'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { FEATURE_FLAGS, statusBadgeLabel, type FeatureStatus } from '../lib/featureFlags'
import { SITE_URL } from '../lib/site'

interface LetterTypesPageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

interface LetterRow {
  id: string
  title: string
  citation: string
  status: FeatureStatus
  description: string
  eta?: string
}

const LETTERS: LetterRow[] = [
  {
    id: 'bureau_initial',
    title: 'Bureau initial dispute',
    citation: 'FCRA §611 · 15 U.S.C. §1681i',
    status: 'live',
    description:
      "Round 1 letter sent directly to Equifax, Experian, or TransUnion requesting reinvestigation of a tradeline, inquiry, or public record. The bureau has 30 days to respond.",
  },
  {
    id: 'mov',
    title: 'Method of verification (MOV)',
    citation: 'FCRA §611(a)(7)',
    status: 'coming_soon',
    description:
      'Round 2 letter sent after a bureau "verifies" an item. Forces the bureau to disclose how they verified — what they actually contacted and what method they used. Often produces deletion when the bureau cannot answer.',
    eta: 'Available to founding members',
  },
  {
    id: 'furnisher',
    title: 'Furnisher direct dispute',
    citation: 'FCRA §1681s-2(b)',
    status: 'coming_soon',
    description:
      'Round 3 letter sent directly to the data furnisher (the original creditor or collector). Triggers a separate investigation duty under §1681s-2(b) and is often more effective than going through the bureau again.',
    eta: 'Available to founding members',
  },
  {
    id: 'validation',
    title: 'Debt validation',
    citation: 'FDCPA §809 · 15 U.S.C. §1692g',
    status: 'coming_soon',
    description:
      'Sent to a collection agency within 30 days of first contact. The collector must validate the debt (amount, original creditor, right to collect) before continuing collection activity.',
    eta: 'Available to founding members',
  },
  {
    id: 'goodwill',
    title: 'Goodwill request',
    citation: 'No statute — courtesy request',
    status: 'coming_soon',
    description:
      'Sent to the original creditor when a late payment is technically accurate but contextually disputable (illness, system error, isolated incident). Asks for a courtesy removal.',
    eta: 'Available to founding members',
  },
  {
    id: 'cfpb',
    title: 'CFPB complaint template',
    citation: 'consumerfinance.gov/complaint',
    status: 'coming_soon',
    description:
      'Round 4 escalation. We generate the complaint text; you submit it on the CFPB portal. Often the fastest way to get a stuck dispute moving.',
    eta: 'Available to founding members',
  },
]

function StatusBadge({ status }: { status: FeatureStatus }) {
  const isLive = status === 'live'
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: 999,
        background: isLive ? 'rgba(48, 200, 120, 0.15)' : 'rgba(212, 175, 55, 0.15)',
        color: isLive ? '#30c878' : 'var(--gold, #d4af37)',
        border: `1px solid ${isLive ? 'rgba(48, 200, 120, 0.4)' : 'rgba(212, 175, 55, 0.4)'}`,
      }}
    >
      {statusBadgeLabel(status)}
    </span>
  )
}

export function LetterTypesPage({ onHome, onSignIn, onStartTrial }: LetterTypesPageProps) {
  return (
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <div className="hero" style={{ maxWidth: 880, paddingBottom: 24, textAlign: 'center' }}>
          <div className="hero-badge">
            <div className="pulse-dot"></div> Letter library
          </div>
          <h1>
            Six dispute letter types, <em>one workflow</em>
          </h1>
          <p className="hero-sub" style={{ margin: '0 auto', maxWidth: 720 }}>
            Most disputes need more than a single letter to a bureau. CreditClear builds the full ladder — from the
            initial bureau letter through MOV, direct-to-furnisher, debt validation, goodwill, and CFPB escalation —
            with the right citations and 30-day cadence baked in.
          </p>
        </div>

        <div className="section" style={{ paddingTop: 0, maxWidth: 980, margin: '0 auto' }}>
          <div style={{ display: 'grid', gap: 14 }}>
            {LETTERS.map((letter) => (
              <div className="card" key={letter.id}>
                <div className="card-t" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span>{letter.title}</span>
                  <StatusBadge status={letter.status} />
                </div>
                <div className="card-s" style={{ fontStyle: 'italic', opacity: 0.8 }}>
                  {letter.citation}
                </div>
                <div className="disc" style={{ marginTop: 8 }}>
                  {letter.description}
                </div>
                {letter.status === 'coming_soon' && letter.eta ? (
                  <div className="disc" style={{ marginTop: 4, opacity: 0.75 }}>
                    {letter.eta}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="section" style={{ paddingTop: 8, maxWidth: 980, margin: '0 auto' }}>
          <ComingSoon feature={FEATURE_FLAGS.letter_types_six} source="letter_types_page" />
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
