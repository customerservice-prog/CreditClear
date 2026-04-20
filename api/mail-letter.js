import { applyCors } from './_lib/cors.js'
import { ApiError, sendError } from './_lib/http.js'
import { isMailEnabled, mailLetter, MAIL_BUREAUS } from './_lib/mail-stub.js'
import { assertRateLimit } from './_lib/rate-limit.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'
import { assertUuid } from './_lib/validation.js'

/**
 * Send a previously-generated letter through the certified-mail provider
 * (stub today, real Lob/USPS/Stannp tomorrow). Persists the result in the
 * `mailings` table, marks the related dispute_round as `mailed` (so the
 * 30-day FCRA response window starts ticking), and writes an audit_logs
 * entry.
 *
 * Request body: { letterId: uuid }
 * Response:     { mailingId, trackingNumber, postageCents, status }
 *
 * Errors:
 *  401 — not authenticated
 *  403 — letter does not belong to caller
 *  404 — letter not found
 *  409 — letter already mailed
 *  422 — bureau not supported for mail
 *  503 — mail disabled (set MAIL_ENABLED=true to enable real or stub sends)
 */
export default async function handler(request, response) {
  if (applyCors(request, response)) return

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    if (!isMailEnabled()) {
      response.status(503).json({
        error:
          "Certified-mail sending isn't enabled in this environment yet. Until then, download the letter and send it yourself, or join the waitlist to be notified when in-app mailing launches.",
        code: 'mail_disabled',
      })
      return
    }

    const authUser = await getAuthenticatedUser(request)
    assertRateLimit(`mail-letter:${authUser.id}`, 12, 60_000)

    const body = request.body || {}
    const letterId = assertUuid(body.letterId, 'letterId')

    const letterResult = await supabaseAdmin
      .from('letters')
      .select('id, dispute_id, user_id, bureau, editable_text, draft_text, issue_type')
      .eq('id', letterId)
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (letterResult.error) {
      throw new ApiError(500, 'Could not load the letter row.', { expose: false })
    }
    if (!letterResult.data) {
      throw new ApiError(404, 'Letter not found.')
    }

    const letter = letterResult.data
    const bureau = String(letter.bureau || '').toLowerCase()
    if (!MAIL_BUREAUS.includes(bureau)) {
      throw new ApiError(422, 'This letter is not addressed to a mailable bureau.', { expose: true })
    }

    const existing = await supabaseAdmin
      .from('mailings')
      .select('id, status, tracking_number')
      .eq('letter_id', letterId)
      .maybeSingle()
    if (existing.data) {
      throw new ApiError(409, 'This letter has already been mailed.', { expose: true })
    }

    const profileResult = await supabaseAdmin
      .from('profiles')
      .select('full_name, saved_contact')
      .eq('id', authUser.id)
      .maybeSingle()
    const savedContact = (profileResult.data?.saved_contact || {})
    const sender = {
      name:
        profileResult.data?.full_name ||
        [savedContact.firstName, savedContact.lastName].filter(Boolean).join(' ') ||
        authUser.email ||
        '',
      address: savedContact.address || '',
      city: savedContact.city || '',
      state: savedContact.state || '',
      zip: savedContact.zip || '',
    }

    const sent = mailLetter({
      bureau,
      letterId,
      letterText: letter.editable_text || letter.draft_text || '',
      sender,
    })

    const mailingInsert = await supabaseAdmin
      .from('mailings')
      .insert({
        user_id: authUser.id,
        letter_id: letterId,
        dispute_id: letter.dispute_id || null,
        bureau,
        recipient_name: sent.recipient.name,
        recipient_address: { lines: sent.recipient.address },
        status: 'mailed',
        carrier: 'usps',
        service: 'certified-mail',
        tracking_number: sent.trackingNumber,
        postage_cents: sent.postageCents,
        provider: 'stub',
        provider_payload: sent.providerPayload,
        mailed_at: sent.mailedAt,
      })
      .select('id, status, tracking_number, postage_cents')
      .single()

    if (mailingInsert.error || !mailingInsert.data) {
      throw new ApiError(500, 'Could not record the mailing.', { expose: false })
    }

    if (letter.dispute_id) {
      const today = new Date().toISOString().slice(0, 10)
      const due = new Date()
      due.setUTCDate(due.getUTCDate() + 30)
      const responseDueOn = due.toISOString().slice(0, 10)

      await supabaseAdmin
        .from('dispute_rounds')
        .update({ status: 'mailed', mailed_on: today, response_due_on: responseDueOn })
        .eq('dispute_id', letter.dispute_id)
        .eq('user_id', authUser.id)
        .eq('round_number', 1)
        .eq('status', 'drafted')
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: authUser.id,
      action: 'letter.mailed',
      metadata: {
        letterId,
        bureau,
        mailingId: mailingInsert.data.id,
        trackingNumber: sent.trackingNumber,
        postageCents: sent.postageCents,
        provider: 'stub',
      },
    })

    response.status(200).json({
      mailingId: mailingInsert.data.id,
      trackingNumber: mailingInsert.data.tracking_number,
      postageCents: mailingInsert.data.postage_cents,
      status: mailingInsert.data.status,
    })
  } catch (error) {
    sendError(response, error, 'Could not mail this letter.')
  }
}
