import type { Session, User } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { bootstrapUserRequest } from '../lib/apiClient'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { AppUser } from '../types'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const refreshAppUser = useCallback(
    async (user = authUser, accessToken = session?.access_token) => {
      if (!user || !isSupabaseConfigured) {
        setAppUser(null)
        return null
      }

      if (accessToken) {
        try {
          const bootstrapResult = await bootstrapUserRequest(accessToken)
          setAppUser(bootstrapResult.user)
          return bootstrapResult.user
        } catch {
          // Fall back to direct client reads so auth still works if the API is temporarily unavailable.
        }
      }

      const supabase = requireSupabase()
      const profileResult = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || null,
          },
          { onConflict: 'id' },
        )
        .select('id, email, full_name, created_at')
        .single()

      if (profileResult.error) {
        throw profileResult.error
      }

      const subscriptionResult = await getSubscriptionRecord(supabase, user.id)

      const nextUser: AppUser = {
        id: profileResult.data.id,
        email: profileResult.data.email,
        name: profileResult.data.full_name,
        created_at: profileResult.data.created_at,
        subscription_id: subscriptionResult?.id ?? null,
        stripe_customer_id: subscriptionResult?.stripe_customer_id ?? null,
        stripe_subscription_id: subscriptionResult?.stripe_subscription_id ?? null,
        subscription_status: subscriptionResult?.status ?? null,
        subscription_price_id: subscriptionResult?.price_id ?? null,
        subscription_current_period_end: subscriptionResult?.current_period_end ?? null,
        trial_ends_at: subscriptionResult?.trial_ends_at ?? null,
      }

      setAppUser(nextUser)
      return nextUser
    },
    [authUser, session?.access_token],
  )

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    const supabase = requireSupabase()
    let cancelled = false

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) {
        return
      }

      setSession(data.session ?? null)
      setAuthUser(data.session?.user ?? null)

      if (data.session?.user) {
        await refreshAppUser(data.session.user, data.session.access_token)
      }

      if (!cancelled) {
        setLoading(false)
      }
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        if (cancelled) {
          return
        }

        setSession(nextSession ?? null)
        setAuthUser(nextSession?.user ?? null)

        if (nextSession?.user) {
          await refreshAppUser(nextSession.user, nextSession.access_token)
        } else {
          setAppUser(null)
        }
      })()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [refreshAppUser])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = requireSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    if (data.user) {
      await refreshAppUser(data.user, data.session?.access_token)
    }

    return data
  }, [refreshAppUser])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const supabase = requireSupabase()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/app`,
      },
    })

    if (error) {
      throw error
    }

    if (data.user && data.session?.access_token) {
      await refreshAppUser(data.user, data.session.access_token)
    }

    return data
  }, [refreshAppUser])

  const signInWithGoogle = useCallback(async () => {
    const supabase = requireSupabase()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = requireSupabase()
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }

    setSession(null)
    setAuthUser(null)
    setAppUser(null)
  }, [])

  return {
    appUser,
    authUser,
    loading,
    refreshAppUser,
    session,
    signIn,
    signInWithGoogle,
    signOut,
    signUp,
  }
}

async function getSubscriptionRecord(
  supabase: ReturnType<typeof requireSupabase>,
  userId: string,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await supabase
      .from('subscriptions')
      .select(
        'id, user_id, stripe_customer_id, stripe_subscription_id, status, plan_name, price_id, current_period_end, trial_ends_at',
      )
      .eq('user_id', userId)
      .maybeSingle()

    if (result.error) {
      throw result.error
    }

    if (result.data) {
      return result.data
    }

    await wait(250)
  }

  return null
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
