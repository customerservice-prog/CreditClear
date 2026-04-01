import { getRequiredEnv } from './_lib/env.js'
import { logServerError } from './_lib/http.js'
import { stripe } from './_lib/stripe.js'
import { supabaseAdmin } from './_lib/supabase-admin.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const body = await readRawBody(request)
    const signature = request.headers['stripe-signature']
    const event = stripe.webhooks.constructEvent(body, signature, getRequiredEnv('STRIPE_WEBHOOK_SECRET'))

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription)
          await syncSubscription(subscription, session.metadata?.supabaseUserId || session.client_reference_id)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object)
        break
      default:
        break
    }

    response.status(200).json({ received: true })
  } catch (error) {
    logServerError('stripe_webhook', error)
    response.status(isSignatureError(error) ? 400 : 500).json({
      error: 'Webhook handling failed.',
    })
  }
}

async function syncSubscription(subscription, fallbackUserId) {
  const customerId = String(subscription.customer)
  const userId = subscription.metadata?.supabaseUserId || fallbackUserId || null
  const status = mapStripeStatus(subscription.status)
  const payload = {
    current_period_end: toIso(subscription.current_period_end),
    price_id: subscription.items.data[0]?.price?.id || null,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status,
    trial_ends_at: toIso(subscription.trial_end),
  }

  if (userId) {
    const result = await supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: userId,
        ...payload,
      },
      { onConflict: 'user_id' },
    )

    if (result.error) {
      throw result.error
    }
    return
  }

  const result = await supabaseAdmin.from('subscriptions').update(payload).eq('stripe_customer_id', customerId)
  if (result.error) {
    throw result.error
  }
}

function mapStripeStatus(status) {
  if (status === 'active') return 'active'
  if (status === 'trialing') return 'trialing'
  if (status === 'past_due') return 'past_due'
  if (status === 'canceled') return 'expired'
  if (status === 'unpaid' || status === 'paused' || status === 'incomplete') return 'past_due'
  if (status === 'incomplete_expired') return 'expired'
  return 'past_due'
}

function isSignatureError(error) {
  return error instanceof Error && /signature/i.test(error.message)
}

function toIso(unixSeconds) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null
}

async function readRawBody(request) {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}
