import type { ReactNode } from 'react'
import { useSubscription } from '../hooks/useSubscription'
import type { AppUser } from '../types'
import { SubscriptionContext } from './SubscriptionContextValue'

export function SubscriptionProvider({
  children,
  user,
  sessionEmail,
}: {
  children: ReactNode
  sessionEmail?: string | null
  user: AppUser | null
}) {
  const value = useSubscription(user, sessionEmail)
  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}
