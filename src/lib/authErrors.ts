/** User-facing copy for Supabase/fetch failures (timeouts, aborts, etc.). */
export function formatAuthError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Request timed out or was interrupted. Check your connection and try again.'
  }

  if (error instanceof Error) {
    const msg = error.message
    if (
      /signal is aborted|aborted without reason|The operation was aborted|Failed to fetch|NetworkError|Load failed|timed out after \d+/i.test(
        msg,
      )
    ) {
      return 'Request timed out or was interrupted. Check your connection and try again.'
    }
    return msg
  }

  return 'Something went wrong. Please try again.'
}
