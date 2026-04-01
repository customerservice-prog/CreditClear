import { describe, expect, it } from 'vitest'
import { getSubscriptionAccess } from './subscriptionAccess'

describe('getSubscriptionAccess', () => {
  const now = new Date('2026-04-01T00:00:00.000Z').getTime()

  it('allows active paid subscriptions', () => {
    const result = getSubscriptionAccess(
      {
        created_at: '2026-03-01T00:00:00.000Z',
        email: 'test@example.com',
        id: 'user-1',
        name: 'Test User',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_current_period_end: '2026-05-01T00:00:00.000Z',
        subscription_id: 'sub-1',
        subscription_price_id: 'price_123',
        subscription_status: 'active',
        trial_ends_at: '2026-03-20T00:00:00.000Z',
      },
      now,
    )

    expect(result.canAccessApp).toBe(true)
    expect(result.hasPaidAccess).toBe(true)
    expect(result.statusLabel).toBe('Pro Active')
  })

  it('allows only unexpired trials', () => {
    const result = getSubscriptionAccess(
      {
        created_at: '2026-03-01T00:00:00.000Z',
        email: 'test@example.com',
        id: 'user-1',
        name: 'Test User',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_current_period_end: null,
        subscription_id: 'sub-1',
        subscription_price_id: null,
        subscription_status: 'trialing',
        trial_ends_at: '2026-04-03T00:00:00.000Z',
      },
      now,
    )

    expect(result.canAccessApp).toBe(true)
    expect(result.hasTrialAccess).toBe(true)
    expect(result.statusLabel).toContain('Trial:')
  })

  it('blocks expired trialing subscriptions', () => {
    const result = getSubscriptionAccess(
      {
        created_at: '2026-03-01T00:00:00.000Z',
        email: 'test@example.com',
        id: 'user-1',
        name: 'Test User',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_current_period_end: null,
        subscription_id: 'sub-1',
        subscription_price_id: null,
        subscription_status: 'trialing',
        trial_ends_at: '2026-03-25T00:00:00.000Z',
      },
      now,
    )

    expect(result.canAccessApp).toBe(false)
    expect(result.needsCheckout).toBe(true)
    expect(result.statusLabel).toBe('Expired')
  })
})
