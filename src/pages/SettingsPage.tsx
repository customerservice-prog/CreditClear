import { AppShell } from '../components/layout/AppShell'
import { ComingSoon } from '../components/ComingSoon'
import { FEATURE_FLAGS } from '../lib/featureFlags'
import type { AppTab, AppUser } from '../types'

interface SettingsPageProps {
  appMessage?: string
  appTab?: AppTab
  onAppTabChange?: (tab: AppTab) => void
  onShowHome: () => void
  onSignOut: () => void
  statusLabel: string
  user: AppUser | null
  userDisplayName: string
}

export function SettingsPage({
  appMessage,
  appTab,
  onAppTabChange,
  onShowHome,
  onSignOut,
  statusLabel,
  user,
  userDisplayName,
}: SettingsPageProps) {
  return (
    <AppShell
      appTab={appTab}
      heading={
        <>
          Account <em>Settings</em>
        </>
      }
      message={appMessage}
      onAppTabChange={onAppTabChange}
      onHomeClick={onShowHome}
      onSignOut={onSignOut}
      statusLabel={statusLabel}
      subheading="Review your profile details and account access settings."
      userDisplayName={userDisplayName}
    >
      <div className="card">
        <div className="card-t">Profile</div>
        <div className="card-s">Basic account information synced from Supabase authentication.</div>
        <div className="fg">
          <div className="f">
            <label>Full Name</label>
            <input disabled value={user?.name || ''} />
          </div>
          <div className="f">
            <label>Email</label>
            <input disabled value={user?.email || ''} />
          </div>
        </div>
        <div className="disc">
          CreditClear helps you organize information and generate review-ready draft documents.
          You remain responsible for verifying all content before use.
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={onSignOut} type="button">
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <ComingSoon feature={FEATURE_FLAGS.certified_mail} source="settings_cert_mail_panel" />
      </div>
    </AppShell>
  )
}
