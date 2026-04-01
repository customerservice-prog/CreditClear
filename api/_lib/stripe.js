import Stripe from 'stripe'
import { getRequiredEnv } from './env.js'

export const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'))

export async function ensureStripeCustomer(profile, user) {
  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id
  }

  try {
    const existing = await stripe.customers.search({
      query: `metadata['supabaseUserId']:'${user.id}'`,
      limit: 1,
    })

    if (existing.data[0]?.id) {
      return existing.data[0].id
    }
  } catch {
    // Fallback to create below if search is unavailable.
  }

  const customer = await stripe.customers.create({
    email: user.email || undefined,
    metadata: {
      supabaseUserId: user.id,
    },
    name: user.user_metadata?.full_name || user.email || undefined,
  })

  return customer.id
}
