import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN
const environment = import.meta.env.VITE_APP_ENV || 'development'

export function initMonitoring() {
  if (!dsn) {
    return
  }

  Sentry.init({
    dsn,
    enabled: environment !== 'test',
    environment,
    integrations: [],
    tracesSampleRate: environment === 'production' ? 0.1 : 1,
  })
}

export function captureClientError(error: unknown, context?: Record<string, string>) {
  if (!dsn) {
    return
  }

  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => scope.setTag(key, value))
      Sentry.captureException(error)
    })
    return
  }

  Sentry.captureException(error)
}

export { Sentry }
