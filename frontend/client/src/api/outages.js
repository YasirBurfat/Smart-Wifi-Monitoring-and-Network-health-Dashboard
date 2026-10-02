import { http } from './http.js'

export function outageLocationName(outage) {
  if (!outage) return 'campus'
  if (typeof outage.location === 'string' && outage.location.trim()) return outage.location.trim()
  return outage.location?.name || outage.locationName || 'campus'
}

export function isOpenOutage(outage) {
  if (!outage || typeof outage !== 'object') return false
  if (outage.active === false) return false
  const status = String(outage.status || 'active').toLowerCase()
  return status !== 'resolved' && status !== 'closed'
}

export async function fetchOutages() {
  const { data } = await http.get('/api/outages')
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.outages)) return data.outages
  return []
}

export async function updateOutage(id, status) {
  const { data } = await http.patch(`/api/outages/${id}`, { status })
  return data?.outage || data
}
