import type { AppUser } from '../types'

interface JsonResponse {
  error?: string
}

async function apiRequest<T>(path: string, accessToken: string, body?: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = (await response.json().catch(() => ({}))) as JsonResponse & T

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.')
  }

  return payload
}

export async function createCheckoutRequest(accessToken: string) {
  return apiRequest<{ url: string }>('/api/create-checkout', accessToken)
}

export async function createPortalRequest(accessToken: string) {
  return apiRequest<{ url: string }>('/api/create-portal', accessToken)
}

export async function bootstrapUserRequest(accessToken: string) {
  return apiRequest<{ user: AppUser }>('/api/bootstrap-user', accessToken)
}

export async function createAccountRequest(body: {
  email: string
  name: string
  password: string
}) {
  const response = await fetch('/api/create-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => ({}))) as JsonResponse & { created?: boolean }

  if (!response.ok) {
    throw new Error(payload.error || 'Unable to create your account.')
  }

  return payload
}

export async function saveUploadMetadataRequest(
  accessToken: string,
  body: {
    disputeId?: string | null
    fileName: string
    filePath: string
    fileSize: number
    mimeType: string
  },
) {
  return apiRequest<{
    upload: {
      id: string
      user_id: string
      dispute_id: string | null
      file_path: string
      file_name: string
      mime_type: string
      file_size: number
      created_at: string
    }
  }>('/api/save-upload-metadata', accessToken, body)
}
