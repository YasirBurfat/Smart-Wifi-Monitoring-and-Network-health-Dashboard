import { http } from './http.js'

export async function fetchUsers() {
  const { data } = await http.get('/api/users', { params: { limit: 100 } })
  return Array.isArray(data?.users) ? data.users : []
}

export async function fetchStaff() {
  const { data } = await http.get('/api/users/staff')
  return Array.isArray(data?.users) ? data.users : []
}

export async function updateUser(id, payload) {
  const { data } = await http.put(`/api/users/${id}`, payload)
  return data?.user || data
}
