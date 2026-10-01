const ROLES = new Set(['student', 'it', 'manager', 'admin'])

export const TOKEN_KEY = 'campusnet.token'
export const USER_KEY = 'campusnet.user'

function storageGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures so a blocked browser cannot crash the app.
  }
}

function storageRemove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage failures so a blocked browser cannot crash the app.
  }
}

export function isValidUser(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.email === 'string' &&
      ROLES.has(value.role),
  )
}

export function readToken() {
  const token = storageGet(TOKEN_KEY)
  return typeof token === 'string' && token ? token : null
}

export function readUser() {
  const raw = storageGet(USER_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return isValidUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeSession(token, user) {
  storageSet(TOKEN_KEY, token)
  storageSet(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  storageRemove(TOKEN_KEY)
  storageRemove(USER_KEY)
}
