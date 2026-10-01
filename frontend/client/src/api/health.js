import { http } from './http.js'

export async function fetchHealth() {
  const { data } = await http.get('/api/health')
  return data?.status === 'ok'
}
