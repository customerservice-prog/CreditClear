import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HOME_FAQ_ITEMS } from '../data/homeFaq'
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
  const structuredData = useMemo(() => {
    const faqEntities = HOME_FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
      name: item.question,
    }))

    return {
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
          '@type': 'SoftwareApplication',
          applicationCategory: 'FinanceApplication',
          description:
            'Web software that helps you organize credit report issues and prepare user-reviewed, AI-assisted credit dispute letter drafts for Equifax, Experian, and TransUnion.',
          name: 'CreditClear AI',
          offers: {
            '@type': 'Offer',
            price: '49',
            priceCurrency: 'USD',
            url: `${SITE_URL}/pricing`,
          },
          operatingSystem: 'Web',
          url: `${SITE_URL}/`,
        },
        {
          '@type': 'FAQPage',
          mainEntity: faqEntities,
        },
        {
          '@type': 'Review',
          author: { '@type': 'Person', name: 'Maria R.' },
          itemReviewed: { '@type': 'SoftwareApplication', name: 'CreditClear AI', url: SITE_URL },
          reviewBody:
            'Finally had one place to line up bureau issues and clean up draft language before I mailed anything. The structure alone was worth it.',
        },
        {
          '@type': 'Review',
          author: { '@type': 'Person', name: 'James L.' },
          itemReviewed: { '@type': 'SoftwareApplication', name: 'CreditClear AI', url: SITE_URL },
          reviewBody:
            'Uploads plus the summaries cut down prep time a lot. I still read every paragraph, but I was not starting from a blank page.',
        },
        {
          '@type': 'Review',
          author: { '@type': 'Person', name: 'Alex K.' },
          itemReviewed: { '@type': 'SoftwareApplication', name: 'CreditClear AI', url: SITE_URL },
          reviewBody:
            'The product feels serious about verification—not just generating text and hoping you send it. That matched how carefully I wanted to work.',
        },
      ],
    }
  }, [])

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
      <Navbar onSignIn={onSignIn} onStartTrial={onStartTrial} />

      <MarketingMain>
      <div className="hero">
        <div className="hero-logo-stage" aria-hidden="true">
          <div className="hero-logo-glow"></div>
          <img
            alt="CreditClear logo"
            className="hero-logo"
            fetchPriority="high"
            loading="eager"
            src="/creditclear-logo.svg"
          />
        </div>
        <div className="hero-badge">
          <div className="pulse-dot"></div> AI-assisted credit dispute letters
        </div>
        <h1>AI-Powered Credit Dispute Letters — Ready in Minutes</h1>
        <p className="hero-sub">
          Dispute <strong>credit report</strong> errors with <strong>AI-assisted draft dispute letters</strong> you edit
          and verify yourself. CreditClear AI is <strong>credit repair software</strong> for organization and drafting—not
          representation—built around <strong>FCRA</strong>-style workflows for <strong>Equifax</strong>,{' '}
          <strong>Experian</strong>, and <strong>TransUnion</strong>. Whether you are learning{' '}
          <strong>how to dispute a credit report</strong> or you already know which tradelines look wrong, start from a
          structured workflow instead of a blank page. Your <strong>credit score</strong> still depends on accurate
          reporting and real-world outcomes—this tool helps you prepare clearer <strong>credit dispute</strong> communications.
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

      <div className="section" style={{ paddingBottom: 32, paddingTop: 0 }}>
        <div className="sec-lbl">Why people search for dispute help</div>
        <h2 className="sec-title">
          From “<em>credit dispute letter</em>”
          <br />
          to a review-ready draft
        </h2>
        <p className="disc" style={{ margin: '0 auto', maxWidth: 820, textAlign: 'center' }}>
          Most high-intent searches in this space are informational: <strong>how to dispute a late payment</strong>,{' '}
          <strong>how to remove negative items from a credit report</strong>, <strong>609 letter</strong> myths, and{' '}
          <strong>FCRA dispute</strong> basics. CreditClear AI meets that intent on the execution side: you bring the facts,
          we help you turn them into organized issues, optional uploads, and editable drafts. Read the{' '}
          <Link to="/blog">CreditClear blog</Link> for long-form guides, compare bureau playbooks for{' '}
          <Link to="/dispute/equifax">Equifax</Link>, <Link to="/dispute/experian">Experian</Link>, and{' '}
          <Link to="/dispute/transunion">TransUnion</Link>, and review <Link to="/pricing">pricing</Link> when you are
          ready to start the trial.
        </p>
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
              Enter your info, pick bureau targets, and select issue categories that match what you see on your{' '}
              <strong>credit report</strong>. The in-app workflow is intentionally step-by-step so you do not skip the
              basics: personal identifiers, dispute scope, and the exact tradelines you believe are inaccurate or
              incomplete. If you are comparing <strong>credit repair software</strong> options, this stage is where you
              decide how carefully you want to document each <strong>credit dispute</strong> before any drafting begins.
            </div>
          </div>
          <div className="pc">
            <div className="pnum">02</div>
            <span aria-hidden="true" className="pico emoji">
              🤖
            </span>
            <div className="ptitle">AI Analyzes Everything</div>
            <div className="pdesc">
              The model summarizes what you entered, highlights themes that often matter in bureau investigations, and
              generates editable <strong>dispute letter</strong> text aligned to the issues you selected. This is not a
              substitute for verifying dates, balances, and account ownership—those facts still belong to you—but it
              accelerates turning messy notes into structured language you can refine for <strong>Equifax</strong>,{' '}
              <strong>Experian</strong>, or <strong>TransUnion</strong> channels.
            </div>
          </div>
          <div className="pc">
            <div className="pnum">03</div>
            <span aria-hidden="true" className="pico emoji">
              ✉️
            </span>
            <div className="ptitle">Review, Edit &amp; Use Carefully</div>
            <div className="pdesc">
              Read every paragraph, attach redacted evidence when it helps, and decide how you want to deliver the dispute
              (mail, fax, or online portals depending on the bureau). CreditClear does not send disputes for you and does
              not promise a better <strong>credit score</strong>—it helps you prepare communications that match your facts
              and your comfort level with the <strong>FCRA</strong> dispute process.
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
        <p className="disc" style={{ margin: '28px auto 0', maxWidth: 760 }}>
          Each bureau maintains its own file, which is why many consumers file parallel <strong>credit disputes</strong>{' '}
          when the same error appears in multiple places. Use our bureau hubs—
          <Link to="/dispute/equifax">Equifax disputes</Link>, <Link to="/dispute/experian">Experian disputes</Link>, and{' '}
          <Link to="/dispute/transunion">TransUnion disputes</Link>—to see how we talk about formatting issues, evidence,
          and realistic timelines before you open the app.
        </p>
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
              Late payments drag down a <strong>credit score</strong> when they are reported accurately—but when dates or
              statuses are wrong, a focused <strong>credit dispute letter</strong> can ask the bureau to investigate.
              CreditClear helps you describe the inconsistency, reference supporting documents, and keep the narrative tied
              to what you can prove.
            </div>
          </div>
          <div className="fc">
            <span aria-hidden="true" className="fi-ico emoji">
              📋
            </span>
            <div className="ft">Collections &amp; Charge-offs</div>
            <div className="fd">
              Collection tradelines are a common reason people research <strong>credit repair</strong> and debt
              validation. We help you draft neutral, fact-based language that requests verification and notes reporting
              discrepancies—while making it obvious that you—not software—are responsible for strategy and follow-up.
            </div>
          </div>
          <div className="fc">
            <span aria-hidden="true" className="fi-ico emoji">
              🔍
            </span>
            <div className="ft">Hard Inquiries</div>
            <div className="fd">
              If a <strong>hard inquiry</strong> looks unfamiliar, your dispute should explain why the entry may be
              inaccurate and what you need the bureau to confirm. The app helps you keep those details organized across
              drafts so you are not rewriting the same facts three different ways by hand.
            </div>
          </div>
          <div className="fc">
            <span aria-hidden="true" className="fi-ico emoji">
              💰
            </span>
            <div className="ft">Balances, Liens &amp; More</div>
            <div className="fd">
              From duplicate accounts to mixed files and balance mismatches, the goal is the same: align your{' '}
              <strong>credit report</strong> dispute with documentation and clear questions. CreditClear supports a wide
              range of categories so you can mirror what you actually see when you pull <strong>Equifax</strong>,{' '}
              <strong>Experian</strong>, and <strong>TransUnion</strong> data.
            </div>
          </div>
        </div>

        <div className="sec-lbl" style={{ marginTop: 48 }}>
          All 12 dispute categories
        </div>
        <p className="disc" style={{ marginTop: 12, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
          The workflow supports every issue type below. Pick the ones that match your reports—the app organizes them for
          review and drafting. If you are new to <strong>FCRA</strong> terminology, browse the{' '}
          <Link to="/blog">CreditClear blog</Link> for 609-letter context, bureau timelines, and dispute basics, then return
          here to map categories to what you see on paper.
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
        <p className="disc" style={{ margin: '28px auto 0', maxWidth: 640, textAlign: 'center' }}>
          Looking for a dedicated URL to share? Visit the <Link to="/pricing">CreditClear pricing page</Link> for the same
          plan details, keyword context on <strong>credit repair software pricing</strong>, and links back to bureau and
          blog resources.
        </p>
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
              &quot;Finally had one place to line up bureau issues and clean up draft language before I mailed anything.
              The structure alone was worth it when I was juggling multiple <strong>credit dispute</strong> drafts.&quot;
            </div>
            <div className="ta">Maria R. · Early access, Southwest U.S.</div>
            <div className="tr">Individual experience; not a guarantee of results.</div>
          </div>
          <div className="tc">
            <div className="stars">★★★★★</div>
            <div className="tq">
              &quot;Uploads plus the summaries cut down prep time a lot. I still read every paragraph, but I
              wasn&apos;t starting from a blank page on my <strong>credit report</strong> errors.&quot;
            </div>
            <div className="ta">James L. · Beta tester, Midwest</div>
            <div className="tr">Individual experience; not a guarantee of results.</div>
          </div>
          <div className="tc">
            <div className="stars">★★★★★</div>
            <div className="tq">
              &quot;The product feels serious about verification—not just generating text and hoping you send it. That
              matched how carefully I wanted to work through <strong>FCRA</strong> disputes.&quot;
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
          {HOME_FAQ_ITEMS.map((item) => (
            <details className="faq-details" key={item.question}>
              <summary className="ft">{item.question}</summary>
              <div className="fd faq-a">{item.answer}</div>
            </details>
          ))}
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
          Start your free 7-day trial and build review-ready <strong>credit dispute letter</strong> drafts with a
          premium workflow designed for people who want to understand their <strong>credit report</strong>, protect their{' '}
          <strong>credit score</strong>, and stay organized across <strong>Equifax</strong>, <strong>Experian</strong>, and{' '}
          <strong>TransUnion</strong>.
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
          <Link to="/pricing">Pricing</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/dispute/equifax">Equifax</Link>
          <Link to="/dispute/experian">Experian</Link>
          <Link to="/dispute/transunion">TransUnion</Link>
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
