import type { ReactNode } from 'react'

export const MARKETING_MAIN_ID = 'main-content'

export function SkipToContent() {
  return (
    <a className="skip-link" href={`#${MARKETING_MAIN_ID}`}>
      Skip to content
    </a>
  )
}

export function MarketingMain({ children }: { children: ReactNode }) {
  return <main id={MARKETING_MAIN_ID}>{children}</main>
}
