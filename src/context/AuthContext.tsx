import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AuthContext } from './AuthContextValue'

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuth()
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
