import { useContext } from 'react'
import { SubscriptionContext } from './SubscriptionContextValue'

export function useSubscriptionContext() {
  const value = useContext(SubscriptionContext)

  if (!value) {
    throw new Error('useSubscriptionContext must be used inside SubscriptionProvider.')
  }

  return value
}
