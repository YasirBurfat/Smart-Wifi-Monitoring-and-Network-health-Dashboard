export function getApiErrorMessage(error, fallback) {
  if (error?.client && typeof error.message === 'string' && error.message) {
    return error.message
  }

  const data = error?.response?.data
  if (error?.response) {
    const detail = Array.isArray(data?.errors)
      ? data.errors.find((item) => typeof item?.message === 'string' && item.message.trim())
      : null
    if (typeof data?.message === 'string' && data.message.trim()) {
      if (detail && detail.message.trim() !== data.message.trim()) {
        return `${data.message.trim()}: ${detail.message.trim()}`
      }
      return data.message.trim()
    }
    if (detail) return detail.message.trim()
    if (typeof data?.error === 'string' && data.error.trim()) return data.error
    return fallback
  }

  return 'API down. Could not reach the server.'
}
