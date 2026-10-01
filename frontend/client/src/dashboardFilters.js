export const EMPTY_FILTERS = {
  locationId: '',
  building: '',
  date: '',
  networkStatus: '',
  complaintType: '',
  complaintStatus: '',
}

function tileName(location) {
  const raw = String(location?.networkStatus || '').toLowerCase()
  if (raw === 'green' || raw === 'excellent' || raw === 'good') return 'green'
  if (raw === 'yellow' || raw === 'fair') return 'yellow'
  if (raw === 'red' || raw === 'poor' || raw === 'critical') return 'red'
  return raw
}

function statusMatches(location, filter) {
  if (!filter) return true
  const wanted = filter.toLowerCase()
  const values = [location?.networkStatus, tileName(location)].filter(Boolean).map((value) => String(value).toLowerCase())
  return values.includes(wanted)
}

function pointLabel(point) {
  return String(point?.label || '')
}

export function applyDashboardFilters(locations, complaints, hourly, filters) {
  const safeLocations = Array.isArray(locations) ? locations : []
  const safeComplaints = Array.isArray(complaints) ? complaints : []
  const safeHourly = Array.isArray(hourly) ? hourly : []
  const next = { ...EMPTY_FILTERS, ...(filters || {}) }

  try {
    const complaintFilterOn = Boolean(next.complaintType || next.complaintStatus)
    const filteredLocations = safeLocations.filter((location) => {
      if (!location) return false
      if (next.locationId && location.id !== next.locationId) return false
      if (next.building && location.building !== next.building) return false
      if (next.networkStatus && !statusMatches(location, next.networkStatus)) return false
      if (next.date && location.latestAt && !String(location.latestAt).startsWith(next.date)) return false
      if (complaintFilterOn) {
        const related = safeComplaints.filter(
          (complaint) => complaint.locationId === location.id || complaint.locationName === location.name,
        )
        if (related.length === 0) return false
        return related.some((complaint) => {
          if (next.complaintType && complaint.type !== next.complaintType) return false
          if (next.complaintStatus && complaint.status !== next.complaintStatus) return false
          return true
        })
      }
      return true
    })

    const filteredHourly = safeHourly.filter((point) => {
      if (!next.date) return true
      return pointLabel(point).startsWith(next.date)
    })

    return { locations: filteredLocations, hourly: filteredHourly }
  } catch {
    return { locations: safeLocations, hourly: safeHourly }
  }
}
