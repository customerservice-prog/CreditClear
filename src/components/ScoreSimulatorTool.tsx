import { useMemo, useState } from 'react'
import { simulate, formatMoneyCents } from '../lib/scoreSimulator'
import type { TradelineRow } from '../types'

interface ScoreSimulatorToolProps {
  tradelines: TradelineRow[]
  /** Optional override — used by the public marketing demo to label the dataset. */
  datasetLabel?: string
}

/**
 * Pure-presentation deterministic score simulator. Renders a checkbox grid
 * over the supplied tradelines, runs `simulate()` whenever the selection
 * changes, and displays the before/after snapshot plus the educational
 * signal-points delta with the human-readable notes that drove it.
 */
export function ScoreSimulatorTool({ tradelines, datasetLabel = 'Sample report' }: ScoreSimulatorToolProps) {
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const result = useMemo(() => simulate(tradelines, removed), [tradelines, removed])

  function toggle(id: string) {
    setRemoved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const deltaColor =
    result.signalPointsDelta > 0
      ? '#30c878'
      : result.signalPointsDelta < 0
      ? '#ff8a8a'
      : 'rgba(255,255,255,0.7)'

  return (
    <div className="card" style={{ marginTop: 0 }}>
      <div className="card-t">{datasetLabel}</div>
      <div className="card-s">
        Tick the accounts you&apos;d like to simulate disputing. We recompute utilization, average account age, and
        derogatory-account counts immediately, and translate the change into educational signal points using FICO&apos;s
        published category weights (35% payment history, 30% utilization, 15% length of history, 10% credit mix, 10%
        new credit). This is not a real FICO or VantageScore.
      </div>

      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {tradelines.map((t) => {
          const checked = removed.has(t.id)
          return (
            <label
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                border: checked
                  ? '1px solid rgba(48, 200, 120, 0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: checked ? 'rgba(48, 200, 120, 0.08)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
              }}
            >
              <input checked={checked} onChange={() => toggle(t.id)} style={{ marginTop: 4 }} type="checkbox" />
              <span style={{ display: 'block', flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 600 }}>
                  {t.creditor || 'Unknown creditor'}{' '}
                  <span style={{ opacity: 0.7, fontWeight: 400 }}>
                    {t.account_last4 ? `· ····${t.account_last4}` : ''}
                  </span>
                </span>
                <span style={{ display: 'block', fontSize: 12, opacity: 0.75 }}>
                  {t.account_type || 'Unknown type'} · {t.payment_status || t.account_status || 'No status'} ·{' '}
                  Balance {formatMoneyCents(t.balance_cents || 0)}
                  {t.credit_limit_cents
                    ? ` · Limit ${formatMoneyCents(t.credit_limit_cents)}`
                    : ''}
                  {t.opened_on ? ` · Opened ${t.opened_on}` : ''}
                </span>
              </span>
            </label>
          )
        })}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 10,
          border: '1px solid rgba(212, 175, 55, 0.3)',
          background: 'rgba(212, 175, 55, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: deltaColor }}>
            {result.signalPointsDelta > 0 ? '+' : ''}
            {result.signalPointsDelta}
          </span>
          <span style={{ opacity: 0.8 }}>educational signal points</span>
        </div>
        <div className="disc" style={{ marginTop: 8 }}>
          Capped at ±150. The breakdown below shows exactly how this number was computed.
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginTop: 16,
        }}
      >
        <SnapshotCard title="Before" snapshot={result.before} />
        <SnapshotCard title="After" snapshot={result.after} />
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="card-t" style={{ marginBottom: 6 }}>How this number was computed</div>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {result.notes.map((note, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function SnapshotCard({ title, snapshot }: { title: string; snapshot: ReturnType<typeof simulate>['before'] }) {
  return (
    <div
      className="card"
      style={{
        margin: 0,
        padding: 12,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="card-t" style={{ marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'grid', gap: 4, fontSize: 13 }}>
        <div>
          Utilization: <strong>{snapshot.utilizationPercent === null ? '—' : `${snapshot.utilizationPercent}%`}</strong>
        </div>
        <div>
          Avg. account age:{' '}
          <strong>{snapshot.averageAgeMonths === null ? '—' : `${snapshot.averageAgeMonths} mo`}</strong>
        </div>
        <div>
          Derogatory accounts: <strong>{snapshot.derogatoryCount}</strong>
        </div>
        <div>
          Total revolving balance: <strong>{formatMoneyCents(snapshot.totalBalanceCents)}</strong>
        </div>
        <div>
          Total revolving limit: <strong>{formatMoneyCents(snapshot.totalCreditLimitCents)}</strong>
        </div>
        <div>
          Tradeline count: <strong>{snapshot.tradelineCount}</strong>
        </div>
      </div>
    </div>
  )
}
