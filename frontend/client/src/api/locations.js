import { http } from './http.js'

function numberOrNull(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function normalizeLocation(item) {
  if (!item || typeof item !== 'object') return null
  const id = String(item.id ?? item._id ?? '')
  if (!id) return null
  return {
    id,
    name: String(item.name ?? item.label ?? 'Location'),
    building: String(item.building ?? item.buildingName ?? ''),
    floor: String(item.floor ?? ''),
    description: String(item.description ?? ''),
    mapPosition: item.mapPosition ?? null,
    networkStatus: String(item.networkStatus ?? item.status ?? item.health ?? item.currentStatus ?? ''),
    score: numberOrNull(item.score ?? item.averageScore),
    latestDownload: numberOrNull(item.latestDownload ?? item.latestSpeed?.downloadMbps ?? item.downloadMbps),
    avgDownload: numberOrNull(item.avgDownload ?? item.averages?.download ?? item.averages?.downloadMbps),
    avgUpload: numberOrNull(item.avgUpload ?? item.averages?.upload ?? item.averages?.uploadMbps),
    avgPing: numberOrNull(item.avgPing ?? item.averages?.ping ?? item.averages?.pingMs),
    avgPacketLoss: numberOrNull(item.avgPacketLoss ?? item.averagePacketLoss ?? item.averages?.packetLoss),
    tests: numberOrNull(item.tests ?? item.testCount),
    complaints: numberOrNull(item.complaints ?? item.complaintCount),
    latestAt: item.latestAt || item.latestTestAt || '',
  }
}

export async function fetchLocations() {
  const { data } = await http.get('/api/locations')
  const list = Array.isArray(data) ? data : data?.locations
  if (!Array.isArray(list)) return []
  return list.map(normalizeLocation).filter(Boolean)
}

export async function createLocation(payload) {
  const { data } = await http.post('/api/locations', payload)
  return normalizeLocation(data?.location || data)
}

export async function updateLocation(id, payload) {
  const { data } = await http.put(`/api/locations/${id}`, payload)
  return normalizeLocation(data?.location || data)
}

export async function deleteLocation(id) {
  const { data } = await http.delete(`/api/locations/${id}`)
  return data
}
