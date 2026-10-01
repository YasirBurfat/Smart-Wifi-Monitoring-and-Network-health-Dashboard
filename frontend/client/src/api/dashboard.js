import { http } from './http.js'
import { normalizeLocation } from './locations.js'

function numberOrNull(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeHourly(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((point) => ({
      label: String(point?.label || point?.hour || point?.time || point?.date || ''),
      download: Number(point?.download ?? point?.downloadMbps ?? point?.avgDownload ?? 0) || 0,
      ping: Number(point?.ping ?? point?.pingMs ?? point?.avgPing ?? 0) || 0,
    }))
    .filter((point) => point.label)
}

export function emptySummary() {
  return {
    testsToday: null,
    avgDownload: null,
    avgUpload: null,
    avgPing: null,
    poorLocations: null,
    openComplaints: null,
    resolvedComplaints: null,
    currentOutages: null,
    locations: [],
    hourly: [],
  }
}

export function normalizeSummary(data) {
  const root = data?.summary && typeof data.summary === 'object' ? data.summary : data || {}
  const locationSource = Array.isArray(root.locations) ? root.locations : []
  return {
    testsToday: numberOrNull(root.testsToday),
    avgDownload: numberOrNull(root.avgDownload),
    avgUpload: numberOrNull(root.avgUpload),
    avgPing: numberOrNull(root.avgPing),
    poorLocations: numberOrNull(root.poorLocations),
    openComplaints: numberOrNull(root.openComplaints),
    resolvedComplaints: numberOrNull(root.resolvedComplaints),
    currentOutages: numberOrNull(root.currentOutages),
    locations: locationSource.map(normalizeLocation).filter(Boolean),
    hourly: normalizeHourly(root.hourly || root.hourlyTests || root.series),
  }
}

export async function fetchSummary() {
  const { data } = await http.get('/api/dashboard/summary')
  return normalizeSummary(data)
}
