import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { WaitlistCard } from '../components/WaitlistCard'
import { SITE_URL } from '../lib/site'

const PRICING_FAQ = [
  {
    answer:
      "New subscription checkouts are paused while we migrate billing to a CROA-compliant, no-advance-fee, bill-per-letter model. Join the founders' waitlist on this page and we'll email you the moment checkout reopens. Existing subscribers keep their current plan with no changes.",
    question: 'Why is checkout closed right now?',
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
            <div className="pulse-dot"></div> Founders&apos; waitlist open
          </div>
          <h1>
            New checkout is <em>paused</em> while we rebuild billing
          </h1>
          <p className="hero-sub" style={{ margin: '0 auto', maxWidth: 720 }}>
            We&apos;re moving CreditClear to a CROA-compliant, no-advance-fee, bill-per-letter model. Until that ships,
            new subscriptions are closed. Join the founders&apos; waitlist below to lock in the lowest pricing
            CreditClear will ever offer and get first access as features go live.
          </p>
        </div>

        <div className="section" style={{ paddingTop: 0 }}>
          <h2 className="sec-title" style={{ textAlign: 'center' }}>
            Why we paused <em>new checkout</em>
          </h2>
          <p className="disc" style={{ maxWidth: 720, margin: '0 auto 20px', textAlign: 'center' }}>
            The Credit Repair Organizations Act forbids charging consumers in advance for credit-repair services. The old
            $49/month-up-front model was on the wrong side of that line for the kind of automated dispute work we&apos;re
            now building. Rather than keep collecting before the new product is ready, we paused new signups and are
            rebuilding billing to charge per letter mailed, after the work is done.
          </p>
          <p className="disc" style={{ maxWidth: 720, margin: '0 auto 28px', textAlign: 'center' }}>
            If you were comparing DIY templates and law-adjacent services, the{' '}
            <Link to="/blog/credit-repair-software-vs-diy-disputes">DIY vs software tradeoffs</Link> guide on the blog is
            still the most honest read in the space.
          </p>
          <div className="price-wrap">
            <WaitlistCard />
          </div>
          <p className="disc" style={{ marginTop: 16, textAlign: 'center', opacity: 0.7 }}>
            Existing subscribers: nothing changes for you. Manage your subscription from the{' '}
            <Link to="/billing">Billing page</Link> as usual.
          </p>
        </div>

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
            <Link to="/contact">Contact</Link>
          </div>
          <div className="fcopy">© 2026 CreditClear AI — Educational and document assistance only.</div>
        </footer>
      </MarketingMain>
    </div>
  )
}
