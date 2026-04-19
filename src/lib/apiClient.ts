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
