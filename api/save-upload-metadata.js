import { applyCors } from './_lib/cors.js'
import { getAuthenticatedUser, supabaseAdmin } from './_lib/supabase-admin.js'
import { ApiError, sendError } from './_lib/http.js'
import { assertUploadMetadata } from './_lib/validation.js'

export default async function handler(request, response) {
  if (applyCors(request, response)) {
    return
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const authUser = await getAuthenticatedUser(request)
    const metadata = assertUploadMetadata({
      ...(request.body || {}),
      userId: authUser.id,
    })

    if (metadata.disputeId) {
      const disputeResult = await supabaseAdmin
        .from('disputes')
        .select('id')
        .eq('id', metadata.disputeId)
        .eq('user_id', authUser.id)
        .single()

      if (disputeResult.error || !disputeResult.data) {
        throw new ApiError(403, 'You cannot attach files to that dispute.')
      }
    }

    const inserted = await supabaseAdmin
      .from('uploads')
      .insert({
        dispute_id: metadata.disputeId,
        file_name: metadata.fileName,
        file_path: metadata.filePath,
        file_size: metadata.fileSize,
        mime_type: metadata.mimeType,
        user_id: authUser.id,
      })
      .select('id, user_id, dispute_id, file_path, file_name, mime_type, file_size, created_at')
      .single()

    if (inserted.error) {
      throw new ApiError(500, 'Unable to save upload metadata.', { expose: false })
    }

    response.status(200).json({ upload: inserted.data })
  } catch (error) {
    sendError(response, error, 'Unable to save upload metadata.')
  }
}
