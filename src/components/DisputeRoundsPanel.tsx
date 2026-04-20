import { useMemo, useState } from 'react'
import {
  canAdvanceFrom,
  useDisputeRounds,
  type DisputeRoundRow,
  type RoundNumber,
} from '../hooks/useDisputeRounds'
import type { LetterType } from '../types'

interface DisputeRoundsPanelProps {
  disputeId: string
  userId: string | null | undefined
}

interface RoundMeta {
  number: RoundNumber
  title: string
  detail: string
  defaultLetterType: LetterType
}

const ROUND_META: readonly RoundMeta[] = [
  {
    number: 1,
    title: 'Initial bureau dispute',
    detail: 'FCRA §611 — bureau has 30 days from receipt to investigate.',
    defaultLetterType: 'bureau_initial',
  },
  {
    number: 2,
    title: 'Method of verification (MOV)',
    detail: 'FCRA §611(a)(7) — forces the bureau to disclose how it verified the item.',
    defaultLetterType: 'mov',
  },
  {
    number: 3,
    title: 'Furnisher direct dispute',
    detail: 'FCRA §1681s-2(b) — goes directly to the data furnisher (creditor / collector).',
    defaultLetterType: 'furnisher',
  },
  {
    number: 4,
    title: 'CFPB complaint escalation',
    detail: 'Complaint draft for consumerfinance.gov. Often resolves within days.',
    defaultLetterType: 'cfpb',
  },
] as const

