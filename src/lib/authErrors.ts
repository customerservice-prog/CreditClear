/** User-facing copy for Supabase/fetch failures (timeouts, aborts, etc.). */
export function formatAuthError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Request timed out or was interrupted. Check your connection and try again.'
  }

  let msg = ''
  if (error instanceof Error) {
    msg = error.message.trim()
  } else if (error && typeof error === 'object' && 'message' in error) {
    msg = String((error as { message: unknown }).message ?? '').trim()
  }

  if (!msg) {
    return 'Something went wrong. Please try again.'
  }

  if (
    /signal is aborted|aborted without reason|The operation was aborted|Failed to fetch|NetworkError|Load failed|timed out after \d+/i.test(
      msg,
    )
  ) {
    return 'Request timed out or was interrupted. Check your connection and try again.'
  }

  return msg
}
