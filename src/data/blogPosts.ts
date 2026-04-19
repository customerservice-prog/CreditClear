import { BLOG_BODIES } from './blogBodies'

export interface BlogPost {
  author: string
  body: string
  datePublished: string
  description: string
  slug: string
  title: string
}

const AUTHOR = 'CreditClear AI Editorial'

export const blogPosts: BlogPost[] = [
  {
    slug: 'how-to-dispute-credit-report-errors',
    title: 'How to Dispute Credit Report Errors (Step-by-Step)',
    description:
      'A practical walkthrough for disputing credit report errors with Equifax, Experian, and TransUnion using organized drafts.',
    datePublished: '2026-04-01',
    author: AUTHOR,
    body: BLOG_BODIES['how-to-dispute-credit-report-errors'],
  },
  {
    slug: 'credit-dispute-letter-template-guide',
    title: 'Credit Dispute Letter Template: What to Include',
    description:
      'What belongs in a strong credit dispute letter: identifiers, clear disputes, and enclosures—without risky “guaranteed deletion” promises.',
    datePublished: '2026-04-02',
    author: AUTHOR,
    body: BLOG_BODIES['credit-dispute-letter-template-guide'],
  },
  {
    slug: 'fcra-dispute-rights-explained',
    title: 'FCRA Dispute Rights Explained for Consumers',
    description:
      'High-level overview of why FCRA matters to credit disputes—not legal advice, but orientation before you draft.',
    datePublished: '2026-04-03',
    author: AUTHOR,
    body: BLOG_BODIES['fcra-dispute-rights-explained'],
  },
  {
    slug: 'how-long-credit-dispute-takes',
    title: 'How Long Does a Credit Dispute Take?',
    description: 'Why dispute timelines vary by bureau, mail vs. online, and furnisher responses.',
    datePublished: '2026-04-04',
    author: AUTHOR,
    body: BLOG_BODIES['how-long-credit-dispute-takes'],
  },
  {
    slug: 'dispute-hard-inquiry-credit-report',
    title: 'How to Dispute a Hard Inquiry on Your Credit Report',
    description:
      'Focus on whether you authorized the pull and whether the inquiry is attributed to the right creditor.',
    datePublished: '2026-04-05',
    author: AUTHOR,
    body: BLOG_BODIES['dispute-hard-inquiry-credit-report'],
  },
  {
    slug: '609-letter-vs-dispute-letter',
    title: '609 Letter vs. Standard Dispute Letter: What’s the Difference?',
    description:
      'Clear up confusion between generic dispute letters and letters tied to FCRA disclosure sections.',
    datePublished: '2026-04-06',
    author: AUTHOR,
    body: BLOG_BODIES['609-letter-vs-dispute-letter'],
  },
  {
    slug: 'remove-collections-credit-report',
    title: 'Removing Collections: Disputes, Validation, and Facts',
    description: 'Why “remove collections” searches are common—and why accuracy still matters.',
    datePublished: '2026-04-07',
    author: AUTHOR,
    body: BLOG_BODIES['remove-collections-credit-report'],
  },
  {
    slug: 'dispute-late-payment-credit-report',
    title: 'How to Dispute a Late Payment on Your Credit Report',
    description: 'Document payment history, grace periods, and reporting dates before you dispute.',
    datePublished: '2026-04-08',
    author: AUTHOR,
    body: BLOG_BODIES['dispute-late-payment-credit-report'],
  },
  {
    slug: 'credit-repair-software-vs-diy-disputes',
    title: 'Credit Repair Software vs. DIY Credit Disputes',
    description:
      'How tools like CreditClear compare to doing everything manually or hiring a service.',
    datePublished: '2026-04-09',
    author: AUTHOR,
    body: BLOG_BODIES['credit-repair-software-vs-diy-disputes'],
  },
  {
    slug: 'documents-for-credit-dispute',
    title: 'What Documents Do You Need for a Credit Dispute?',
    description:
      'Checklist mindset: reports, IDs (redacted where possible), and proof of payment or correspondence.',
    datePublished: '2026-04-10',
    author: AUTHOR,
    body: BLOG_BODIES['documents-for-credit-dispute'],
  },
]

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}
