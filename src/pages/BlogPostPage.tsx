import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBlogPostBySlug } from '../data/blogPosts'
import { MarketingMain, SkipToContent } from '../components/MarketingPageFrame'
import { Navbar } from '../components/Navbar'
import { SITE_URL } from '../lib/site'
import { NotFoundPage } from './NotFoundPage'

interface BlogPostPageProps {
  onHome: () => void
  onSignIn: () => void
  onStartTrial: () => void
}

export function BlogPostPage({ onHome, onSignIn, onStartTrial }: BlogPostPageProps) {
  const { slug } = useParams()
  const post = slug ? getBlogPostBySlug(slug) : undefined

  const structuredData = useMemo(() => {
    if (!post) {
      return null
    }
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      datePublished: post.datePublished,
      description: post.description,
      headline: post.title,
      mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
      publisher: {
        '@type': 'Organization',
        name: 'CreditClear AI',
        url: SITE_URL,
      },
    }
  }, [post])

  useEffect(() => {
    if (!structuredData) {
      return
    }
    const id = 'creditclear-blog-article-ld'
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

  if (!slug || !post) {
    return <NotFoundPage onHome={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
  }

  return (
    <div className="page active">
      <SkipToContent />
      <Navbar onHomeClick={onHome} onSignIn={onSignIn} onStartTrial={onStartTrial} />
      <MarketingMain>
        <article className="hero" style={{ maxWidth: 720, paddingBottom: 40, textAlign: 'left' }}>
          <div className="hero-badge">
            <div className="pulse-dot"></div> Blog
          </div>
          <h1>{post.title}</h1>
          <p className="disc" style={{ fontSize: 13, marginTop: 0 }}>
            Published {post.datePublished} · Educational only · Not legal advice
          </p>
          <div
            className="disc"
            style={{ fontSize: 16, lineHeight: 1.75, marginTop: 24 }}
            dangerouslySetInnerHTML={{ __html: post.body }}
          />
          <p style={{ marginTop: 32 }}>
            <Link to="/blog">← All articles</Link>
            {' · '}
            <Link to="/signup">Start free trial</Link>
          </p>
        </article>
        <footer aria-label="Site footer" className="footer">
          <div className="fbrand">
            Credit<span>Clear</span> AI
          </div>
          <div className="flinks">
            <a href={`${SITE_URL}/privacy`}>Privacy</a>
            <Link to="/">Home</Link>
          </div>
        </footer>
      </MarketingMain>
    </div>
  )
}
