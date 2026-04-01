import { useCallback, useState } from 'react'
import { saveUploadMetadataRequest } from '../lib/apiClient'
import { requireSupabase } from '../lib/supabaseClient'
import { buildSafeUploadPath, sanitizeUploadFileName, validateUpload } from '../lib/validators'
import type { CreditFile, UploadRecord } from '../types'

const BUCKET = 'private-uploads'

export function useUploads(userId?: string, accessToken?: string) {
  const [uploading, setUploading] = useState(false)

  const uploadFiles = useCallback(
    async (files: FileList | null, disputeId?: string | null) => {
      if (!files?.length || !userId || !accessToken) {
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
            const metadata = await saveUploadMetadataRequest(accessToken, {
              disputeId,
              fileName: sanitizeUploadFileName(file.name),
              filePath,
              fileSize: file.size,
              mimeType: file.type,
            })

            uploaded.push(mapUploadToCreditFile(metadata.upload))
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
    [accessToken, userId],
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
    size: upload.file_size,
    type: upload.mime_type,
  }
}
