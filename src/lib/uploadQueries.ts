import type { SupabaseClient } from '@supabase/supabase-js'
import type { UploadRecord } from '../types'

/** Columns that exist on every deployed schema (before report_bureau migration). */
const UPLOAD_COLUMNS_LEGACY =
  'id, user_id, dispute_id, file_path, file_name, mime_type, file_size, created_at'

type UploadsQueryResult = {
  data: UploadRecord[] | null
  error: { message: string; code?: string; details?: string; hint?: string } | null
}

/**
 * Lists uploads for the signed-in user. Tries `select('*')` first (includes report_bureau when migrated);
 * on failure, retries without relying on newer columns so older databases still work.
 */
export async function listUploadsForCurrentUser(supabase: SupabaseClient): Promise<UploadsQueryResult> {
  const preferred = await supabase.from('uploads').select('*').order('created_at', { ascending: false })

  if (!preferred.error) {
    return { data: preferred.data as UploadRecord[] | null, error: null }
  }

  const fallback = await supabase
    .from('uploads')
    .select(UPLOAD_COLUMNS_LEGACY)
    .order('created_at', { ascending: false })

  if (!fallback.error) {
    return { data: fallback.data as UploadRecord[] | null, error: null }
  }

  return { data: null, error: preferred.error }
}

/**
 * Uploads attached to one dispute (detail view). Same fallback behavior as {@link listUploadsForCurrentUser}.
 */
export async function listUploadsForDispute(
  supabase: SupabaseClient,
  disputeId: string,
): Promise<UploadsQueryResult> {
  const preferred = await supabase
    .from('uploads')
    .select('*')
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true })

  if (!preferred.error) {
    return { data: preferred.data as UploadRecord[] | null, error: null }
  }

  const fallback = await supabase
    .from('uploads')
    .select(UPLOAD_COLUMNS_LEGACY)
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true })

  if (!fallback.error) {
    return { data: fallback.data as UploadRecord[] | null, error: null }
  }

  return { data: null, error: preferred.error }
}

const BUCKET = 'private-uploads'

/** Removes the storage object and the `uploads` row. Caller should ensure RLS allows delete. */
export async function deleteUploadForCurrentUser(supabase: SupabaseClient, upload: UploadRecord) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([upload.file_path])
  if (storageError) {
    return { error: storageError }
  }

  const { error: dbError } = await supabase.from('uploads').delete().eq('id', upload.id)
  return { error: dbError ?? null }
}
