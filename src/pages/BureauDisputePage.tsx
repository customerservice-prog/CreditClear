import type { ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BUREAU_GUIDE_HTML } from '../data/bureauGuideHtml'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { CTA_TRIAL_LABEL, SITE_URL } from '../lib/site'
import { NotFoundPage } from './NotFoundPage'

const BUREAU_META: Record<string, { label: string; path: string }> = {
  equifax: { label: 'Equifax', path: '/dispute/equifax' },
  experian: { label: 'Experian', path: '/dispute/experian' },
  transunion: { label: 'TransUnion', path: '/dispute/transunion' },
}

const H1_COPY: Record<string, ReactNode> = {
  equifax: (
    <>
      How to Dispute <em>Equifax</em> Credit Report Errors
    </>
  ),
  experian: (
    <>
      How to Dispute <em>Experian</em> Credit Report Errors
    </>
  ),
  transunion: (
    <>
      How to Dispute <em>TransUnion</em> Credit Report Errors
    </>
  ),
}

interface BureauDisputePageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

export function BureauDisputePage({ onHome, onSignIn, onStartTrial }: BureauDisputePageProps) {
  const { bureauId } = useParams()
  const key = bureauId?.toLowerCase() || ''
  const html = BUREAU_GUIDE_HTML[key]
  const meta = BUREAU_META[key]

  const structuredData = useMemo(() => {
    if (!meta) {
      return null
    }
    const url = `${SITE_URL}${meta.path}`
    const name = `How to Dispute ${meta.label} Credit Report Errors`
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          description: `Educational guide to disputing ${meta.label} credit report errors with FCRA-oriented workflows—not legal advice.`,
          name,
          url,
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              item: `${SITE_URL}/`,
              name: 'Home',
              position: 1,
            },
            {
              '@type': 'ListItem',
              item: url,
              name,
              position: 2,
            },
          ],
        },
      ],
    }
  }, [meta])

  useEffect(() => {
    if (!structuredData) {
      return
    }
    const id = 'creditclear-bureau-ld'
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

  if (!html || !meta) {
    return <NotFoundPage onHome={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
  }

  return (
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <article className="hero bureau-guide" style={{ maxWidth: 720, paddingBottom: 32, textAlign: 'left' }}>
          <div className="hero-badge">
            <div className="pulse-dot"></div> Bureau guide
          </div>
          <h1>{H1_COPY[key]}</h1>
          <p className="disc" style={{ fontSize: 13, marginTop: 0 }}>
            Educational overview · Not legal advice · Compare{' '}
            <Link to="/dispute/equifax">Equifax</Link>, <Link to="/dispute/experian">Experian</Link>,{' '}
            <Link to="/dispute/transunion">TransUnion</Link>
          </p>
          <div
            className="disc blog-body"
            style={{ fontSize: 16, lineHeight: 1.75, marginTop: 20 }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div style={{ marginTop: 28 }}>
            <button className="btn-xl" onClick={onStartTrial} type="button">
              {CTA_TRIAL_LABEL}
            </button>
          </div>
          <p style={{ marginTop: 24 }}>
            <Link to="/">Home</Link>
            {' · '}
            <Link to="/pricing">Pricing</Link>
            {' · '}
            <Link to="/blog/how-to-dispute-credit-report-errors">Dispute walkthrough</Link>
            {' · '}
            <Link to="/signup">Signup</Link>
          </p>
        </article>
        <footer aria-label="Site footer" className="footer">
          <div className="fbrand">
            Credit<span>Clear</span> AI
          </div>
          <div className="flinks">
            <a href={`${SITE_URL}/privacy`}>Privacy</a>
            <Link to="/contact">Contact</Link>
          </div>
        </footer>
      </MarketingMain>
    </div>
  )
}
