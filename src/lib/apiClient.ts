import type { AppUser } from '../types'
import { getAccessTokenForApi } from './authSession'
import { requireSupabase } from './supabase'

interface JsonResponse {
  error?: string
}

const DEFAULT_API_TIMEOUT_MS = 18_000

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

async function apiRequest<T>(
  path: string,
  body?: unknown,
  timeoutMs: number = DEFAULT_API_TIMEOUT_MS,
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const run = async (token: string) =>
    fetch(path, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

  try {
    let accessToken = await getAccessTokenForApi()
    let response = await run(accessToken)

    if (response.status === 401) {
      const supabase = requireSupabase()
      await supabase.auth.refreshSession()
      accessToken = await getAccessTokenForApi()
      response = await run(accessToken)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      throw new Error(
        response.ok
          ? 'Server returned a non-JSON response. Confirm /api/* is served on this host (same deployment as the app).'
          : `Request failed (${response.status}).`,
      )
    }

    const payload = (await response.json().catch(() => ({}))) as JsonResponse & T

    if (!response.ok) {
      throw new Error(payload.error || 'Request failed.')
    }

    return payload
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Request timed out. The server may be waking up—try again in a moment.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function createCheckoutRequest() {
  return apiRequest<{ url: string }>('/api/create-checkout')
}

export interface BillingStatus {
  checkout_open: boolean
  plan_name: string
  monthly_price_cents: number | null
  aggregator_open: boolean
  mail_open: boolean
}

export async function mailLetterRequest(body: { letterId: string }) {
  return apiRequest<{ mailingId: string; trackingNumber: string; postageCents: number; status: string }>(
    '/api/mail-letter',
    body,
  )
}

export async function pullAggregatorReportRequest(body: { bureau: 'equifax' | 'experian' | 'transunion' }) {
  return apiRequest<{
    reportId: string
    bureau: string
    source: string
    tradelineCount: number
    inquiryCount: number
    publicRecordCount: number
  }>('/api/pull-report', body)
}

/**
 * Public, unauthenticated marketing-page lookup so /pricing can decide
 * whether to render the "Start your subscription" button or fall back to the
 * waitlist card. Mirrors the same env flag used by /api/create-checkout.
 */
export async function getBillingStatus(): Promise<BillingStatus> {
  const response = await fetch('/api/billing-status', { method: 'GET' })
  if (!response.ok) {
    throw new Error(`Could not load billing status (${response.status}).`)
  }
  return (await response.json()) as BillingStatus
}

export async function createPortalRequest() {
  return apiRequest<{ url: string }>('/api/create-portal')
}

export async function bootstrapUserRequest() {
  const payload = await apiRequest<{ user: AppUser }>('/api/bootstrap-user')
  if (!payload.user?.id) {
    throw new Error('Invalid account response from server.')
  }
  return payload
}

export async function createAccountRequest(body: {
  email: string
  name: string
  password: string
}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_API_TIMEOUT_MS)

  try {
    const response = await fetch('/api/create-account', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      throw new Error(
        response.ok
          ? 'Server returned a non-JSON response. Confirm /api/create-account is available on this host.'
          : `Unable to create your account (${response.status}).`,
      )
    }

    const payload = (await response.json().catch(() => ({}))) as JsonResponse & { created?: boolean }

    if (!response.ok) {
      throw new Error(payload.error || 'Unable to create your account.')
    }

    return payload
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Account request timed out. Try again in a moment.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function joinWaitlistRequest(body: {
  email: string
  featureId: string
  source?: string
}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_API_TIMEOUT_MS)

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    try {
      const token = await getAccessTokenForApi()
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
    } catch {
      /* anonymous waitlist signup is allowed */
    }

    const response = await fetch('/api/waitlist', {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify(body),
    })

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      throw new Error(
        response.ok
          ? 'Server returned a non-JSON response. Try again in a moment.'
          : `Could not save your spot (${response.status}).`,
      )
    }

    const payload = (await response.json().catch(() => ({}))) as JsonResponse & { ok?: boolean }
    if (!response.ok) {
      throw new Error(payload.error || 'Could not save your spot. Try again in a moment.')
    }
    return payload
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('Request timed out. Try again in a moment.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function deleteAccountRequest(body: { confirm: string; reason?: string }) {
  return apiRequest<{ ok: boolean; grace_period_days: number; message: string }>(
    '/api/account-delete',
    body,
  )
}

/**
 * Triggers a JSON download of the user's full data export. Bypasses the
 * normal apiRequest helper because the response is a streamed file
 * attachment, not a JSON envelope.
 */
export async function downloadAccountExport() {
  const token = await getAccessTokenForApi()
  const response = await fetch('/api/account-export', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Could not download your export (${response.status}).`)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `creditclear-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5_000)
}

export async function parseUploadRequest(body: { uploadId: string }) {
  return apiRequest<{
    reportId: string
    bureau: 'equifax' | 'experian' | 'transunion'
    tradelineCount: number
    inquiryCount: number
    publicRecordCount: number
  }>('/api/parse-upload', body, 45_000)
}

export async function saveUploadMetadataRequest(body: {
  disputeId?: string | null
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  reportBureau?: string | null
}) {
  return apiRequest<{
    upload: {
      id: string
      user_id: string
      dispute_id: string | null
      file_path: string
      file_name: string
      mime_type: string
      file_size: number
      report_bureau: string | null
      created_at: string
    }
  }>('/api/save-upload-metadata', body)
}
