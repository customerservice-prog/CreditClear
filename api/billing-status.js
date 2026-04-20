import { applyCors } from './_lib/cors.js'

/**
 * Lightweight, unauthenticated status endpoint so the marketing pricing page
 * can decide whether to show the live checkout button or the waitlist card.
 * Mirrors the same env flag used by /api/create-checkout, plus the configured
 * monthly price (cents) when present.
 *
 * Response shape:
 *   { checkout_open: boolean, plan_name: string, monthly_price_cents: number | null }
 */
export default function handler(request, response) {
  if (applyCors(request, response)) return

  const raw = (process.env.CHECKOUT_PAUSED || '').trim().toLowerCase()
  const paused = raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'

  const monthlyPriceCents = parseInt(process.env.STRIPE_MONTHLY_PRICE_CENTS || '', 10)
  const planName = process.env.STRIPE_PLAN_NAME || 'CreditClear Pro'

  const aggregatorRaw = (process.env.AGGREGATOR_ENABLED || '').trim().toLowerCase()
  const aggregatorOpen =
    aggregatorRaw === '1' || aggregatorRaw === 'true' || aggregatorRaw === 'yes' || aggregatorRaw === 'on'

  response.statusCode = 200
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'public, max-age=60')
  response.end(
    JSON.stringify({
      checkout_open: !paused,
      plan_name: planName,
      monthly_price_cents: Number.isFinite(monthlyPriceCents) ? monthlyPriceCents : null,
      aggregator_open: aggregatorOpen,
    }),
  )
}
