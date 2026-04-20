import { useCallback, useState } from 'react'
import { parseUploadRequest, saveUploadMetadataRequest } from '../lib/apiClient'
import { requireSupabase } from '../lib/supabaseClient'
import {
  buildSafeUploadPath,
  isImageUploadMime,
  sanitizeUploadFileName,
  validateUpload,
} from '../lib/validators'
import type { CreditFile, UploadRecord } from '../types'

const BUCKET = 'private-uploads'

export function useUploads(userId?: string) {
  const [uploading, setUploading] = useState(false)

  const uploadFiles = useCallback(
    async (files: FileList | null, disputeId?: string | null) => {
      if (!files?.length || !userId) {
        return [] as CreditFile[]
      }

      setUploading(true)
      try {
        const supabase = requireSupabase()
        const uploaded: CreditFile[] = []

        for (const file of Array.from(files)) {
          const validationError = validateUpload(file)
          if (validationError) {
            throw new Error(validationError)
          }

          const filePath = buildSafeUploadPath(userId, file.name)
          const storageResult = await supabase.storage.from(BUCKET).upload(filePath, file, {
            cacheControl: '3600',
            contentType: file.type,
            upsert: false,
          })

          if (storageResult.error) {
            throw storageResult.error
          }

          try {
            const metadata = await saveUploadMetadataRequest({
              disputeId,
              fileName: sanitizeUploadFileName(file.name),
              filePath,
              fileSize: file.size,
              mimeType: file.type,
            })

            uploaded.push(mapUploadToCreditFile(metadata.upload))

            // Fire-and-forget: kick off the parser for PDFs and screenshots so the UI can
            // show structured tradeline counts on /credit-reports without
            // blocking the wizard step. Failures here are intentionally
            // swallowed — the upload itself already succeeded.
            const mime = metadata.upload?.mime_type || ''
            if (
              metadata.upload?.id &&
              (mime === 'application/pdf' || isImageUploadMime(mime))
            ) {
              void parseUploadRequest({ uploadId: metadata.upload.id }).catch(() => {})
            }
          } catch (error) {
            await supabase.storage.from(BUCKET).remove([filePath])
            throw error
          }
        }

        return uploaded
      } finally {
        setUploading(false)
      }
    },
    [userId],
  )

  return {
    uploading,
    uploadFiles,
  }
}

function mapUploadToCreditFile(upload: UploadRecord): CreditFile {
  return {
    dispute_id: upload.dispute_id,
    file_name: upload.file_name,
    file_path: upload.file_path,
    id: upload.id,
    name: upload.file_name,
    report_bureau: (upload.report_bureau as CreditFile['report_bureau']) ?? null,
    size: upload.file_size,
    type: upload.mime_type,
  }
}
