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
    mapPosition: item.mapPosition ?? null,
    networkStatus: String(item.networkStatus ?? item.status ?? item.health ?? ''),
    latestDownload: numberOrNull(item.latestDownload ?? item.latestSpeed?.downloadMbps ?? item.downloadMbps),
    avgDownload: numberOrNull(item.avgDownload ?? item.averages?.download ?? item.averages?.downloadMbps),
    avgUpload: numberOrNull(item.avgUpload ?? item.averages?.upload ?? item.averages?.uploadMbps),
    avgPing: numberOrNull(item.avgPing ?? item.averages?.ping ?? item.averages?.pingMs),
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
