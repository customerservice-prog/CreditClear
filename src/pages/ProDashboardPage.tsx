import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import {
  inviteProClientRequest,
  listProClientsRequest,
  type ProClient,
} from '../lib/apiClient'
import { useProRole } from '../hooks/useProRole'
import type { AppTab, AppUser } from '../types'

interface ProDashboardPageProps {
  appTab?: AppTab
  onAppTabChange?: (tab: AppTab) => void
  onShowHome: () => void
  onSignOut: () => void
  statusLabel: string
  user: AppUser | null
  userDisplayName: string
}

/**
 * /pro/dashboard — gated by profiles.role in ('pro','admin'). Lists every
 * client this consultant has invited and lets them invite new ones. The
 * non-pro fallback shows a clear message + a link back to the marketing
 * /pro page where the user can request access.
 */
export function ProDashboardPage(props: ProDashboardPageProps) {
  const userId = props.user?.id ?? null
  const { role, loading: roleLoading } = useProRole(userId)

  return (
    <AppShell
      appTab={props.appTab}
      heading={
        <span>
          <em>Pro</em> client dashboard
        </span>
      }
      onAppTabChange={props.onAppTabChange}
      onHomeClick={props.onShowHome}
      onSignOut={props.onSignOut}
      statusLabel={props.statusLabel}
      subheading="Invite clients, see their dispute status, and bulk-coordinate rounds. Pro tier is invite-only at launch."
      userDisplayName={props.userDisplayName}
    >
      {roleLoading ? (
        <div className="card"><div className="card-s">Checking your Pro tier access…</div></div>
      ) : role === 'consumer' ? (
        <NotAProCard />
      ) : (
        <ProDashboard />
      )}
    </AppShell>
  )
}

function NotAProCard() {
  return (
    <div className="card">
      <div className="card-t">Pro tier required</div>
      <p className="card-s" style={{ marginBottom: 12 }}>
        This dashboard is for credit consultants and small firms managing multiple client disputes. Your account is
        currently a consumer account.
      </p>
      <p className="disc" style={{ marginBottom: 16 }}>
        Pro is invite-only during launch so we can support every firm directly. Add yourself to the waitlist on the
        <Link style={{ marginLeft: 4 }} to="/pro">Pro overview page</Link> and we&apos;ll reach out when the next cohort
        opens.
      </p>
      <Link className="btn" to="/pro">View Pro tier features</Link>
    </div>
  )
}

function ProDashboard() {
  const [clients, setClients] = useState<ProClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteNotice, setInviteNotice] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await listProClientsRequest()
      setClients(result.clients)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load clients.')
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInviteBusy(true)
    setInviteError('')
    setInviteNotice('')
    try {
      const trimmed = email.trim().toLowerCase()
      if (!trimmed) throw new Error('Enter the client\u2019s email.')
      const result = await inviteProClientRequest({ client_email: trimmed, client_full_name: name.trim() || undefined })
      setClients((prev) => [result.client, ...prev])
      setEmail('')
      setName('')
      setInviteNotice(
        result.client.client_user_id
          ? `Linked existing CreditClear user ${result.client.client_email} to your roster.`
          : `Invited ${result.client.client_email}. They\u2019ll appear as 'active' once they sign up under that email.`,
      )
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Could not invite client.')
    } finally {
      setInviteBusy(false)
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-t">Invite a client</div>
        <p className="card-s">
          Use the client&apos;s real email — when they create their CreditClear account under that address we&apos;ll
          automatically attach their disputes to your roster.
        </p>
        <form onSubmit={handleInvite} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, opacity: 0.85 }}>Client email *</span>
            <input
              autoComplete="off"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, opacity: 0.85 }}>Client full name (optional)</span>
            <input
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Q. Public"
              type="text"
              value={name}
            />
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" disabled={inviteBusy} type="submit">
              {inviteBusy ? 'Inviting…' : 'Send invite'}
            </button>
            {inviteError ? <span style={{ color: '#ff8a8a' }}>{inviteError}</span> : null}
            {inviteNotice ? <span style={{ color: '#30c878' }}>{inviteNotice}</span> : null}
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-t">Your clients ({clients.length})</div>
        {loading ? (
          <div className="card-s">Loading roster…</div>
        ) : error ? (
          <div className="app-note error">{error}</div>
        ) : clients.length === 0 ? (
          <p className="card-s">No clients yet — invite one above to get started.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 8 }}>
            {clients.map((client) => (
              <li
                key={client.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <span>
                  <strong>{client.client_full_name || client.client_email}</strong>
                  {client.client_full_name ? (
                    <span style={{ opacity: 0.7, marginLeft: 6 }}>{client.client_email}</span>
                  ) : null}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: client.status === 'active' ? 'rgba(48,200,120,0.12)' : 'rgba(212,175,55,0.12)',
                    border:
                      client.status === 'active'
                        ? '1px solid rgba(48,200,120,0.3)'
                        : '1px solid rgba(212,175,55,0.3)',
                  }}
                >
                  {client.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-t">What ships next on this dashboard</div>
        <ul style={{ paddingLeft: 18, margin: '6px 0 0' }}>
          <li>Click into a client to view their disputes, letters, and round timeline.</li>
          <li>Bulk-generate the same dispute strategy across multiple clients in one pass.</li>
          <li>White-label letterhead with your firm name, address, and signature block.</li>
          <li>CROA-compliant per-client billing (charge only after letters are mailed).</li>
        </ul>
        <p className="disc" style={{ marginTop: 10 }}>
          You can already invite clients and persist the roster — the roster is RLS-protected so only you and the
          linked client can read each row.
        </p>
      </div>
    </>
  )
}
