export function getRequiredEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getOptionalEnv(...names) {
  for (const name of names) {
    const value = process.env[name]
    if (value) {
      return value
    }
  }

  return undefined
}

export function getAppUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL
  }

  if (process.env.VITE_APP_URL) {
    return process.env.VITE_APP_URL
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  throw new Error('Missing APP_URL or VITE_APP_URL.')
}
