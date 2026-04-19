import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { PricingCard } from '../components/PricingCard'
import { trackEvent } from '../lib/analytics'
import { CTA_TRIAL_LABEL, SITE_URL } from '../lib/site'

const PRICING_FAQ = [
  {
    answer:
      'CreditClear Pro is $49/month after a free 7-day trial. You can cancel before the trial ends without being charged when no card is required at signup—see current signup copy for the latest policy.',
    question: 'How much does CreditClear cost after the trial?',
  },
  {
    answer:
      'The plan includes the guided dispute workspace, AI-assisted draft generation you must review, secure uploads aligned to issue categories, and organization for Equifax, Experian, and TransUnion targeting. It is not legal representation or guaranteed credit repair outcomes.',
    question: 'What is included in the monthly plan?',
  },
  {
    answer:
      'CreditClear helps you draft and organize disputes; it does not mail letters for you or negotiate with creditors. You decide what to send and when.',
    question: 'Does CreditClear send disputes for me?',
  },
  {
    answer:
      'No. Accurate negative information may remain. Your credit score depends on many factors beyond software tools.',
    question: 'Do you guarantee a higher credit score?',
  },
  {
    answer:
      'Cancel according to the billing instructions in your account. Draft assistance is educational; keep copies of letters you already downloaded.',
    question: 'How do I cancel?',
  },
] as const

interface PricingPageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

export function PricingPage({ onHome, onSignIn, onStartTrial }: PricingPageProps) {
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
          offers: { '@type': 'Offer', price: '49', priceCurrency: 'USD', url: `${SITE_URL}/pricing` },
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
            <div className="pulse-dot"></div> Pricing
          </div>
          <h1>
            AI <em>Credit Dispute Letter</em> Tool — Simple Monthly Pricing
          </h1>
          <p className="hero-sub" style={{ margin: '0 auto', maxWidth: 720 }}>
            Organize <strong>credit report</strong> errors, draft <strong>FCRA-oriented dispute letters</strong> for{' '}
            <strong>Equifax</strong>, <strong>Experian</strong>, and <strong>TransUnion</strong>, and keep everything in
            one workflow. This is <strong>not credit repair</strong> representation—it's review-ready software for people
            who want to handle their own <strong>credit disputes</strong> carefully.
          </p>
        </div>

        <div className="section" style={{ paddingTop: 0 }}>
          <h2 className="sec-title" style={{ textAlign: 'center' }}>
            Why <em>credit repair software pricing</em> varies
          </h2>
          <p className="disc" style={{ maxWidth: 720, margin: '0 auto 20px', textAlign: 'center' }}>
            Some tools only mail form letters. Others charge large setup fees then monthly retainers. CreditClear prices as
            accessible <strong>credit repair software</strong> with AI-assisted drafting: you bring the facts, the app helps
            you structure <strong>dispute letter</strong> language for review. That model keeps costs predictable while
            still demanding your attention—because no ethical vendor should promise automatic deletions of accurate
            negatives or a magically higher <strong>credit score</strong>.
          </p>
          <p className="disc" style={{ maxWidth: 720, margin: '0 auto 28px', textAlign: 'center' }}>
            Whether you are comparing DIY templates, law-adjacent services, or modern AI workflows, evaluate total cost of
            ownership: hours spent formatting letters, postage, monitoring, and emotional bandwidth. For many households,
            $49/month is cheaper than unpaid weekends lost to copy-paste errors—especially when{' '}
            <Link to="/blog/credit-repair-software-vs-diy-disputes">DIY vs software tradeoffs</Link> are understood up
            front.
          </p>
          <div className="price-wrap">
            <PricingCard
              buttonLabel={CTA_TRIAL_LABEL}
              note="After trial, CreditClear Pro is $49/month. Cancel anytime. Draft assistance only—not legal advice."
              onClick={() => {
                trackEvent('cta_click', { location: 'pricing_page', target: 'signup' })
                onStartTrial()
              }}
            />
          </div>
        </div>

        <div className="section" style={{ paddingTop: 0, maxWidth: 820, margin: '0 auto' }}>
          <h2 className="sec-title">
            What you get <em>in the workflow</em>
          </h2>
          <p className="disc">
            The product centers on a guided path from personal details through bureau targets and issue categories. You can
            attach supporting documents (with redactions you control) so AI summaries align with the exhibits you intend to
            cite. Outputs are editable drafts—never mail-ready without your review. That design mirrors how serious consumers
            already work when they read <Link to="/blog/how-to-dispute-credit-report-errors">step-by-step dispute</Link>{' '}
            articles and still want faster typing help.
          </p>
          <p className="disc">
            You also gain continuity: saved disputes, structured issue lists, and less context-switching between spreadsheets
            and word processors. If you are simultaneously researching <Link to="/blog/609-letter-vs-dispute-letter">609 vs
            standard letters</Link> or <Link to="/blog/fcra-dispute-rights-explained">FCRA basics</Link>, the app keeps your
            narrative consistent across bureaus.
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
            <Link to="/">home</Link>. Ready to try the workflow?{' '}
            <Link to="/signup">Create your account</Link>.
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
            <Link to="/contact">Contact</Link>
          </div>
          <div className="fcopy">© 2026 CreditClear AI — Educational and document assistance only.</div>
        </footer>
      </MarketingMain>
    </div>
  )
}
