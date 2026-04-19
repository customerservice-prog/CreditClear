import { useEffect, useMemo, useState } from 'react'
import { getSubscriptionAccess } from '../lib/subscriptionAccess'
import type { AppUser } from '../types'

export function useSubscription(user: AppUser | null, sessionEmail?: string | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 60000)

    return () => window.clearInterval(interval)
  }, [])

  return useMemo(() => getSubscriptionAccess(user, now, sessionEmail), [now, user, sessionEmail])
}
