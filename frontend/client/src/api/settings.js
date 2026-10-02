import { http } from './http.js'

export async function fetchSettings() {
  const { data } = await http.get('/api/settings')
  return data?.settings || null
}

export async function saveSettings(payload) {
  const { data } = await http.put('/api/settings', payload)
  return data
}
