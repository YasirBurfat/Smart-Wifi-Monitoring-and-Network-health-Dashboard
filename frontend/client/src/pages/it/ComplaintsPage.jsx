import { useEffect, useMemo, useState } from 'react'
import {
  COMPLAINT_STATUSES,
  COMPLAINT_TYPES,
  addComplaintNote,
  assignComplaint,
  fetchComplaints,
  updateComplaintStatus,
} from '../../api/complaints.js'
import { getApiErrorMessage } from '../../api/errors.js'
import { fetchLocations } from '../../api/locations.js'
import { fetchStaff } from '../../api/users.js'
import { fieldClass } from '../../components/formStyles.js'
import RequestError from '../../components/RequestError.jsx'
import { WidgetSkeleton } from '../../components/Skeleton.jsx'

const STATUS_ORDER = 'Submitted → Reviewed → Assigned → In Progress → Resolved'

function nextStatus(current) {
  const index = COMPLAINT_STATUSES.indexOf(current)
  if (index < 0 || index >= COMPLAINT_STATUSES.length - 1) return ''
  return COMPLAINT_STATUSES[index + 1]
}

export default function ItComplaintsPage() {
  const [complaints, setComplaints] = useState([])
  const [locations, setLocations] = useState([])
  const [staff, setStaff] = useState([])
  const [state, setState] = useState('loading')
  const [filters, setFilters] = useState({ locationId: '', type: '', status: '', date: '' })
  const [selectedId, setSelectedId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')
  const [noteError, setNoteError] = useState('')
  const [pending, setPending] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    document.title = 'CampusNet · Complaints'
  }, [])

  useEffect(() => {
    let active = true
    Promise.allSettled([fetchComplaints(filters), fetchLocations(), fetchStaff()]).then(([complaintResult, locationResult, staffResult]) => {
      if (!active) return
      setComplaints(complaintResult.status === 'fulfilled' ? complaintResult.value : [])
      setLocations(locationResult.status === 'fulfilled' ? locationResult.value : [])
      setStaff(staffResult.status === 'fulfilled' ? staffResult.value : [])
      setListError(complaintResult.status === 'fulfilled' ? '' : getApiErrorMessage(complaintResult.reason, 'Could not load complaints.'))
      setState(complaintResult.status === 'fulfilled' ? 'ready' : 'error')
    })
    return () => {
      active = false
    }
  }, [filters, attempt])

  const selected = complaints.find((complaint) => complaint.id === selectedId) || null

  useEffect(() => {
    if (!selected) return
    setAssigneeId(selected.assignedToId || '')
    setNote('')
    setError('')
  }, [selected])

  useEffect(() => {
    if (!selectedId) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setSelectedId('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  const visible = useMemo(() => complaints, [complaints])

  function replaceComplaint(next) {
    setComplaints((current) => current.map((item) => (item.id === next.id ? { ...item, ...next } : item)))
  }

  async function onMoveStatus(event) {
    event.preventDefault()
    if (!selected) return
    const status = nextStatus(selected.status)
    if (!status) return
    if (status === 'Assigned' && !assigneeId && !selected.assignedToId) {
      setError('Assign a staff member before moving this complaint to Assigned.')
      return
    }
    setPending(true)
    setError('')
    try {
      const payload = { status }
      if (status === 'Assigned' && (assigneeId || selected.assignedToId)) {
        payload.assigneeId = assigneeId || selected.assignedToId
      }
      const updated = await updateComplaintStatus(selected.id, payload)
      if (updated?.id) replaceComplaint({ ...selected, ...updated, id: selected.id })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update the complaint.'))
    } finally {
      setPending(false)
    }
  }

  async function onAssign(event) {
    event.preventDefault()
    if (!selected) return
    if (!assigneeId) {
      setError('Choose a staff member.')
      return
    }
    setPending(true)
    setError('')
    try {
      const updated = await assignComplaint(selected.id, { assigneeId })
      if (updated?.id) replaceComplaint({ ...selected, ...updated, id: selected.id })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not assign the complaint.'))
    } finally {
      setPending(false)
    }
  }

  async function onAddNote(event) {
    event.preventDefault()
    if (!selected || !note.trim()) {
      setNoteError('Enter a note.')
      return
    }
    setNoteError('')
    setPending(true)
    setError('')
    try {
      const updated = await addComplaintNote(selected.id, note.trim())
      if (updated?.id) replaceComplaint({ ...selected, ...updated, id: selected.id })
      setNote('')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not add the note.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="max-w-5xl">
      <h2 className="text-2xl font-semibold">Complaints</h2>
      <p className="mt-2 text-sm text-slate-400">{STATUS_ORDER}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-400">Location</span>
          <select
            className={fieldClass}
            data-testid="it-filter-location"
            value={filters.locationId}
            onChange={(event) => setFilters((current) => ({ ...current, locationId: event.target.value }))}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-400">Type</span>
          <select
            className={fieldClass}
            data-testid="it-filter-type"
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          >
            <option value="">All types</option>
            {COMPLAINT_TYPES.map((typeName) => (
              <option key={typeName} value={typeName}>
                {typeName}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-400">Status</span>
          <select
            className={fieldClass}
            data-testid="it-filter-status"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">All statuses</option>
            {COMPLAINT_STATUSES.map((statusName) => (
              <option key={statusName} value={statusName}>
                {statusName}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-400">Date</span>
          <input
            type="date"
            className={fieldClass}
            data-testid="it-filter-date"
            value={filters.date}
            onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
          />
        </label>
      </div>

      {state === 'loading' ? <WidgetSkeleton label="Loading complaints…" /> : null}
      {state === 'error' ? <RequestError message={listError} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {state === 'ready' && visible.length === 0 ? (
        <p className="np-empty mt-6">No complaints match these filters.</p>
      ) : null}
      {state === 'ready' && visible.length > 0 ? (
        <ul className="mt-6 space-y-3" data-testid="it-complaint-list">
          {visible.map((complaint) => (
            <li key={complaint.id}>
              <button
                type="button"
                data-testid="complaint-row"
                onClick={() => setSelectedId(complaint.id)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left hover:border-slate-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{complaint.type || 'Complaint'}</p>
                  <p className="text-xs text-slate-300" data-testid="complaint-status">
                    {complaint.status}
                  </p>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">{complaint.description}</p>
                <p className="mt-2 text-xs text-slate-500">{complaint.locationName || 'Location'}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close details" onClick={() => setSelectedId('')} />
          <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-slate-800 bg-slate-950 p-5" data-testid="complaint-drawer">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{selected.type}</h3>
                <p className="mt-1 text-sm text-slate-400">{selected.locationName || 'Location'}</p>
              </div>
              <button type="button" className="rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-slate-800" onClick={() => setSelectedId('')}>
                Close
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-200">{selected.description}</p>
            <p className="mt-2 text-xs text-slate-500">Severity {selected.severity || 'medium'}</p>
            <p className="mt-4 text-xs text-slate-500">{STATUS_ORDER}</p>
            <p className="mt-2 text-sm">Current status: {selected.status}</p>
            <form onSubmit={onAssign} className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1.5 block text-slate-400">Assign staff</span>
                <select className={fieldClass} data-testid="assignee-input" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
                  <option value="">Select staff</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} ({person.role})
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" data-testid="assign-staff" disabled={pending} className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-60">
                Assign
              </button>
            </form>
            <form onSubmit={onMoveStatus} className="mt-4">
              {nextStatus(selected.status) ? (
                <button type="submit" data-testid="update-status" disabled={pending} className="rounded-lg bg-sky-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
                  Move to {nextStatus(selected.status)}
                </button>
              ) : (
                <p className="text-sm text-slate-400">This complaint is resolved.</p>
              )}
            </form>
            <form onSubmit={onAddNote} className="mt-6 space-y-3">
              <h4 className="text-sm font-medium">Notes</h4>
              {(selected.notes || []).length === 0 ? <p className="text-sm text-slate-500">No notes yet.</p> : null}
              <ul className="space-y-2" data-testid="note-list">
                {(selected.notes || []).map((item) => (
                  <li key={item.id} className="rounded-lg border border-slate-800 px-3 py-2 text-sm">
                    {item.note}
                  </li>
                ))}
              </ul>
              <label className="block text-sm">
                <span className="mb-1.5 block text-slate-400">Add note</span>
                <textarea className={`${fieldClass} min-h-20`} data-testid="note-input" value={note} onChange={(event) => setNote(event.target.value)} />
                {noteError ? <p className="mt-1 text-sm text-rose-200" role="alert">{noteError}</p> : null}
              </label>
              <button
                type="submit"
                data-testid="add-note"
                disabled={pending}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-60"
              >
                Add note
              </button>
            </form>
            {error ? (
              <p className="mt-4 text-sm text-rose-200" role="alert" data-testid="drawer-error">
                {error}
              </p>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  )
}
