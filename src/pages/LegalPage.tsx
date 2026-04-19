import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { SITE_URL } from '../lib/site'

interface LegalPageProps {
  body: Array<{ title: string; text: string }>
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
  subtitle: string
  title: string
}

export function LegalPage({ body, onHome, onSignIn, onStartTrial, subtitle, title }: LegalPageProps) {
  const location = useLocation()
  const pageUrl = `${SITE_URL}${location.pathname}`

  const structuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      description: subtitle,
      name: title,
      url: pageUrl,
    }),
    [pageUrl, subtitle, title],
  )

  useEffect(() => {
    const scriptId = `creditclear-ld-legal-${location.pathname.replace(/\//g, '-') || 'root'}`
    let el = document.getElementById(scriptId) as HTMLScriptElement | null
    if (!el) {
      el = document.createElement('script')
      el.id = scriptId
      el.type = 'application/ld+json'
      document.head.appendChild(el)
    }
    el.text = JSON.stringify(structuredData)
    return () => {
      el?.remove()
    }
  }, [location.pathname, structuredData])

  return (
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <div className="hero" style={{ maxWidth: 900, paddingBottom: 36, textAlign: 'left' }}>
          <div className="hero-badge">
            <div className="pulse-dot"></div> Legal Information
          </div>
          <h1>
            {title.split(' ')[0]} <em>{title.split(' ').slice(1).join(' ')}</em>
          </h1>
          <p className="hero-sub" style={{ marginLeft: 0 }}>
            {subtitle}
          </p>
        </div>
        <div className="section" style={{ paddingTop: 0 }}>
          <div className="card">
            {body.map((section) => (
              <section key={section.title} style={{ marginBottom: 22 }}>
                <h2 className="card-t" style={{ fontSize: 22, marginBottom: 8, marginTop: 0 }}>
                  {section.title}
                </h2>
                <div className="disc" style={{ marginTop: 0 }}>
                  {section.text}
                </div>
              </section>
            ))}
          </div>
        </div>
      </MarketingMain>
    </div>
  )
}
