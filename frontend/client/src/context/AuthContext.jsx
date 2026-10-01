import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loginRequest, meRequest } from '../api/auth.js'
import { getApiErrorMessage } from '../api/errors.js'
import { clearSession, isValidUser, readToken, readUser, writeSession } from '../api/storage.js'

const AuthContext = createContext(null)

function clientError(message) {
  const error = new Error(message)
  error.client = true
  return error
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readToken())
  const [user, setUser] = useState(() => readUser())
  const [ready, setReady] = useState(() => !readToken())
  const [apiWarning, setApiWarning] = useState('')

  const establishSession = useCallback((nextToken, nextUser) => {
    if (typeof nextToken !== 'string' || !nextToken || !isValidUser(nextUser)) {
      throw clientError('The server returned an unexpected account response.')
    }
    writeSession(nextToken, nextUser)
    setToken(nextToken)
    setUser(nextUser)
    setApiWarning('')
    setReady(true)
    return nextUser
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setUser(null)
    setApiWarning('')
    setReady(true)
  }, [])

  const login = useCallback(
    async (email, password) => {
      const data = await loginRequest(email, password)
      return establishSession(data?.token, data?.user)
    },
    [establishSession],
  )

  useEffect(() => {
    if (!token) {
      setReady(true)
      return undefined
    }

    let active = true
    const cached = readUser()

    meRequest()
      .then((nextUser) => {
        if (!active) return
        if (!isValidUser(nextUser)) throw clientError('The server returned an unexpected account response.')
        writeSession(token, nextUser)
        setUser(nextUser)
        setApiWarning('')
      })
      .catch((error) => {
        if (!active) return
        const status = error?.response?.status
        if (status === 401 || status === 403 || !isValidUser(cached)) {
          clearSession()
          setToken(null)
          setUser(null)
          setApiWarning('')
          return
        }
        if (error?.client) {
          setApiWarning(error.message)
          return
        }
        if (!error?.response) {
          setApiWarning('API down. Could not reach the server.')
          return
        }
        setApiWarning(getApiErrorMessage(error, 'The server could not load your account.'))
      })
      .finally(() => {
        if (active) setReady(true)
      })

    return () => {
      active = false
    }
  }, [token])

  const value = useMemo(
    () => ({
      token,
      user,
      ready,
      apiWarning,
      login,
      logout,
      establishSession,
    }),
    [token, user, ready, apiWarning, login, logout, establishSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
