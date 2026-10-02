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
      upload: numberOrNull(point?.upload ?? point?.uploadMbps ?? point?.averageUpload ?? point?.avgUpload),
      ping: Number(point?.ping ?? point?.pingMs ?? point?.avgPing ?? 0) || 0,
      packetLoss: numberOrNull(point?.packetLoss ?? point?.averagePacketLoss),
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

export async function fetchHeatmap() {
  const { data } = await http.get('/api/dashboard/heatmap')
  const list = Array.isArray(data?.locations) ? data.locations : []
  return list.map(normalizeLocation).filter(Boolean)
}

export async function fetchTrends() {
  const { data } = await http.get('/api/dashboard/trends')
  const days = Array.isArray(data?.days) ? data.days : []
  return days
    .map((day) => ({
      label: String(day?.date || day?.label || ''),
      download: Number(day?.averageDownload ?? day?.download ?? 0) || 0,
      upload: numberOrNull(day?.averageUpload ?? day?.upload),
      ping: Number(day?.averagePing ?? day?.ping ?? 0) || 0,
      packetLoss: numberOrNull(day?.averagePacketLoss ?? day?.packetLoss),
    }))
    .filter((point) => point.label)
}
