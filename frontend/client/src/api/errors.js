export function getApiErrorMessage(error, fallback) {
  if (error?.client && typeof error.message === 'string' && error.message) {
    return error.message
  }

  const data = error?.response?.data
  if (error?.response) {
    if (typeof data?.message === 'string' && data.message.trim()) return data.message
    if (typeof data?.error === 'string' && data.error.trim()) return data.error
    return fallback
  }

  return 'API down. Could not reach the server.'
}
