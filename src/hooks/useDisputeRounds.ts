import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabaseClient'
import type { LetterType } from '../types'

export type RoundStatus = 'drafted' | 'mailed' | 'response_received' | 'closed'
export type RoundNumber = 1 | 2 | 3 | 4

export interface DisputeRoundRow {
  id: string
  dispute_id: string
  user_id: string
  round_number: RoundNumber
  letter_type: LetterType
  status: RoundStatus
  drafted_at: string
  mailed_on: string | null
  response_due_on: string | null
  response_received_on: string | null
  outcome: string | null
  notes: string | null
  created_at: string
  updated_at?: string
}

export interface UseDisputeRoundsResult {
  rounds: DisputeRoundRow[]
  loading: boolean
  error: string
  reload: () => Promise<void>
  markMailed: (roundId: string, mailedOn: string) => Promise<void>
  markResponseReceived: (roundId: string, receivedOn: string, outcome?: string) => Promise<void>
  startRound: (roundNumber: RoundNumber, letterType: LetterType) => Promise<void>
}

const TABLE_MISSING_HINT =
  'The dispute_rounds table is not present yet. Apply migration 20260427000000_dispute_rounds.sql in Supabase.'

/**
 * Adds N days to a YYYY-MM-DD date string and returns the new date in the
 * same format. Pure helper so we don't need a date library client-side.
 */
function addDays(yyyymmdd: string, days: number): string {
  const d = new Date(`${yyyymmdd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function useDisputeRounds(disputeId: string | null | undefined, userId: string | null | undefined): UseDisputeRoundsResult {
  const [rounds, setRounds] = useState<DisputeRoundRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!disputeId || !userId || !isSupabaseConfigured) {
      setRounds([])
      return
    }
    setLoading(true)
    setError('')
    const supabase = requireSupabase()
    const result = await supabase
      .from('dispute_rounds')
      .select(
        'id, dispute_id, user_id, round_number, letter_type, status, drafted_at, mailed_on, response_due_on, response_received_on, outcome, notes, created_at, updated_at',
      )
      .eq('dispute_id', disputeId)
      .order('round_number', { ascending: true })
    setLoading(false)

    if (result.error) {
      const msg = String(result.error.message || '')
      if (/relation .* does not exist|schema cache/i.test(msg)) {
        setError(TABLE_MISSING_HINT)
      } else {
        setError('Could not load dispute rounds.')
      }
      setRounds([])
      return
    }
    setRounds((result.data ?? []) as DisputeRoundRow[])
  }, [disputeId, userId])

  const markMailed = useCallback(
    async (roundId: string, mailedOn: string) => {
      const supabase = requireSupabase()
      const responseDueOn = addDays(mailedOn, 30)
      const result = await supabase
        .from('dispute_rounds')
        .update({ status: 'mailed', mailed_on: mailedOn, response_due_on: responseDueOn })
        .eq('id', roundId)
      if (result.error) throw result.error
      await reload()
    },
    [reload],
  )

  const markResponseReceived = useCallback(
    async (roundId: string, receivedOn: string, outcome?: string) => {
      const supabase = requireSupabase()
      const result = await supabase
        .from('dispute_rounds')
        .update({
          status: 'response_received',
          response_received_on: receivedOn,
          outcome: outcome || null,
        })
        .eq('id', roundId)
      if (result.error) throw result.error
      await reload()
    },
    [reload],
  )

  const startRound = useCallback(
    async (roundNumber: RoundNumber, letterType: LetterType) => {
      if (!disputeId || !userId) {
        throw new Error('Sign in to start a new dispute round.')
      }
      const supabase = requireSupabase()
      const result = await supabase.from('dispute_rounds').insert({
        dispute_id: disputeId,
        user_id: userId,
        round_number: roundNumber,
        letter_type: letterType,
        status: 'drafted',
      })
      if (result.error) throw result.error
      await reload()
    },
    [disputeId, userId, reload],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  return { rounds, loading, error, reload, markMailed, markResponseReceived, startRound }
}

/**
 * Returns true if round N+1 can be started: round N must be in `mailed`
 * status with a response_due_on at or before today, OR `response_received`,
 * OR `closed`.
 */
export function canAdvanceFrom(round: DisputeRoundRow): boolean {
  if (round.status === 'response_received' || round.status === 'closed') return true
  if (round.status === 'mailed' && round.response_due_on) {
    return round.response_due_on <= new Date().toISOString().slice(0, 10)
  }
  return false
}
