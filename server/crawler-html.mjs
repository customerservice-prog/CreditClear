import { BLOG_POSTS } from './blog-slugs.mjs'
import { SITE_ORIGIN } from './seo-config.mjs'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function shell({ title, description, canonicalPath, bodyHtml }) {
  const canonical = `${SITE_ORIGIN}${canonicalPath === '/' ? '/' : canonicalPath}`
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"/>
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}"/>
  <link rel="canonical" href="${escapeHtml(canonical)}"/>
  <meta property="og:url" content="${escapeHtml(canonical)}"/>
  <meta property="og:title" content="${escapeHtml(title)}"/>
  <meta property="og:description" content="${escapeHtml(description)}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:image" content="${SITE_ORIGIN}/og-image.png"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:image:alt" content="CreditClear AI — AI-assisted credit dispute letter generator"/>
</head>
<body>
<main>
${bodyHtml}
</main>
<hr/>
<p><a href="${SITE_ORIGIN}/">Continue to CreditClear AI web app →</a></p>
</body>
</html>`
}

const HOME_BODY = `
<h1>AI-Powered Credit Dispute Letters — Organize, Draft, and Review</h1>
<p><strong>CreditClear AI</strong> is a web-based workflow for consumers who want to <strong>dispute credit report errors</strong>, prepare <strong>FCRA-oriented dispute letter</strong> drafts, and work across <strong>Equifax, Experian, and TransUnion</strong>. Upload your <strong>credit report</strong> (PDF or images), select issue types—from <strong>late payments</strong> and <strong>collections</strong> to <strong>hard inquiries</strong> and identity mismatches—and generate <strong>editable dispute letter</strong> language you review before anything is sent.</p>
<p>This is <strong>not credit repair</strong> in the sense of a company acting on your behalf, and <strong>not legal advice</strong>. CreditClear is <strong>document-assistance software</strong>: it helps you structure a <strong>credit dispute</strong>, align facts with common <strong>FCRA dispute</strong> framing, and export drafts. Your <strong>credit score</strong> and outcomes depend on accurate reporting and how furnishers and bureaus respond—no tool can guarantee removal of accurate negative items.</p>
<h2>How to dispute a credit report with a clearer workflow</h2>
<p>Many people search for <strong>how to dispute credit report</strong> information, <strong>credit dispute letter</strong> templates, or <strong>609 letter</strong>-style language. CreditClear focuses on a repeatable process: confirm what each bureau shows, map errors to categories, attach evidence, and produce <strong>review-ready</strong> drafts. Whether you need a <strong>dispute letter to Equifax</strong>, <strong>Experian</strong>, or <strong>TransUnion</strong>, the same workspace keeps bureaus and issues organized.</p>
<h2>Credit repair software vs. educational drafting tools</h2>
<p>Traditional <strong>credit repair software</strong> sometimes emphasizes automation and letter volume. CreditClear emphasizes <strong>your review</strong>: every output is meant to be edited, fact-checked, and sent only when you choose. Keywords like <strong>remove negative items from credit report</strong> reflect real goals, but accurate items may remain; disputes should be factual and respectful.</p>
<h2>Pricing and trial</h2>
<p>See our <a href="${SITE_ORIGIN}/pricing">pricing page</a> for the monthly plan after a <strong>free 7-day trial</strong>. For deep dives, visit the <a href="${SITE_ORIGIN}/blog">CreditClear blog</a> on <strong>dispute letters</strong>, bureau timelines, and <strong>FCRA</strong> basics—or read <a href="${SITE_ORIGIN}/dispute/equifax">Equifax</a>, <a href="${SITE_ORIGIN}/dispute/experian">Experian</a>, and <a href="${SITE_ORIGIN}/dispute/transunion">TransUnion</a> guides.</p>
`

const PRICING_BODY = `
<h1>Credit Dispute Tool Pricing — CreditClear AI</h1>
<p>CreditClear AI offers a single transparent plan for ongoing access to the <strong>credit dispute letter</strong> workflow, secure uploads, and saved drafts. Start with a <strong>free 7-day trial</strong> (no credit card required on signup), then continue at <strong>$49/month</strong> with cancel-anytime flexibility.</p>
<p>This compares to many <strong>credit repair</strong> retainers that hide fees. Here you get software for <strong>how to dispute credit report</strong> entries yourself—with AI-assisted drafting you still review against your real <strong>credit report</strong> and <strong>credit score</strong> goals.</p>
<p><a href="${SITE_ORIGIN}/signup">Start free trial</a> · <a href="${SITE_ORIGIN}/">Home</a></p>
`

const CONTACT_BODY = `
<h1>Contact CreditClear AI</h1>
<p>Questions about billing, your account, or the <strong>credit dispute</strong> workflow? Use the live <a href="${SITE_ORIGIN}/contact">contact page</a> to reach support.</p>
`

const PRIVACY_BODY = `<h1>Privacy Policy — CreditClear AI</h1><p>How we handle account data, uploads, and billing. <a href="${SITE_ORIGIN}/privacy">Open full privacy policy in the app</a>.</p>`
const TERMS_BODY = `<h1>Terms of Use — CreditClear AI</h1><p>Subscription and product terms. <a href="${SITE_ORIGIN}/terms">Open full terms in the app</a>.</p>`
const DISCLAIMER_BODY = `<h1>Disclaimer — CreditClear AI</h1><p>Educational and draft-assistance scope; not legal advice. <a href="${SITE_ORIGIN}/disclaimer">Open full disclaimer in the app</a>.</p>`

const BUREAU_HTML = {
  equifax: `<h1>How to Dispute Equifax Credit Report Errors</h1><p>Organize <strong>Equifax</strong> tradelines, prepare <strong>FCRA</strong>-style <strong>dispute letter</strong> drafts, and track what you send. <a href="${SITE_ORIGIN}/signup">Start free trial</a>.</p>`,
  experian: `<h1>How to Dispute Experian Credit Report Errors</h1><p>Structure <strong>Experian</strong> disputes with clear facts and review-ready drafts. <a href="${SITE_ORIGIN}/signup">Start free trial</a>.</p>`,
  transunion: `<h1>How to Dispute TransUnion Credit Report Errors</h1><p>Map <strong>TransUnion</strong> issues to categories and export editable letters after your review. <a href="${SITE_ORIGIN}/signup">Start free trial</a>.</p>`,
}

/** @param {string} pathname */
export function getCrawlerHtml(pathname) {
  const p = (pathname === '' ? '/' : pathname).replace(/\/$/, '') || '/'
  if (p === '/blog') {
    const links = BLOG_POSTS.map(
      (x) => `<li><a href="${SITE_ORIGIN}/blog/${x.slug}">${escapeHtml(x.title)}</a></li>`,
    ).join('\n')
    return shell({
      title: 'Blog | Credit Dispute & Credit Report Guides | CreditClear AI',
      description:
        'Guides on credit disputes, FCRA rights, dispute letters, Experian, Equifax, and TransUnion workflows.',
      canonicalPath: '/blog',
      bodyHtml: `<h1>CreditClear AI Blog</h1><p>Articles on <strong>credit dispute letters</strong>, <strong>credit report</strong> errors, and bureau processes.</p><ul>${links}</ul>`,
    })
  }

  const blogMatch = p.match(/^\/blog\/([^/]+)$/)
  if (blogMatch) {
    const slug = blogMatch[1]
    const post = BLOG_POSTS.find((x) => x.slug === slug)
    if (post) {
      return shell({
        title: `${post.title} | CreditClear AI`,
        description: `${post.title}. Educational guide from CreditClear AI — not legal advice.`,
        canonicalPath: `/blog/${slug}`,
        bodyHtml: `<h1>${escapeHtml(post.title)}</h1><p>Full article available in the <a href="${SITE_ORIGIN}/blog/${slug}">CreditClear web app</a>. Topics include <strong>credit dispute</strong>, <strong>credit repair</strong> alternatives, and <strong>credit score</strong> education.</p>`,
      })
    }
  }

  const bureauMatch = p.match(/^\/dispute\/(equifax|experian|transunion)$/)
  if (bureauMatch) {
    const id = bureauMatch[1]
    const titles = {
      equifax: 'Dispute Equifax Credit Report Errors | CreditClear AI',
      experian: 'Dispute Experian Credit Report Errors | CreditClear AI',
      transunion: 'Dispute TransUnion Credit Report Errors | CreditClear AI',
    }
    return shell({
      title: titles[id],
      description: `How to dispute ${id} credit report errors with organized drafts and FCRA-oriented letter assistance.`,
      canonicalPath: `/dispute/${id}`,
      bodyHtml: BUREAU_HTML[id],
    })
  }

  switch (p) {
    case '/':
      return shell({
        title: 'AI Credit Dispute Letter Generator | CreditClear AI',
        description:
          'Generate AI-assisted credit dispute letters for Equifax, Experian, and TransUnion. Upload your credit report, identify errors, and get review-ready draft letters in minutes. Free 7-day trial.',
        canonicalPath: '/',
        bodyHtml: HOME_BODY,
      })
    case '/pricing':
      return shell({
        title: 'Pricing | AI Credit Dispute Letter Tool | CreditClear AI',
        description:
          'CreditClear AI pricing: 7-day free trial, then $49/month. Credit dispute letter generator with secure uploads and bureau-ready drafts.',
        canonicalPath: '/pricing',
        bodyHtml: PRICING_BODY,
      })
    case '/contact':
      return shell({
        title: 'Contact | CreditClear AI',
        description: 'Contact CreditClear AI support for billing, accounts, and product questions.',
        canonicalPath: '/contact',
        bodyHtml: CONTACT_BODY,
      })
    case '/privacy':
      return shell({
        title: 'Privacy Policy | CreditClear AI',
        description: 'How CreditClear AI stores account data, billing, and uploaded documents.',
        canonicalPath: '/privacy',
        bodyHtml: PRIVACY_BODY,
      })
    case '/terms':
      return shell({
        title: 'Terms of Use | CreditClear AI',
        description: 'Terms governing CreditClear AI subscriptions, uploads, and AI-assisted drafts.',
        canonicalPath: '/terms',
        bodyHtml: TERMS_BODY,
      })
    case '/disclaimer':
      return shell({
        title: 'Disclaimer | CreditClear AI',
        description: 'Product limitations and review responsibilities for CreditClear AI.',
        canonicalPath: '/disclaimer',
        bodyHtml: DISCLAIMER_BODY,
      })
    default:
      return null
  }
}
