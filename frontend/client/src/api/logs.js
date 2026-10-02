import { http } from './http.js'

export async function fetchLogs() {
  const { data } = await http.get('/api/logs', { params: { limit: 100 } })
  return {
    logs: Array.isArray(data?.logs) ? data.logs : [],
    total: Number(data?.total) || 0,
  }
}
