import { ApiError } from './http.js'

const buckets = new Map()

export function assertRateLimit(key, limit = 5, windowMs = 60_000) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (bucket.count >= limit) {
    throw new ApiError(429, 'Too many generation requests. Please wait a moment and try again.')
  }

  bucket.count += 1
}
