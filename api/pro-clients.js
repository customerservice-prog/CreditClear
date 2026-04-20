import { applyCors } from './_lib/cors.js'
import { ApiError, sendError } from './_lib/http.js'
import { assertRateLimit } from './_lib/rate-limit.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'

/**
 * GET  /api/pro-clients   -> list every client this Pro user has invited
 * POST /api/pro-clients   -> invite a new client by email
 *
 * Both methods require auth AND profiles.role === 'pro'. We deliberately
 * use the service-role client so we can read the profile.role flag on the
 * server side instead of trusting the JWT alone.
 *
 * Audit-logged events:
 *   pro.client.listed     (GET)
 *   pro.client.invited    (POST success)
 */
export default async function handler(request, response) {
  if (applyCors(request, response)) return

  try {
    const user = await getAuthenticatedUser(request)
    await assertProRole(user.id)

    if (request.method === 'GET') {
      await assertRateLimit({ key: `pro-clients-list:${user.id}`, limit: 60, windowMs: 60_000 })
      const result = await supabaseAdmin
        .from('pro_clients')
        .select('id, client_user_id, client_email, client_full_name, status, invited_at, accepted_at, created_at')
        .eq('pro_user_id', user.id)
        .order('created_at', { ascending: false })
      if (result.error) throw new ApiError(500, result.error.message)

      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        event_type: 'pro.client.listed',
        metadata: { source: 'api/pro-clients', count: (result.data ?? []).length },
      })

      response.status(200).json({ clients: result.data ?? [] })
      return
    }

    if (request.method === 'POST') {
      await assertRateLimit({ key: `pro-clients-invite:${user.id}`, limit: 30, windowMs: 60_000 })
      const body = (await readJson(request)) ?? {}
      const email = String(body.client_email ?? '').trim().toLowerCase()
      const fullName = body.client_full_name ? String(body.client_full_name).trim() : null

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ApiError(400, 'A valid client email is required.')
      }
      if (email === user.email?.toLowerCase()) {
        throw new ApiError(400, 'You cannot invite yourself as a client.')
      }
      if (fullName && fullName.length > 200) {
        throw new ApiError(400, 'Client name must be under 200 characters.')
      }

      const existingClient = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      const insertResult = await supabaseAdmin
        .from('pro_clients')
        .insert({
          pro_user_id: user.id,
          client_user_id: existingClient.data?.id ?? null,
          client_email: email,
          client_full_name: fullName,
          status: existingClient.data?.id ? 'active' : 'invited',
          accepted_at: existingClient.data?.id ? new Date().toISOString() : null,
        })
        .select('id, client_user_id, client_email, client_full_name, status, invited_at, accepted_at, created_at')
        .single()

      if (insertResult.error) {
        if (insertResult.error.code === '23505') {
          throw new ApiError(409, 'You have already invited a client with that email.')
        }
        throw new ApiError(500, insertResult.error.message)
      }

      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        event_type: 'pro.client.invited',
        metadata: {
          source: 'api/pro-clients',
          client_email: email,
          existing_user_linked: Boolean(existingClient.data?.id),
        },
      })

      response.status(201).json({ client: insertResult.data })
      return
    }

    response.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    sendError(response, error, 'Could not handle pro-clients request.')
  }
}

async function assertProRole(userId) {
  const result = await supabaseAdmin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (result.error) throw new ApiError(500, result.error.message)
  const role = result.data?.role ?? 'consumer'
  if (role !== 'pro' && role !== 'admin') {
    throw new ApiError(403, 'Pro tier access required.')
  }
}

async function readJson(request) {
  if (request.body && typeof request.body === 'object') return request.body
  return await new Promise((resolve, reject) => {
    let raw = ''
    request.on('data', (chunk) => {
      raw += chunk
    })
    request.on('end', () => {
      if (!raw) return resolve(null)
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(new ApiError(400, 'Invalid JSON body.'))
      }
    })
    request.on('error', reject)
  })
}
