import { ensureAccountState } from './_lib/account.js'
import { applyCors } from './_lib/cors.js'
import { getAppUrl } from './_lib/env.js'
import { ApiError, sendError } from './_lib/http.js'
import { stripe } from './_lib/stripe.js'
import { getAuthenticatedUser } from './_lib/supabase-admin.js'

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
    const { subscription } = await ensureAccountState(authUser)

    if (!subscription?.stripe_customer_id) {
      throw new ApiError(400, 'This account uses complimentary access and does not need billing management.')
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    })

    response.status(200).json({ url: session.url })
  } catch (error) {
    sendError(response, error, 'Unable to open billing management.')
  }
}
