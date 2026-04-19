import { useCallback, useEffect, useState } from 'react'
import { formatAgencyName, formatIssueLabel } from '../lib/formatters'
import { requireSupabase } from '../lib/supabaseClient'
import { listUploadsForDispute } from '../lib/uploadQueries'
import type { DisputeDetail, DisputeRecord, Letter, UploadRecord } from '../types'

export function useDisputes(userId?: string) {
  const [disputes, setDisputes] = useState<DisputeRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!userId) {
      setDisputes([])
      setError('')
      return []
    }

    setLoading(true)
    setError('')
    const supabase = requireSupabase()
    const disputesResult = await supabase
      .from('disputes')
      .select('id, user_id, title, status, bureau_targets, issue_categories, personal_info, ai_summary, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    setLoading(false)

    if (disputesResult.error) {
      setError('We could not load your saved disputes right now.')
      throw disputesResult.error
    }

    const nextDisputes = (disputesResult.data ?? []) as DisputeRecord[]
    setDisputes(nextDisputes)
    return nextDisputes
  }, [userId])

  const getDetail = useCallback(async (disputeId: string) => {
    const supabase = requireSupabase()
    const [disputeResult, lettersResult, uploadsResult] = await Promise.all([
      supabase
        .from('disputes')
        .select('id, user_id, title, status, bureau_targets, issue_categories, personal_info, ai_summary, created_at, updated_at')
        .eq('id', disputeId)
        .single(),
      supabase
        .from('letters')
        .select('id, dispute_id, user_id, bureau, issue_type, draft_text, editable_text, created_at, updated_at')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true }),
      listUploadsForDispute(supabase, disputeId),
    ])

    if (disputeResult.error) {
      throw disputeResult.error
    }

    if (lettersResult.error) {
      throw lettersResult.error
    }

    if (uploadsResult.error) {
      throw uploadsResult.error
    }

    const letters: Letter[] = (lettersResult.data ?? []).map((letter) => ({
      agency: letter.bureau,
      agencyName: formatAgencyName(letter.bureau),
      id: letter.id,
      issue: letter.issue_type,
      issueIcon: '📄',
      issueLabel: formatIssueLabel(letter.issue_type),
      issueType: letter.issue_type,
      subject: `${formatAgencyName(letter.bureau)} dispute draft`,
      text: letter.editable_text || letter.draft_text,
    })) as Letter[]

    return {
      ...(disputeResult.data as DisputeRecord),
      letters,
      uploads: (uploadsResult.data ?? []) as UploadRecord[],
    } as DisputeDetail
  }, [])

  const updateLetterText = useCallback(async (letterId: string, text: string) => {
    const supabase = requireSupabase()
    const result = await supabase
      .from('letters')
      .update({ editable_text: text })
      .eq('id', letterId)

    if (result.error) {
      throw result.error
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh().catch(() => undefined)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [refresh])

  return {
    disputes,
    error,
    getDetail,
    loading,
    refresh,
    setDisputes,
    updateLetterText,
  }
}
