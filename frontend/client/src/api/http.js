import axios from 'axios'
import { clearSession, readToken } from './storage.js'

const baseURL = import.meta.env.VITE_API_URL

export const http = axios.create({
  baseURL,
  timeout: 4000,
})

http.interceptors.request.use((config) => {
  const token = readToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const url = String(error?.config?.url || '')
    const authAttempt = url.includes('/api/auth/login') || url.includes('/api/auth/register')
    if (status === 401 && !authAttempt) {
      clearSession()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)