function statusBadge(status: DisputeRoundRow['status']): { label: string; color: string; bg: string; border: string } {
  if (status === 'mailed') {
    return { label: 'Mailed', color: '#7ec3ff', bg: 'rgba(120, 180, 255, 0.12)', border: 'rgba(120, 180, 255, 0.4)' }
  }
  if (status === 'response_received') {
    return { label: 'Response received', color: '#30c878', bg: 'rgba(48, 200, 120, 0.15)', border: 'rgba(48, 200, 120, 0.45)' }
  }
  if (status === 'closed') {
    return { label: 'Closed', color: 'rgba(255,255,255,0.7)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.15)' }
  }
  return { label: 'Drafted', color: 'var(--gold, #d4af37)', bg: 'rgba(212, 175, 55, 0.12)', border: 'rgba(212, 175, 55, 0.45)' }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysUntil(yyyymmdd: string | null): number | null {
  if (!yyyymmdd) return null
  const target = new Date(`${yyyymmdd}T00:00:00Z`).getTime()
  const today = new Date(`${todayIso()}T00:00:00Z`).getTime()
  return Math.round((target - today) / 86400000)
}

export function DisputeRoundsPanel({ disputeId, userId }: DisputeRoundsPanelProps) {
  const { rounds, loading, error, markMailed, markResponseReceived, startRound } = useDisputeRounds(
    disputeId,
    userId,
  )
  const [busyRoundId, setBusyRoundId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [mailedDateInput, setMailedDateInput] = useState<Record<string, string>>({})

  const byNumber = useMemo(() => {
    const map = new Map<RoundNumber, DisputeRoundRow>()
    for (const round of rounds) {
      map.set(round.round_number as RoundNumber, round)
    }
    return map
  }, [rounds])

  async function handleMailed(round: DisputeRoundRow) {
    const value = mailedDateInput[round.id] || todayIso()
    setBusyRoundId(round.id)
    setActionError('')
    try {
      await markMailed(round.id, value)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the mailed date.')
    } finally {
      setBusyRoundId(null)
    }
  }

  async function handleResponseReceived(round: DisputeRoundRow) {
    setBusyRoundId(round.id)
    setActionError('')
    try {
      await markResponseReceived(round.id, todayIso())
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not record the response.')
    } finally {
      setBusyRoundId(null)
    }
  }

  async function handleStart(meta: RoundMeta) {
    setBusyRoundId(`start-${meta.number}`)
    setActionError('')
    try {
      await startRound(meta.number, meta.defaultLetterType)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not start the next round.')
    } finally {
      setBusyRoundId(null)
    }
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-t">Dispute round timeline</div>
      <div className="card-s">
        Track each round end-to-end. Round 1 is created automatically when you generate your first letters; mark it
        as mailed and we&apos;ll calculate the 30-day FCRA response window for you. After 30 days, Round 2 (MOV)
        unlocks.
      </div>

      {error ? <div className="ferr" style={{ marginTop: 8 }}>{error}</div> : null}
      {actionError ? <div className="ferr" style={{ marginTop: 8 }}>{actionError}</div> : null}

      {loading && rounds.length === 0 ? (
        <div className="history-skel" style={{ marginTop: 12 }}>
          <div className="skel-line short"></div>
          <div className="skel-line"></div>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {ROUND_META.map((meta) => {
          const round = byNumber.get(meta.number)
          const previous = meta.number > 1 ? byNumber.get((meta.number - 1) as RoundNumber) : null
          const canStart = !round && (meta.number === 1 || (previous ? canAdvanceFrom(previous) : false))
          const lockedReason =
            !round && previous && !canAdvanceFrom(previous)
              ? previous.status === 'mailed' && previous.response_due_on
                ? `Unlocks on ${previous.response_due_on} (30 days after Round ${previous.round_number} was mailed).`
                : `Mark Round ${previous.round_number} as mailed to start the 30-day window.`
              : null

          const badge = round ? statusBadge(round.status) : null
          const due = round?.response_due_on ? daysUntil(round.response_due_on) : null

          return (
            <div
              key={meta.number}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: 12,
                borderRadius: 10,
                border: round
                  ? `1px solid ${badge?.border || 'rgba(255,255,255,0.1)'}`
                  : '1px solid rgba(255,255,255,0.08)',
                background: round
                  ? badge?.bg || 'rgba(255,255,255,0.02)'
                  : 'rgba(255,255,255,0.02)',
                opacity: round ? 1 : 0.85,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  flex: '0 0 auto',
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  background: round ? (badge?.bg || 'rgba(255,255,255,0.06)') : 'rgba(255,255,255,0.06)',
                  color: round ? (badge?.color || 'var(--gold)') : 'rgba(255,255,255,0.6)',
                  border: round ? `1px solid ${badge?.border}` : '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {meta.number}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                    fontWeight: 600,
                  }}
                >
                  <span>
                    Round {meta.number} · {meta.title}
                  </span>
                  {badge ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {badge.label}
                    </span>
                  ) : null}
                </div>
                <div className="disc" style={{ marginTop: 4 }}>
                  {meta.detail}
                </div>

                {round ? (
                  <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                    {round.mailed_on ? (
                      <div className="disc" style={{ marginTop: 0 }}>
                        Mailed <strong>{round.mailed_on}</strong>
                        {round.response_due_on
                          ? ` · response due ${round.response_due_on}` +
                            (due !== null
                              ? due > 0
                                ? ` (${due} day${due === 1 ? '' : 's'} left)`
                                : due === 0
                                ? ' (today)'
                                : ` (${Math.abs(due)} day${Math.abs(due) === 1 ? '' : 's'} overdue)`
                              : '')
                          : ''}
                      </div>
                    ) : null}
                    {round.response_received_on ? (
                      <div className="disc" style={{ marginTop: 0 }}>
                        Response received <strong>{round.response_received_on}</strong>
                        {round.outcome ? ` — ${round.outcome}` : ''}
                      </div>
                    ) : null}

                    {round.status === 'drafted' ? (
                      <div className="btn-row" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <input
                          aria-label={`Mailed date for Round ${meta.number}`}
                          onChange={(e) =>
                            setMailedDateInput((prev) => ({ ...prev, [round.id]: e.target.value }))
                          }
                          style={{ maxWidth: 180 }}
                          type="date"
                          value={mailedDateInput[round.id] || todayIso()}
                        />
                        <button
                          className="btn btn-gold"
                          disabled={busyRoundId === round.id}
                          onClick={() => void handleMailed(round)}
                          type="button"
                        >
                          {busyRoundId === round.id ? 'Saving…' : 'Mark as mailed'}
                        </button>
                      </div>
                    ) : null}

                    {round.status === 'mailed' ? (
                      <div className="btn-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                        <button
                          className="btn btn-ghost"
                          disabled={busyRoundId === round.id}
                          onClick={() => void handleResponseReceived(round)}
                          type="button"
                        >
                          {busyRoundId === round.id ? 'Saving…' : 'Record bureau response'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    {canStart ? (
                      <button
                        className="btn btn-ghost"
                        disabled={busyRoundId === `start-${meta.number}`}
                        onClick={() => void handleStart(meta)}
                        type="button"
                      >
                        {busyRoundId === `start-${meta.number}`
                          ? 'Starting…'
                          : `Start Round ${meta.number}`}
                      </button>
                    ) : (
                      <div className="disc" style={{ marginTop: 0, opacity: 0.7 }}>
                        {lockedReason || 'Complete the previous round to unlock.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
