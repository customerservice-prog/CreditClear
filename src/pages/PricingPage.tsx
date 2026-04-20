import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { WaitlistCard } from '../components/WaitlistCard'
import { getBillingStatus, type BillingStatus } from '../lib/apiClient'
import { SITE_URL } from '../lib/site'

const PRICING_FAQ = [
  {
    answer:
      "We migrated billing to a CROA-compliant model: no advance fees, transparent monthly subscription, cancel any time, plus a 3-day Notice of Cancellation as required by federal law. Read the full rules on the disclosures page.",
    question: 'How does CreditClear bill me?',
  },
  {
    answer:
      'Founding members get the lowest pricing CreditClear will ever offer, locked for life, plus first access to round tracking, certified mail, and the score impact simulator as those features go live.',
    question: 'What do founding members get?',
  },
  {
    answer:
      'CreditClear helps you draft, organize, and (soon) certified-mail dispute letters under FCRA, FDCPA, and §1681s-2(b). It is not legal representation and we do not guarantee credit repair outcomes.',
    question: 'What does CreditClear actually do?',
  },
  {
    answer:
      'No. Accurate negative information may remain. Your credit score depends on many factors beyond software tools.',
    question: 'Do you guarantee a higher credit score?',
  },
  {
    answer:
      'Yes. The waitlist is just an email list — no card, no commitment. Unsubscribe links are in every email we send.',
    question: 'Can I unsubscribe from the waitlist?',
  },
] as const

interface PricingPageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

function formatMoney(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) return ''
  const dollars = cents / 100
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

