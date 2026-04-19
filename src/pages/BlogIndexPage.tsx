import { Link } from 'react-router-dom'
import { blogPosts } from '../data/blogPosts'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { SITE_URL } from '../lib/site'

interface BlogIndexPageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

export function BlogIndexPage({ onHome, onSignIn, onStartTrial }: BlogIndexPageProps) {
  return (
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <div className="hero" style={{ maxWidth: 800, paddingBottom: 24, textAlign: 'left' }}>
          <div className="hero-badge">
            <div className="pulse-dot"></div> Blog
          </div>
          <h1>
            Credit <em>Dispute</em> &amp; Credit Report Guides
          </h1>
          <p className="hero-sub" style={{ marginLeft: 0 }}>
            Educational articles on <strong>credit dispute letters</strong>, <strong>FCRA</strong> basics, bureau
            workflows, and <strong>credit score</strong> myths—written for people doing their own{' '}
            <strong>credit report</strong> reviews. Not legal advice.
          </p>
        </div>
        <div className="section" style={{ paddingTop: 0 }}>
          <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {blogPosts.map((post) => (
                <li key={post.slug} style={{ borderBottom: '1px solid rgba(255,255,255,.08)', padding: '18px 0' }}>
                  <Link style={{ fontSize: 18, fontWeight: 500 }} to={`/blog/${post.slug}`}>
                    {post.title}
                  </Link>
                  <div className="disc" style={{ marginTop: 8, fontSize: 14 }}>
                    {post.description}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p style={{ marginTop: 28, textAlign: 'center' }}>
            <Link to="/">← Home</Link>
            {' · '}
            <Link to="/pricing">Pricing</Link>
          </p>
        </div>
        <footer aria-label="Site footer" className="footer">
          <div className="fbrand">
            Credit<span>Clear</span> AI
          </div>
          <div className="flinks">
            <a href={`${SITE_URL}/privacy`}>Privacy</a>
            <a href={`${SITE_URL}/terms`}>Terms</a>
            <Link to="/contact">Contact</Link>
          </div>
        </footer>
      </MarketingMain>
    </div>
  )
}
