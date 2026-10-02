import { http } from './http.js'
import { isValidUser } from './storage.js'

export async function loginRequest(email, password) {
  const { data } = await http.post('/api/auth/login', { email, password })
  return data
}

export async function registerRequest({ name, email, password }) {
  const { data } = await http.post('/api/auth/register', {
    name,
    email,
    password,
  })
  return data
}

export async function meRequest() {
  const { data } = await http.get('/api/auth/me')
  if (isValidUser(data?.user)) return data.user
  if (isValidUser(data)) return data
  return null
}
