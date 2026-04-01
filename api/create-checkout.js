import { ensureAccountState } from './_lib/account.js'
import { applyCors } from './_lib/cors.js'
import { getAppUrl, getRequiredEnv } from './_lib/env.js'
import { ApiError, sendError } from './_lib/http.js'
import { ensureStripeCustomer, stripe } from './_lib/stripe.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'

export default async function handler(request, response) {
  if (applyCors(request, response)) {
    return
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const authUser = await getAuthenticatedUser(request)
    const appUrl = getAppUrl()
    const priceId = getRequiredEnv('STRIPE_PRICE_ID')
    const { profile: profileRow, subscription: subscriptionRow } = await ensureAccountState(authUser)

    if (subscriptionRow.status === 'active') {
      throw new ApiError(409, 'Your subscription is already active.')
    }

    const customerId = await ensureStripeCustomer(subscriptionRow, authUser)

    const profileUpdate = await supabaseAdmin
      .from('profiles')
      .update({ email: authUser.email || profileRow.email || '', full_name: authUser.user_metadata?.full_name || profileRow.full_name || null })
      .eq('id', authUser.id)

    if (profileUpdate.error) {
      throw new ApiError(500, 'Unable to sync your billing profile.', { expose: false })
    }

    const subscriptionUpdate = await supabaseAdmin
      .from('subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', authUser.id)

    if (subscriptionUpdate.error) {
      throw new ApiError(500, 'Unable to prepare your billing record.', { expose: false })
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      cancel_url: `${appUrl}/billing?checkout=cancelled`,
      client_reference_id: authUser.id,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        supabaseUserId: authUser.id,
      },
      mode: 'subscription',
      success_url: `${appUrl}/billing?checkout=success`,
      subscription_data: {
        metadata: {
          supabaseUserId: authUser.id,
        },
      },
    })

    response.status(200).json({ url: checkoutSession.url })
  } catch (error) {
    sendError(response, error, 'Unable to create checkout session.')
  }
}
