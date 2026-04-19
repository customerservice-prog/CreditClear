import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { SubscriptionProvider } from '../context/SubscriptionContext'
import { useAuthContext } from '../context/useAuthContext'
import AppRoutes from '../App'

function AppWithContexts() {
  const auth = useAuthContext()

  return (
    <SubscriptionProvider sessionEmail={auth.authUser?.email ?? null} user={auth.appUser}>
      <AppRoutes />
    </SubscriptionProvider>
  )
}

export default function AppRoot() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppWithContexts />
      </AuthProvider>
    </BrowserRouter>
  )
}
