import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { PricingCard } from '../components/PricingCard'
import { trackEvent } from '../lib/analytics'
import { ISSUES } from '../lib/constants'
import { CTA_TRIAL_LABEL, SITE_URL } from '../lib/site'

interface HomeProps {
  onScrollTo: (id: string) => void
  onSignIn: () => void
  onStartTrial: () => void
}

export function Home({ onScrollTo, onSignIn, onStartTrial }: HomeProps) {
  const structuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: 'CreditClear AI',
          url: SITE_URL,
        },
        {
          '@type': 'WebSite',
          name: 'CreditClear AI',
          url: SITE_URL,
        },
        {
          '@type': 'Product',
          brand: { '@type': 'Brand', name: 'CreditClear AI' },
          description:
            'AI-assisted credit dispute workflow with user-reviewed draft letters and secure document uploads.',
          name: 'CreditClear AI Pro',
          offers: {
            '@type': 'Offer',
            price: '49',
            priceCurrency: 'USD',
            url: `${SITE_URL}/signup`,
          },
        },
      ],
    }),
    [],
  )

  useEffect(() => {
    const id = 'creditclear-ld-json'
    let el = document.getElementById(id) as HTMLScriptElement | null
    if (!el) {
      el = document.createElement('script')
      el.id = id
      el.type = 'application/ld+json'
      document.head.appendChild(el)
    }
    el.text = JSON.stringify(structuredData)
    return () => {
      el?.remove()
    }
  }, [structuredData])

  return (
    <div className="page active" id="page-home">
      <SkipToContent />
      <Navbar onScrollTo={onScrollTo} onSignIn={onSignIn} onStartTrial={onStartTrial} />

      <MarketingMain>
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
          Your Credit Review <em>Starts Here</em>
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
              onStartTrial()
            }}
            type="button"
          >
            {CTA_TRIAL_LABEL}
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
        <div className="ti">
          <span aria-hidden="true" className="emoji">
            🔒
          </span>{' '}
          Private document workflow
        </div>
        <div className="tdiv"></div>
        <div className="ti">
          <span aria-hidden="true" className="emoji">
            📝
          </span>{' '}
          User-reviewed draft letters
        </div>
        <div className="tdiv"></div>
        <div className="ti">
          <span aria-hidden="true" className="emoji">
            📎
          </span>{' '}
          Secure upload support
        </div>
        <div className="tdiv"></div>
        <div className="ti">
          <span aria-hidden="true" className="emoji">
            🤖
          </span>{' '}
          Powered by Claude AI
        </div>
        <div className="tdiv"></div>
        <div className="ti">
          <span aria-hidden="true" className="emoji">
            ⚖️
          </span>{' '}
          Not legal advice
        </div>
      </div>

      <div className="stats-strip">
        <div className="stat-cell">
          <div className="stat-num">3</div>
          <div className="stat-lbl">Steps To Get Started</div>
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
        <h2 className="sec-title">
          Three steps to a
          <br />
          <em>clearer workflow</em>
        </h2>
        <div className="proc-grid">
          <div className="pc">
            <div className="pnum">01</div>
            <span aria-hidden="true" className="pico emoji">
              📋
            </span>
            <div className="ptitle">Tell Us Your Situation</div>
            <div className="pdesc">
              Enter your info and choose bureaus and issue types. Inside the app, a five-step
              workspace walks you from personal details through draft letters.
            </div>
          </div>
          <div className="pc">
            <div className="pnum">02</div>
            <span aria-hidden="true" className="pico emoji">
              🤖
            </span>
            <div className="ptitle">AI Analyzes Everything</div>
            <div className="pdesc">
              Our AI reviews the issues you select, summarizes possible reporting concerns, and
              prepares editable draft language for your review.
            </div>
          </div>
          <div className="pc">
            <div className="pnum">03</div>
            <span aria-hidden="true" className="pico emoji">
              ✉️
            </span>
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
        <h2
          className="sec-title"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: '-.02em',
            marginBottom: 22,
          }}
        >
          Disputes filed with <em style={{ color: 'var(--gold)' }}>all three</em> major bureaus
        </h2>
        <div className="brow">
          <div className="bchip eq">Equifax</div>
          <div className="bchip ex">Experian</div>
          <div className="bchip tu">TransUnion</div>
        </div>
      </div>

      <div className="section" id="features-sec" style={{ paddingTop: 0 }}>
        <div className="sec-lbl">What We Target</div>
        <h2 className="sec-title">
          Common issues affecting your
          <br />
          report <em>clarity</em>
        </h2>
        <div className="feat-grid">
          <div className="fc">
            <span aria-hidden="true" className="fi-ico emoji">
              ⏰
            </span>
            <div className="ft">Late Payments</div>
            <div className="fd">
              Organize and review late-payment reporting concerns so you can prepare a clear,
              factual draft request for verification.
            </div>
          </div>
          <div className="fc">
            <span aria-hidden="true" className="fi-ico emoji">
              📋
            </span>
            <div className="ft">Collections &amp; Charge-offs</div>
            <div className="fd">
              Prepare drafts around collection reporting discrepancies, account validation issues,
              and timeline questions for your own review.
            </div>
          </div>
          <div className="fc">
            <span aria-hidden="true" className="fi-ico emoji">
              🔍
            </span>
            <div className="ft">Hard Inquiries</div>
            <div className="fd">
              Document inquiry concerns and generate review-ready language requesting confirmation
              of permissible purpose where appropriate.
            </div>
          </div>
          <div className="fc">
            <span aria-hidden="true" className="fi-ico emoji">
              💰
            </span>
            <div className="ft">Balances, Liens &amp; More</div>
            <div className="fd">
              Covers identity mismatches, duplicate accounts, balance discrepancies, medical debt,
              and other report-organization needs.
            </div>
          </div>
        </div>

        <div className="sec-lbl" style={{ marginTop: 48 }}>
          All 12 dispute categories
        </div>
        <p className="disc" style={{ marginTop: 12, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
          The workflow supports every issue type below. Pick the ones that match your reports—the app organizes them
          for review and drafting.
        </p>
        <div
          className="brow"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
            marginTop: 24,
            maxWidth: 900,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {ISSUES.map((issue) => (
            <div className="bchip" key={issue.id} style={{ fontSize: 13 }}>
              <span aria-hidden="true" className="emoji">
                {issue.icon}
              </span>{' '}
              {issue.label}
            </div>
          ))}
        </div>
      </div>

      <div className="section" id="pricing-sec" style={{ paddingTop: 0 }}>
        <div className="sec-lbl" style={{ textAlign: 'center' }}>
          Pricing
        </div>
        <h2 className="sec-title" style={{ marginBottom: 44, textAlign: 'center' }}>
          One plan. Everything included.
          <br />
          <em>Built for focused monthly use.</em>
        </h2>
        <div className="price-wrap">
          <PricingCard
            buttonLabel={CTA_TRIAL_LABEL}
            note="Start your 7-day free trial with no credit card required. CreditClear provides educational organization tools and editable draft assistance only."
            onClick={() => {
              trackEvent('cta_click', { location: 'pricing', target: 'signup' })
              onStartTrial()
            }}
          />
        </div>
      </div>

      <div className="section" id="results-sec" style={{ paddingTop: 0 }}>
        <div className="sec-lbl">What early users say</div>
        <h2 className="sec-title">
          Workflow feedback from
          <br />
          <em>real beta testers</em>
        </h2>
        <div className="tgrid">
          <div className="tc">
            <div className="stars">★★★★★</div>
            <div className="tq">
              &quot;Finally had one place to line up bureau issues and clean up draft language before I
              mailed anything. The structure alone was worth it.&quot;
            </div>
            <div className="ta">Maria R. · Early access, Southwest U.S.</div>
            <div className="tr">Individual experience; not a guarantee of results.</div>
          </div>
          <div className="tc">
            <div className="stars">★★★★★</div>
            <div className="tq">
              &quot;Uploads plus the summaries cut down prep time a lot. I still read every paragraph, but
              I wasn&apos;t starting from a blank page.&quot;
            </div>
            <div className="ta">James L. · Beta tester, Midwest</div>
            <div className="tr">Individual experience; not a guarantee of results.</div>
          </div>
          <div className="tc">
            <div className="stars">★★★★★</div>
            <div className="tq">
              &quot;The product feels serious about verification—not just generating text and hoping you
              send it. That matched how carefully I wanted to work.&quot;
            </div>
            <div className="ta">Alex K. · Pilot user, Northeast</div>
            <div className="tr">Individual experience; not a guarantee of results.</div>
          </div>
        </div>
      </div>

      <div className="section" id="faq-sec" style={{ paddingTop: 0 }}>
        <div className="sec-lbl">FAQ</div>
        <h2 className="sec-title">
          Clear answers before you
          <br />
          <em>get started</em>
        </h2>
        <div className="faq-list" style={{ maxWidth: 720, margin: '0 auto' }}>
          <details className="faq-details">
            <summary className="ft">Is CreditClear legal advice?</summary>
            <div className="fd faq-a">
              No. CreditClear is an educational document-assistance platform. You should review and verify all content
              before use.
            </div>
          </details>
          <details className="faq-details">
            <summary className="ft">Does CreditClear guarantee results?</summary>
            <div className="fd faq-a">
              No. Results depend on the underlying facts, reporting accuracy, and how information is reviewed by the
              receiving party.
            </div>
          </details>
          <details className="faq-details">
            <summary className="ft">Can I edit drafts before using them?</summary>
            <div className="fd faq-a">
              Yes. Drafts are editable and intended for user review, correction, and personalization.
            </div>
          </details>
          <details className="faq-details">
            <summary className="ft">Do I need uploads to use the app?</summary>
            <div className="fd faq-a">
              No. Uploads can help provide context, but you can still organize issues and generate draft content manually.
            </div>
          </details>
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
        <button className="btn-xl" onClick={() => {
            trackEvent('cta_click', { location: 'footer_cta', target: 'signup' })
            onStartTrial()
          }} type="button">
          {CTA_TRIAL_LABEL}
        </button>
        <div className="cta-meta">No credit card required · Cancel anytime · Draft assistance only</div>
      </div>

      <footer aria-label="Site footer" className="footer">
        <div className="fbrand">
          Credit<span>Clear</span> AI
        </div>
        <div className="flinks">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/disclaimer">Disclaimer</a>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="fcopy">© 2026 CreditClear AI — Educational and document assistance only.</div>
      </footer>
      </MarketingMain>
    </div>
  )
}
