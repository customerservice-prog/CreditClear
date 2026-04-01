import { hasPremiumAccess } from './generation.js'
import { ApiError } from './http.js'
import { supabaseAdmin } from './supabase-admin.js'

const DEFAULT_PLAN_NAME = 'CreditClear Pro'
const TRIAL_LENGTH_MS = 7 * 24 * 60 * 60 * 1000

export async function ensureAccountState(authUser) {
  const profile = await upsertProfile(authUser)
  const subscription = applyOwnerAccessOverride(authUser, await ensureSubscription(authUser))

  return {
    profile,
    subscription,
    appUser: buildAppUser(profile, subscription),
  }
}

export function assertPremiumAccess(subscription) {
  if (!subscription || !hasPremiumAccess(subscription)) {
    throw new ApiError(403, 'Your plan does not currently include draft generation access.')
  }
}

async function upsertProfile(authUser) {
  const result = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || null,
      },
      { onConflict: 'id' },
    )
    .select('id, email, full_name, created_at')
    .single()

  if (result.error || !result.data) {
    throw new ApiError(500, 'Unable to load your profile.', { expose: false })
  }

  return result.data
}

async function ensureSubscription(authUser) {
  const existingResult = await selectSubscription(authUser.id)
  if (existingResult) {
    return existingResult
  }

  const inserted = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: authUser.id,
      status: 'trialing',
      plan_name: DEFAULT_PLAN_NAME,
      trial_ends_at: getTrialEndForUser(authUser),
    })
    .select(
      'id, user_id, stripe_customer_id, stripe_subscription_id, status, plan_name, price_id, current_period_end, trial_ends_at',
    )
    .single()

  if (!inserted.error && inserted.data) {
    return inserted.data
  }

  const retryResult = await selectSubscription(authUser.id)
  if (retryResult) {
    return retryResult
  }

  throw new ApiError(500, 'Unable to load your subscription.', { expose: false })
}

async function selectSubscription(userId) {
  const result = await supabaseAdmin
    .from('subscriptions')
    .select(
      'id, user_id, stripe_customer_id, stripe_subscription_id, status, plan_name, price_id, current_period_end, trial_ends_at',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (result.error) {
    throw new ApiError(500, 'Unable to load your subscription.', { expose: false })
  }

  return result.data
}

function getTrialEndForUser(authUser) {
  const createdAtMs = Date.parse(authUser.created_at || '')
  const baseTime = Number.isFinite(createdAtMs) ? createdAtMs : Date.now()
  return new Date(baseTime + TRIAL_LENGTH_MS).toISOString()
}

function buildAppUser(profile, subscription) {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name,
    created_at: profile.created_at,
    subscription_id: subscription?.id ?? null,
    stripe_customer_id: subscription?.stripe_customer_id ?? null,
    stripe_subscription_id: subscription?.stripe_subscription_id ?? null,
    subscription_status: subscription?.status ?? null,
    subscription_price_id: subscription?.price_id ?? null,
    subscription_current_period_end: subscription?.current_period_end ?? null,
    trial_ends_at: subscription?.trial_ends_at ?? null,
  }
}

function applyOwnerAccessOverride(authUser, subscription) {
  if (!isOwnerAccessUser(authUser)) {
    return subscription
  }

  return {
    ...subscription,
    current_period_end: subscription?.current_period_end ?? null,
    plan_name: 'Owner Complimentary Access',
    status: 'active',
    trial_ends_at: subscription?.trial_ends_at ?? null,
  }
}

function isOwnerAccessUser(authUser) {
  const email = String(authUser?.email || '').trim().toLowerCase()
  if (!email) {
    return false
  }

  const configuredEmails = String(process.env.OWNER_FREE_ACCESS_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  return configuredEmails.includes(email)
}
