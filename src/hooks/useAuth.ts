import type { Session, User } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { bootstrapUserRequest, createAccountRequest } from '../lib/apiClient'
import { captureClientError } from '../lib/monitoring'
import { isUsableFullName } from '../lib/profileName'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { AppUser } from '../types'

/**
 * Cap `getSession()` wait so the app never spins forever. Must exceed the GoTrue token timeout in
 * `supabase.ts` so a refresh during hydrate can finish (~45s + buffer).
 */
const GET_SESSION_TIMEOUT_MS = 52_000
const REFRESH_PROFILE_BUDGET_MS = 20_000

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function raceRefreshAppUser(
  refresh: () => Promise<AppUser | null>,
  context: string,
) {
  try {
    await Promise.race([refresh(), sleep(REFRESH_PROFILE_BUDGET_MS)])
  } catch (error) {
    captureClientError(error, { flow: context })
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const sessionProfileRefreshUserIdRef = useRef<string | null>(null)
  /** Keeps latest user for refreshAppUser without putting authUser in useCallback deps (avoids re-subscribing onAuthStateChange every auth tick). */
  const authUserRef = useRef<User | null>(null)

  authUserRef.current = authUser

  const refreshAppUser = useCallback(async (user?: User | null) => {
    const target = user ?? authUserRef.current
    if (!target || !isSupabaseConfigured) {
      setAppUser(null)
      return null
    }

    const supabase = requireSupabase()
    const email = target.email || ''
    const existingProfile = await supabase.from('profiles').select('full_name').eq('id', target.id).maybeSingle()
    const metaName = target.user_metadata?.full_name?.trim()
    const existingName = existingProfile.data?.full_name?.trim()
    const full_name =
      (metaName && isUsableFullName(metaName, email) ? metaName : null) ??
      (existingName && isUsableFullName(existingName, email) ? existingName : null) ??
      null

    const profileResult = await supabase
      .from('profiles')
      .upsert(
        {
          id: target.id,
          email,
          full_name,
        },
        { onConflict: 'id' },
      )
      .select('id, email, full_name, created_at')
      .single()

    if (profileResult.error) {
      throw profileResult.error
    }

    const subscriptionResult = await getSubscriptionRecord(supabase, target.id)

    /** Separate read: avoids 400 on upsert when `saved_contact` column is not migrated yet. */
    let saved_contact: AppUser['saved_contact'] = undefined
    const savedResult = await supabase.from('profiles').select('saved_contact').eq('id', target.id).maybeSingle()
    if (!savedResult.error && savedResult.data) {
      const saved = savedResult.data.saved_contact
      saved_contact =
        saved && typeof saved === 'object' && !Array.isArray(saved) ? (saved as AppUser['saved_contact']) : undefined
    }

    const nextUser: AppUser = {
      id: profileResult.data.id,
      email: profileResult.data.email,
      name: profileResult.data.full_name,
      created_at: profileResult.data.created_at,
      saved_contact,
      subscription_id: subscriptionResult?.id ?? null,
      stripe_customer_id: subscriptionResult?.stripe_customer_id ?? null,
      stripe_subscription_id: subscriptionResult?.stripe_subscription_id ?? null,
      subscription_status: subscriptionResult?.status ?? null,
      subscription_price_id: subscriptionResult?.price_id ?? null,
      subscription_current_period_end: subscriptionResult?.current_period_end ?? null,
      trial_ends_at: subscriptionResult?.trial_ends_at ?? null,
    }

    const mirrored = await mirrorSubscriptionFromServer(nextUser)

    setAppUser(mirrored)
    return mirrored
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    const supabase = requireSupabase()
    let cancelled = false

    const refreshProfileFromSession = (user: User, context: string) => {
      if (sessionProfileRefreshUserIdRef.current === user.id) {
        return
      }
      sessionProfileRefreshUserIdRef.current = user.id
      void (async () => {
        try {
          await raceRefreshAppUser(() => refreshAppUser(user), context)
        } finally {
          if (sessionProfileRefreshUserIdRef.current === user.id) {
            sessionProfileRefreshUserIdRef.current = null
          }
        }
      })()
    }

    void (async () => {
      try {
        const outcome = await Promise.race([
          supabase.auth.getSession().then((r) => ({ kind: 'ok' as const, r })),
          sleep(GET_SESSION_TIMEOUT_MS).then(() => ({ kind: 'timeout' as const })),
        ])

        if (cancelled) {
          return
        }

        if (outcome.kind === 'timeout') {
          try {
            await supabase.auth.signOut({ scope: 'local' })
          } catch {
            /* still drop client state so the UI is not stuck */
          }
          setSession(null)
          setAuthUser(null)
          setAppUser(null)
        } else {
          const { data } = outcome.r
          const nextSession = data.session ?? null
          setSession(nextSession)
          setAuthUser(nextSession?.user ?? null)

          if (nextSession?.user) {
            refreshProfileFromSession(nextSession.user, 'hydrate_profile')
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
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
          refreshProfileFromSession(nextSession.user, 'auth_state_profile')
        } else {
          setAppUser(null)
        }
      })()
    })

    return () => {
      cancelled = true
      sessionProfileRefreshUserIdRef.current = null
      subscription.unsubscribe()
    }
  }, [refreshAppUser])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = requireSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      throw error
    }

    return data
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    await createAccountRequest({ email, name, password })

    return await signIn(email, password)
  }, [signIn])

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

/**
 * Server applies owner/complimentary subscription overrides (see api/_lib/account.js).
 * The browser only reads Supabase directly, so without this mirror ops accounts show "Expired"
 * even though /api/* grants access. Bootstrap returns the same subscription row the API uses.
 */
async function mirrorSubscriptionFromServer(clientUser: AppUser): Promise<AppUser> {
  try {
    const { user: serverUser } = await bootstrapUserRequest()
    if (!serverUser.id || serverUser.id !== clientUser.id) {
      return clientUser
    }

    return {
      ...clientUser,
      subscription_id: serverUser.subscription_id ?? clientUser.subscription_id,
      stripe_customer_id: serverUser.stripe_customer_id,
      stripe_subscription_id: serverUser.stripe_subscription_id,
      subscription_status: serverUser.subscription_status,
      subscription_price_id: serverUser.subscription_price_id,
      subscription_current_period_end: serverUser.subscription_current_period_end,
      trial_ends_at: serverUser.trial_ends_at,
    }
  } catch (error) {
    captureClientError(error, { flow: 'subscription_mirror' })
    return clientUser
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
