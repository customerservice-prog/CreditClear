import { getPublicEnv } from './publicEnv'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

const measurementId = getPublicEnv('VITE_GA_MEASUREMENT_ID')

export function initAnalytics() {
  if (!measurementId || typeof document === 'undefined') {
    return
  }

  if (document.getElementById('ga-script')) {
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.id = 'ga-script'
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args)
  }

  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })
}

export function trackPageView(path: string, title?: string) {
  if (!measurementId || !window.gtag) {
    return
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
  })
}

export function trackEvent(name: string, params?: Record<string, string | number | boolean | undefined>) {
  if (!measurementId || !window.gtag) {
    return
  }

  window.gtag('event', name, params || {})
}
