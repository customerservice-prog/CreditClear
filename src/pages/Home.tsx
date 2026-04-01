import { Navbar } from '../components/Navbar'
import { PricingCard } from '../components/PricingCard'
import { trackEvent } from '../lib/analytics'

interface HomeProps {
  onOpenAuth: (tab: 'login' | 'signup') => void
  onScrollTo: (id: string) => void
}

export function Home({ onOpenAuth, onScrollTo }: HomeProps) {
  return (
    <div className="page active" id="page-home">
      <Navbar onOpenAuth={onOpenAuth} onScrollTo={onScrollTo} />

      <div className="hero">
        <div className="hero-logo-stage" aria-hidden="true">
          <div className="hero-logo-glow"></div>
          <img
            alt="CreditClear logo"
            className="hero-logo"
            src="/creditclear-logo.png"
          />
        </div>
        <div className="hero-badge">
          <div className="pulse-dot"></div> AI-Assisted Credit Review Workflow
        </div>
        <h1>
          Organize Your Credit
          <br />
          Review <em>Starts Here</em>
        </h1>
        <p className="hero-sub">
          CreditClear AI helps you organize report issues, upload supporting documents, and prepare
          <strong> review-ready draft dispute letters</strong> for your own verification.
        </p>
        <div className="hero-btns">
          <button
            className="btn-xl"
            onClick={() => {
              trackEvent('cta_click', { location: 'hero', target: 'signup' })
              onOpenAuth('signup')
            }}
            type="button"
          >
            ⚡ Start Free 7-Day Trial
          </button>
          <button
            className="btn-xl-ghost"
            onClick={() => {
              trackEvent('cta_click', { location: 'hero', target: 'how_it_works' })
              onScrollTo('how-it-works')
            }}
            type="button"
          >
            See How It Works
          </button>
        </div>
      </div>

      <div className="trust-bar">
        <div className="ti">🔒 Private document workflow</div>
        <div className="tdiv"></div>
        <div className="ti">📝 User-reviewed draft letters</div>
        <div className="tdiv"></div>
        <div className="ti">📎 Secure upload support</div>
        <div className="tdiv"></div>
        <div className="ti">🤖 Powered by Claude AI</div>
        <div className="tdiv"></div>
        <div className="ti">⚖️ Not legal advice</div>
      </div>

      <div className="stats-strip">
        <div className="stat-cell">
          <div className="stat-num">5</div>
          <div className="stat-lbl">Guided Workflow Steps</div>
        </div>
        <div className="stat-cell">
          <div className="stat-num">3</div>
          <div className="stat-lbl">Major Bureaus Supported</div>
        </div>
        <div className="stat-cell">
          <div className="stat-num">24/7</div>
          <div className="stat-lbl">Access To Saved Drafts</div>
        </div>
      </div>

      <div className="section" id="how-it-works">
        <div className="sec-lbl">The Process</div>
        <div className="sec-title">
          Three steps to a
          <br />
          <em>clearer workflow</em>
        </div>
        <div className="proc-grid">
          <div className="pc">
            <div className="pnum">01</div>
            <span className="pico">📋</span>
            <div className="ptitle">Tell Us Your Situation</div>
            <div className="pdesc">
              Enter your info and choose the bureaus and issue types you want to organize for
              review.
            </div>
          </div>
          <div className="pc">
            <div className="pnum">02</div>
            <span className="pico">🤖</span>
            <div className="ptitle">AI Analyzes Everything</div>
            <div className="pdesc">
              Our AI reviews the issues you select, summarizes possible reporting concerns, and
              prepares editable draft language for your review.
            </div>
          </div>
          <div className="pc">
            <div className="pnum">03</div>
            <span className="pico">✉️</span>
            <div className="ptitle">Review, Edit &amp; Use Carefully</div>
            <div className="pdesc">
              Review the drafts, edit anything needed, and decide whether or how to use them. You
              stay in control of every document.
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 48px 64px', position: 'relative', textAlign: 'center', zIndex: 2 }}>
        <div className="sec-lbl" style={{ marginBottom: 14 }}>
          Coverage
        </div>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: '-.02em',
            marginBottom: 22,
          }}
        >
          Disputes filed with <em style={{ color: 'var(--gold)' }}>all three</em> major bureaus
        </div>
        <div className="brow">
          <div className="bchip eq">Equifax</div>
          <div className="bchip ex">Experian</div>
          <div className="bchip tu">TransUnion</div>
        </div>
      </div>

      <div className="section" id="features-sec" style={{ paddingTop: 0 }}>
        <div className="sec-lbl">What We Target</div>
        <div className="sec-title">
          Common issues affecting your
          <br />
          report <em>clarity</em>
        </div>
        <div className="feat-grid">
          <div className="fc">
            <span className="fi-ico">⏰</span>
            <div className="ft">Late Payments</div>
            <div className="fd">
              Organize and review late-payment reporting concerns so you can prepare a clear,
              factual draft request for verification.
            </div>
          </div>
          <div className="fc">
            <span className="fi-ico">📋</span>
            <div className="ft">Collections &amp; Charge-offs</div>
            <div className="fd">
              Prepare drafts around collection reporting discrepancies, account validation issues,
              and timeline questions for your own review.
            </div>
          </div>
          <div className="fc">
            <span className="fi-ico">🔍</span>
            <div className="ft">Hard Inquiries</div>
            <div className="fd">
              Document inquiry concerns and generate review-ready language requesting confirmation
              of permissible purpose where appropriate.
            </div>
          </div>
          <div className="fc">
            <span className="fi-ico">💰</span>
            <div className="ft">Balances, Liens &amp; More</div>
            <div className="fd">
              Covers identity mismatches, duplicate accounts, balance discrepancies, medical debt,
              and other report-organization needs.
            </div>
          </div>
        </div>
      </div>

      <div className="section" id="pricing-sec" style={{ paddingTop: 0 }}>
        <div className="sec-lbl" style={{ textAlign: 'center' }}>
          Pricing
        </div>
        <div className="sec-title" style={{ marginBottom: 44, textAlign: 'center' }}>
          One plan. Everything included.
          <br />
          <em>Built for focused monthly use.</em>
        </div>
        <div className="price-wrap">
          <PricingCard
            buttonLabel="Start My Free Trial →"
            note="Start your 7-day free trial with no credit card required. CreditClear provides educational organization tools and editable draft assistance only."
            onClick={() => onOpenAuth('signup')}
          />
        </div>
      </div>

      <div className="section" id="results-sec" style={{ paddingTop: 0 }}>
        <div className="sec-lbl">Illustrative Feedback</div>
        <div className="sec-title">
          Example ways users may
          <br />
          <em>describe the workflow</em>
        </div>
        <div className="tgrid">
          <div className="tc">
            <div className="stars">★★★★★</div>
            <div className="tq">
              &quot;The workflow helped me organize everything in one place and prepare cleaner draft
              letters before I sent anything.&quot;
            </div>
            <div className="ta">Example customer profile</div>
            <div className="tr">Illustrative feedback for product positioning only</div>
          </div>
          <div className="tc">
            <div className="stars">★★★★★</div>
            <div className="tq">
              &quot;The upload flow and summaries saved me hours. I still reviewed every line, but the
              drafts gave me a strong starting point.&quot;
            </div>
            <div className="ta">Example customer profile</div>
            <div className="tr">Illustrative feedback for product positioning only</div>
          </div>
          <div className="tc">
            <div className="stars">★★★★★</div>
            <div className="tq">
              &quot;It feels premium and trustworthy. I liked that it clearly reminded me to verify
              everything before sending.&quot;
            </div>
            <div className="ta">Example customer profile</div>
            <div className="tr">Illustrative feedback for product positioning only</div>
          </div>
        </div>
      </div>

      <div className="section" id="faq-sec" style={{ paddingTop: 0 }}>
        <div className="sec-lbl">FAQ</div>
        <div className="sec-title">
          Clear answers before you
          <br />
          <em>get started</em>
        </div>
        <div className="feat-grid">
          <div className="fc">
            <div className="ft">Is CreditClear legal advice?</div>
            <div className="fd">No. CreditClear is an educational document-assistance platform. You should review and verify all content before use.</div>
          </div>
          <div className="fc">
            <div className="ft">Does CreditClear guarantee results?</div>
            <div className="fd">No. Results depend on the underlying facts, reporting accuracy, and how information is reviewed by the receiving party.</div>
          </div>
          <div className="fc">
            <div className="ft">Can I edit drafts before using them?</div>
            <div className="fd">Yes. Drafts are editable and intended for user review, correction, and personalization.</div>
          </div>
          <div className="fc">
            <div className="ft">Do I need uploads to use the app?</div>
            <div className="fd">No. Uploads can help provide context, but you can still organize issues and generate draft content manually.</div>
          </div>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 0 }}>
        <div className="sec-lbl">Important Disclaimer</div>
        <div className="disc" style={{ fontSize: 13, marginTop: 0 }}>
          CreditClear helps organize information, upload supporting documents, and generate draft
          dispute materials for user review. It does not guarantee any outcome, does not provide
          legal advice, and does not act as a law firm, bureau, or creditor. Users should verify
          all information and decide for themselves whether and how to use any generated draft.
        </div>
      </div>

      <div className="bcta">
        <h2>
          Ready to organize your
          <br />
          credit review workflow?
        </h2>
        <p>
          Start your free 7-day trial and build review-ready dispute drafts with a premium,
          structured workflow.
        </p>
        <button className="btn-xl" onClick={() => onOpenAuth('signup')} type="button">
          ⚡ Start My Free Trial
        </button>
        <div className="cta-meta">No credit card required · Cancel anytime · Draft assistance only</div>
      </div>

      <footer className="footer">
        <div className="fbrand">
          Credit<span>Clear</span> AI
        </div>
        <div className="flinks">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/disclaimer">Disclaimer</a>
          <a href="mailto:support@creditclear.app">Contact</a>
        </div>
        <div className="fcopy">© 2026 CreditClear AI — Educational and document assistance only.</div>
      </footer>
    </div>
  )
}
