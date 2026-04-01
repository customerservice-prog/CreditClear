import { createContext } from 'react'
import { useSubscription } from '../hooks/useSubscription'

export const SubscriptionContext = createContext<ReturnType<typeof useSubscription> | null>(null)
