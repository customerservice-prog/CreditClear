import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { AgencyId } from '../types'

/**
 * Flat tradeline shape used by the Step 3 picker. We deliberately keep the
 * fields shallow (no joined report row) so the picker has everything it needs
 * to prefill an issueDetail row in one click.
 */
export interface PickableTradeline {
  id: string
  reportId: string
  bureau: AgencyId
  creditor: string | null
  accountLast4: string | null
  accountStatus: string | null
  paymentStatus: string | null
  balanceCents: number | null
  reportedOn: string | null
  pulledAt: string
}

interface UseTradelinesResult {
  tradelines: PickableTradeline[]
  loading: boolean
  error: string
  hasParsedReport: boolean
  reload: () => Promise<void>
}

/**
 * Loads every parsed tradeline for the current user across all of their
 * credit_reports rows. Returns an empty list (not an error) when the schema
 * is missing — useful in environments where the PR 2 migration hasn't been
 * applied yet.
 */
export function useTradelines(userId?: string): UseTradelinesResult {
  const [tradelines, setTradelines] = useState<PickableTradeline[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasParsedReport, setHasParsedReport] = useState(false)

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setTradelines([])
      setHasParsedReport(false)
      setLoading(false)
      return
    }
    const supabase = requireSupabase()
    setLoading(true)
    setError('')
    const result = await supabase
      .from('tradelines')
      .select(
        'id, report_id, creditor, account_last4, account_status, payment_status, balance_cents, reported_on, credit_reports!inner(bureau, pulled_at)',
      )
      .order('reported_on', { ascending: false })
      .limit(200)

    setLoading(false)

    if (result.error) {
      // Treat missing tables as "no parsed reports yet" instead of a hard error.
      if (result.error.code === '42P01' || /relation .* does not exist/i.test(result.error.message)) {
        setTradelines([])
        setHasParsedReport(false)
        return
      }
      setError(result.error.message)
      return
    }

    const rows = (result.data ?? []) as Array<{
      id: string
      report_id: string
      creditor: string | null
      account_last4: string | null
      account_status: string | null
      payment_status: string | null
      balance_cents: number | null
      reported_on: string | null
      credit_reports: { bureau: AgencyId; pulled_at: string } | { bureau: AgencyId; pulled_at: string }[] | null
    }>

    const flat: PickableTradeline[] = rows.map((row) => {
      const report = Array.isArray(row.credit_reports) ? row.credit_reports[0] : row.credit_reports
      return {
        id: row.id,
        reportId: row.report_id,
        bureau: report?.bureau ?? ('equifax' as AgencyId),
        creditor: row.creditor,
        accountLast4: row.account_last4,
        accountStatus: row.account_status,
        paymentStatus: row.payment_status,
        balanceCents: row.balance_cents,
        reportedOn: row.reported_on,
        pulledAt: report?.pulled_at ?? '',
      }
    })

    setTradelines(flat)
    setHasParsedReport(flat.length > 0)
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { tradelines, loading, error, hasParsedReport, reload }
}

export function formatTradelineMoney(cents: number | null): string {
  if (cents == null || Number.isNaN(cents)) return ''
  const dollars = cents / 100
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}
