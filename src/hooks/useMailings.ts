import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabaseClient'

export type MailingStatus =
  | 'queued'
  | 'mailed'
  | 'in_transit'
  | 'delivered'
  | 'returned'
  | 'failed'
  | 'cancelled'

export interface MailingRow {
  id: string
  letter_id: string | null
  dispute_id: string | null
  bureau: string
  recipient_name: string
  recipient_address: { lines?: string[] } | Record<string, unknown>
  status: MailingStatus
  carrier: string
  service: string
  tracking_number: string | null
  postage_cents: number | null
  provider: string
  mailed_at: string | null
  delivered_at: string | null
  created_at: string
}

const TABLE_MISSING_HINT =
  'The mailings table is not present yet. Apply migration 20260428000000_mailings.sql in Supabase.'

export function useMailings(disputeId: string | null | undefined) {
  const [mailings, setMailings] = useState<MailingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!disputeId || !isSupabaseConfigured) {
      setMailings([])
      return
    }
    setLoading(true)
    setError('')
    const supabase = requireSupabase()
    const result = await supabase
      .from('mailings')
      .select(
        'id, letter_id, dispute_id, bureau, recipient_name, recipient_address, status, carrier, service, tracking_number, postage_cents, provider, mailed_at, delivered_at, created_at',
      )
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true })
    setLoading(false)
    if (result.error) {
      const msg = String(result.error.message || '')
      if (/relation .* does not exist|schema cache/i.test(msg)) {
        setError(TABLE_MISSING_HINT)
      } else {
        setError('Could not load mailings.')
      }
      setMailings([])
      return
    }
    setMailings((result.data ?? []) as MailingRow[])
  }, [disputeId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { mailings, loading, error, reload }
}

export function formatPostage(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) return '—'
  return `$${(cents / 100).toFixed(2)}`
}
