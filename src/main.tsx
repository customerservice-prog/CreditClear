import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { initAnalytics } from './lib/analytics'
import { initMonitoring } from './lib/monitoring'
import './styles/globals.css'
import App from './app/main.tsx'

initMonitoring()
initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
