import type { ReactNode } from 'react'
import { useSubscription } from '../hooks/useSubscription'
import type { AppUser } from '../types'
import { SubscriptionContext } from './SubscriptionContextValue'

export function SubscriptionProvider({
  children,
  user,
}: {
  children: ReactNode
  user: AppUser | null
}) {
  const value = useSubscription(user)
  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}
