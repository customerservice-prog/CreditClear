import { useEffect, useState } from 'react'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'

export type ProfileRole = 'consumer' | 'pro' | 'admin'

interface UseProRoleResult {
  role: ProfileRole
  loading: boolean
  error: string
}

/**
 * Reads the authenticated user's profiles.role column. Falls back to
 * 'consumer' for any error or missing row so the UI never crashes a
 * normal user just because Pro tier scaffolding isn't fully provisioned.
 */
export function useProRole(userId: string | null | undefined): UseProRoleResult {
  const [role, setRole] = useState<ProfileRole>('consumer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!userId || !isSupabaseConfigured) {
        setRole('consumer')
        return
      }
      setLoading(true)
      setError('')
      const supabase = requireSupabase()
      const result = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()
      if (cancelled) return
      setLoading(false)
      if (result.error) {
        if (
          result.error.code === '42703' ||
          result.error.code === '42P01' ||
          /column .* does not exist/i.test(result.error.message)
        ) {
          setRole('consumer')
          return
        }
        setError(result.error.message)
        return
      }
      const next = (result.data?.role as ProfileRole | undefined) ?? 'consumer'
      setRole(next === 'pro' || next === 'admin' ? next : 'consumer')
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [userId])

  return { role, loading, error }
}
