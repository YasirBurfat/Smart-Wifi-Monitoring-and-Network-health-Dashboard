import { http } from './http.js'

export const COMPLAINT_TYPES = [
  'slow internet',
  'no connection',
  'wifi dropping',
  'login/authentication',
  'high latency',
  'hardware/access point',
  'other',
]

export const COMPLAINT_SEVERITIES = ['low', 'medium', 'high', 'critical']

export const COMPLAINT_STATUSES = ['Submitted', 'Reviewed', 'Assigned', 'In Progress', 'Resolved']

function asList(data, key) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.[key])) return data[key]
  return []
}

export function normalizeComplaint(item) {
  if (!item || typeof item !== 'object') return null
  const id = String(item.id ?? item._id ?? '')
  if (!id) return null
  const notes = asList(item.notes, 'notes')
  const location = item.location
  return {
    id,
    type: String(item.type || item.category || ''),
    severity: String(item.severity || 'medium'),
    description: String(item.description || ''),
    locationId: String(item.locationId ?? location?.id ?? location?._id ?? ''),
    locationName: String(
      location?.name || item.locationName || (typeof location === 'string' ? location : '') || '',
    ),
    status: String(item.status || 'Submitted'),
    assignee: String(item.assignee || item.assignedTo?.name || ''),
    assignedToId: String(item.assignedTo?.id || item.assignedToId || ''),
    notes: notes
      .map((note, index) => {
        if (typeof note === 'string') return { id: `${id}-note-${index}`, note, createdAt: '' }
        const text = note?.note || note?.text || ''
        if (!text) return null
        return {
          id: String(note.id ?? note._id ?? `${id}-note-${index}`),
          note: String(text),
          createdAt: note.createdAt || '',
        }
      })
      .filter(Boolean),
    testId: String(item.testId || item.latestTestId || ''),
    attachLatestTest: Boolean(item.attachLatestTest),
    createdAt: item.createdAt || '',
    userId: String(item.userId || item.user?.id || (typeof item.user === 'string' ? item.user : '') || ''),
  }
}

export async function fetchComplaints(params = {}) {
  const query = {}
  if (params.locationId) query.location = params.locationId
  if (params.type) query.type = params.type
  if (params.status) query.status = params.status
  if (params.date) query.date = params.date
  if (params.limit) query.limit = params.limit
  const { data } = await http.get('/api/complaints', { params: query })
  return asList(data, 'complaints').map(normalizeComplaint).filter(Boolean)
}

export async function createComplaint(payload) {
  const { data } = await http.post('/api/complaints', payload)
  return normalizeComplaint(data?.complaint || data)
}

export async function updateComplaintStatus(id, payload) {
  const { data } = await http.patch(`/api/complaints/${id}/status`, payload)
  const complaint = normalizeComplaint(data?.complaint || data)
  if (complaint) return complaint
  return { id: String(id), status: payload.status, assignee: payload.assignee || '' }
}

export async function assignComplaint(id, payload) {
  const { data } = await http.patch(`/api/complaints/${id}/assign`, payload)
  return normalizeComplaint(data?.complaint || data)
}

export async function addComplaintNote(id, note) {
  const { data } = await http.post(`/api/complaints/${id}/notes`, { note })
  return normalizeComplaint(data?.complaint || data)
}
