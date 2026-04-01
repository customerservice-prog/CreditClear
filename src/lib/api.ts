interface CheckoutResponse {
  url: string
}

async function postJson<T>(path: string, accessToken: string) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.')
  }

  return payload
}

export async function createCheckoutSession(accessToken: string) {
  return postJson<CheckoutResponse>('/api/create-checkout', accessToken)
}