export function PricingPage({ onHome, onSignIn, onStartTrial }: PricingPageProps) {
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [billingLoaded, setBillingLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const status = await getBillingStatus()
        if (!cancelled) setBilling(status)
      } catch {
        if (!cancelled) setBilling({ checkout_open: false, plan_name: 'CreditClear Pro', monthly_price_cents: null, aggregator_open: false, mail_open: false })
      } finally {
        if (!cancelled) setBillingLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const checkoutOpen = billing?.checkout_open === true
  const priceLabel = billing?.monthly_price_cents ? formatMoney(billing.monthly_price_cents) : null
  const planName = billing?.plan_name || 'CreditClear Pro'

  const structuredData = useMemo(() => {
    const faqEntities = PRICING_FAQ.map((item) => ({
      '@type': 'Question',
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
      name: item.question,
    }))
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          applicationCategory: 'FinanceApplication',
          name: 'CreditClear AI',
          operatingSystem: 'Web',
          url: `${SITE_URL}/pricing`,
        },
        { '@type': 'FAQPage', mainEntity: faqEntities },
      ],
    }
  }, [])

  useEffect(() => {
    const id = 'creditclear-pricing-ld'
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
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <div className="hero" style={{ maxWidth: 900, paddingBottom: 24, textAlign: 'center' }}>
          <div className="hero-badge">
            <div className="pulse-dot"></div>{' '}
            {!billingLoaded ? 'Checking availability…' : checkoutOpen ? 'Checkout is open' : 'Founders\u2019 waitlist open'}
          </div>
          <h1>
            {checkoutOpen ? (
              <>
                Start your <em>{planName}</em> subscription
              </>
            ) : (
              <>
                New checkout is <em>paused</em> while we finish the rebuild
              </>
            )}
          </h1>
          <p className="hero-sub" style={{ margin: '0 auto', maxWidth: 720 }}>
            {checkoutOpen ? (
              <>
                Cancel any time, no advance fees, with a 3-day federal Notice of Cancellation as required by the Credit
                Repair Organizations Act. Read the full <Link to="/disclosures">required disclosures</Link> before you
                subscribe.
              </>
            ) : (
              <>
                We&apos;re finishing the CROA-compliant billing rebuild. Until checkout reopens, join the founders&apos;
                waitlist to lock in the lowest pricing CreditClear will ever offer.
              </>
            )}
          </p>
        </div>

        <div className="section" style={{ paddingTop: 0 }}>
          <h2 className="sec-title" style={{ textAlign: 'center' }}>
            {checkoutOpen ? (
              <>
                Subscribe to <em>{planName}</em>
              </>
            ) : (
              <>
                Why we paused <em>new checkout</em>
              </>
            )}
          </h2>
          {checkoutOpen ? (
            <>
              <p className="disc" style={{ maxWidth: 720, margin: '0 auto 20px', textAlign: 'center' }}>
                One subscription unlocks every live capability: tradeline-level dispute editing, all six dispute letter
                templates (FCRA §611, MOV, furnisher §1681s-2(b), debt validation §1692g, goodwill, CFPB), automatic
                round tracking with a 30-day FCRA response window, and one-click data export and account deletion.
              </p>
              <div className="price-wrap" style={{ display: 'grid', placeItems: 'center', gap: 16 }}>
                <div
                  className="card"
                  style={{
                    maxWidth: 460,
                    width: '100%',
                    padding: 24,
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    background: 'rgba(212, 175, 55, 0.06)',
                  }}
                >
                  <div className="card-t" style={{ marginBottom: 4 }}>
                    {planName}
                  </div>
                  {priceLabel ? (
                    <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>
                      {priceLabel}
                      <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.7, marginLeft: 4 }}>/month</span>
                    </div>
                  ) : null}
                  <ul style={{ paddingLeft: 18, margin: '12px 0 16px' }}>
                    <li>Unlimited disputes &amp; tradeline editing</li>
                    <li>All 6 letter templates with statutory citations</li>
                    <li>Automatic round tracking (Rounds 1–4)</li>
                    <li>One-click data export &amp; account deletion</li>
                    <li>3-day federal Notice of Cancellation</li>
                  </ul>
                  <button className="btn btn-gold" onClick={onStartTrial} style={{ width: '100%' }} type="button">
                    Sign up &amp; start checkout
                  </button>
                  <p className="disc" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                    You&apos;ll create an account first, then be redirected to Stripe Checkout. Cancel any time from
                    your <Link to="/billing">Billing page</Link>.
                  </p>
                </div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  Not ready to subscribe? <a href="#waitlist">Join the waitlist instead.</a>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="disc" style={{ maxWidth: 720, margin: '0 auto 20px', textAlign: 'center' }}>
                The Credit Repair Organizations Act forbids charging consumers in advance for credit-repair services.
                Rather than keep collecting before the new product is ready, we paused new signups and rebuilt billing
                to comply.
              </p>
              <p className="disc" style={{ maxWidth: 720, margin: '0 auto 28px', textAlign: 'center' }}>
                If you were comparing DIY templates and law-adjacent services, the{' '}
                <Link to="/blog/credit-repair-software-vs-diy-disputes">DIY vs software tradeoffs</Link> guide on the
                blog is still the most honest read in the space.
              </p>
              <div className="price-wrap">
                <WaitlistCard />
              </div>
            </>
          )}
          <p className="disc" style={{ marginTop: 16, textAlign: 'center', opacity: 0.7 }}>
            Existing subscribers: manage your subscription from the <Link to="/billing">Billing page</Link> as usual.
          </p>
        </div>

        {checkoutOpen ? (
          <div className="section" id="waitlist" style={{ paddingTop: 0, maxWidth: 720, margin: '0 auto' }}>
            <h2 className="sec-title">
              Or join the <em>founders&apos; updates list</em>
            </h2>
            <p className="disc">
              We email roughly twice a month with product updates, new letter templates, and credit-repair education.
              No card required, unsubscribe any time.
            </p>
            <div className="price-wrap">
              <WaitlistCard />
            </div>
          </div>
        ) : null}

        <div className="section" style={{ paddingTop: 0, maxWidth: 820, margin: '0 auto' }}>
          <h2 className="sec-title">
            What you get <em>in the workflow</em>
          </h2>
          <p className="disc">
            The product centers on a guided path from personal details through bureau targets and the accounts you want
            to dispute. You can attach supporting documents (with redactions you control) so the letter cites the right
            exhibits. Outputs are editable drafts—never mail-ready without your review. That design mirrors how serious
            consumers already work when they read{' '}
            <Link to="/blog/how-to-dispute-credit-report-errors">step-by-step dispute</Link> articles and still want
            faster typing help.
          </p>
          <p className="disc">
            You also gain continuity: saved disputes, structured issue lists, and less context-switching between
            spreadsheets and word processors. See the full{' '}
            <Link to="/letter-types">letter library</Link> for what ships at launch and what unlocks for founding
            members. If you are simultaneously researching{' '}
            <Link to="/blog/609-letter-vs-dispute-letter">609 vs standard letters</Link> or{' '}
            <Link to="/blog/fcra-dispute-rights-explained">FCRA basics</Link>, the app keeps your narrative consistent
            across bureaus.
          </p>
        </div>

        <div className="section" style={{ paddingTop: 0, maxWidth: 820, margin: '0 auto' }}>
          <h2 className="sec-title">
            Bureau guides <em>included on the marketing site</em>
          </h2>
          <p className="disc">
            We publish long-form educational pages for{' '}
            <Link to="/dispute/equifax">Equifax disputes</Link>, <Link to="/dispute/experian">Experian disputes</Link>, and{' '}
            <Link to="/dispute/transunion">TransUnion disputes</Link>. They are not substitutes for legal advice, but they
            help you understand how investigators read letters before you spend money on any tool—including ours.
          </p>
        </div>

        <div className="section" id="pricing-faq" style={{ paddingTop: 0, maxWidth: 720, margin: '0 auto' }}>
          <div className="sec-lbl">FAQ</div>
          <h2 className="sec-title">
            Pricing <em>questions</em>
          </h2>
          <div className="faq-list">
            {PRICING_FAQ.map((item) => (
              <details className="faq-details" key={item.question}>
                <summary className="ft">{item.question}</summary>
                <div className="fd faq-a">{item.answer}</div>
              </details>
            ))}
          </div>
        </div>

        <div className="section" style={{ paddingTop: 0, textAlign: 'center' }}>
          <p className="disc" style={{ maxWidth: 640, margin: '0 auto 20px' }}>
            Read the <Link to="/blog">blog</Link> for deep dives, compare bureau guides above, or return{' '}
            <Link to="/">home</Link>.
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
            <Link to="/contact">Contact</Link>
          </div>
          <div className="fcopy">© 2026 CreditClear AI — Educational and document assistance only.</div>
        </footer>
      </MarketingMain>
    </div>
  )
}
