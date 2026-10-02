import { http } from './http.js'
import { normalizeLocation } from './locations.js'

export async function fetchByLocation() {
  const { data } = await http.get('/api/analytics/by-location')
  const list = Array.isArray(data?.locations) ? data.locations : []
  return list
    .map((item) =>
      normalizeLocation({
        ...item,
        id: item.id || item.locationId,
        networkStatus: item.networkStatus || item.currentStatus || item.status,
        avgDownload: item.avgDownload ?? item.averageDownload,
        avgUpload: item.avgUpload ?? item.averageUpload,
        avgPing: item.avgPing ?? item.averagePing,
        tests: item.tests ?? item.testCount,
        complaints: item.complaints ?? item.complaintCount,
      }),
    )
    .filter(Boolean)
}

export async function fetchHourly() {
  const { data } = await http.get('/api/analytics/hourly')
  const hours = Array.isArray(data?.hours) ? data.hours : []
  return hours.map((point) => ({
    label: String(point?.label || point?.hour || ''),
    download: Number(point?.download ?? point?.averageDownload ?? 0) || 0,
    upload: point?.averageUpload == null ? null : Number(point.averageUpload) || 0,
    ping: Number(point?.ping ?? point?.averagePing ?? 0) || 0,
    packetLoss: point?.averagePacketLoss == null ? null : Number(point.averagePacketLoss) || 0,
  }))
}

export async function fetchDaily() {
  const { data } = await http.get('/api/analytics/daily')
  const days = Array.isArray(data?.days) ? data.days : []
  return days.map((day) => ({
    label: String(day?.date || day?.label || ''),
    download: Number(day?.averageDownload ?? day?.download ?? 0) || 0,
    upload: day?.averageUpload == null ? null : Number(day.averageUpload) || 0,
    ping: Number(day?.averagePing ?? day?.ping ?? 0) || 0,
    packetLoss: day?.averagePacketLoss == null ? null : Number(day.averagePacketLoss) || 0,
  }))
}

export async function fetchComplaintsByBuilding() {
  const { data } = await http.get('/api/analytics/complaints-by-building')
  return Array.isArray(data?.buildings) ? data.buildings : []
}
