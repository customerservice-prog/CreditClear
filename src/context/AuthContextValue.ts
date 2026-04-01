import { createContext } from 'react'
import { useAuth } from '../hooks/useAuth'

export const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null)
