import axios from 'axios'
import { readToken } from './storage.js'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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
