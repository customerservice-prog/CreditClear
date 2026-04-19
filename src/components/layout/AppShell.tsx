import type { ReactNode } from 'react'
import { MarketingMain, SkipToContent } from '../MarketingPageFrame'
import { Navbar } from '../Navbar'
import type { AppTab } from '../../types'

interface AppShellProps {
  children: ReactNode
  heading: ReactNode
  message?: string
  messageTone?: 'error' | 'info'
  subheading: string
  statusLabel: string
  userDisplayName: string
  appTab?: AppTab
  onAppTabChange?: (tab: AppTab) => void
  onHomeClick: () => void
  onSignOut: () => void
}

export function AppShell({
  appTab,
  children,
  heading,
  message,
  messageTone = 'error',
  onAppTabChange,
  onHomeClick,
  onSignOut,
  statusLabel,
  subheading,
  userDisplayName,
}: AppShellProps) {
  return (
    <div className="page active" id="page-app">
      <SkipToContent />
      <Navbar
        appTab={appTab}
        isApp
        onAppTabChange={onAppTabChange}
        onHomeClick={onHomeClick}
        onSignOut={onSignOut}
        statusLabel={statusLabel}
        userDisplayName={userDisplayName}
      />
      <MarketingMain>
        <div className="app-wrap">
          <div className="app-hdr">
            <div className="app-badge">
              <div className="pulse-dot"></div> Credit Workspace
            </div>
            <h1>{heading}</h1>
            <p>{subheading}</p>
          </div>
          {message ? <div className={`app-note ${messageTone}`}>{message}</div> : null}
          {children}
        </div>
      </MarketingMain>
    </div>
  )
}
