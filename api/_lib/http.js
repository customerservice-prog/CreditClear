export class ApiError extends Error {
  constructor(status, message, options = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.expose = options.expose ?? status < 500
  }
}

export function isApiError(error) {
  return error instanceof ApiError
}

export function sendError(response, error, fallbackMessage = 'Request failed.') {
  if (isApiError(error)) {
    response.status(error.status).json({
      error: error.expose ? error.message : fallbackMessage,
    })
    return
  }

  logServerError('request', error)
  response.status(500).json({ error: fallbackMessage })
}

export function toSseErrorMessage(error, fallbackMessage = 'Unable to complete this request.') {
  if (isApiError(error) && error.expose) {
    return error.message
  }

  logServerError('sse', error)
  return fallbackMessage
}

export function logServerError(context, error) {
  if (error instanceof ApiError) {
    console.error(`[${context}]`, {
      message: error.message,
      status: error.status,
    })
    return
  }

  if (error instanceof Error) {
    console.error(`[${context}]`, {
      message: error.message,
      name: error.name,
    })
    return
  }

  console.error(`[${context}]`, { message: 'Unknown server error.' })
}
