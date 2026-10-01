import { useEffect, useMemo, useState } from 'react'
import {
  COMPLAINT_STATUSES,
  COMPLAINT_TYPES,
  addComplaintNote,
  fetchComplaints,
  updateComplaintStatus,
} from '../../api/complaints.js'
import { fetchLocations } from '../../api/locations.js'
import { fieldClass } from '../../components/formStyles.js'

const STATUS_ORDER = 'Submitted → Reviewed → Assigned → In Progress → Resolved'

function formatWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export default function ItComplaintsPage() {
  const [complaints, setComplaints] = useState([])
  const [locations, setLocations] = useState([])
  const [state, setState] = useState('loading')
  const [filters, setFilters] = useState({ locationId: '', type: '', status: '' })
  const [selectedId, setSelectedId] = useState('')
  const [status, setStatus] = useState('Submitted')
  const [assignee, setAssignee] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    document.title = 'CampusNet · Complaints'
  }, [])

  useEffect(() => {
    let active = true
    Promise.allSettled([fetchComplaints(), fetchLocations()]).then(([complaintResult, locationResult]) => {
      if (!active) return
      setComplaints(complaintResult.status === 'fulfilled' ? complaintResult.value : [])
      setLocations(locationResult.status === 'fulfilled' ? locationResult.value : [])
      setState(complaintResult.status === 'fulfilled' ? 'ready' : 'error')
    })
    return () => {
      active = false
    }
  }, [])

  const selected = complaints.find((complaint) => complaint.id === selectedId) || null

  useEffect(() => {
    if (!selected) return
    setStatus(COMPLAINT_STATUSES.includes(selected.status) ? selected.status : 'Submitted')
    setAssignee(selected.assignee || '')
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

  const visible = useMemo(() => {
    return complaints.filter((complaint) => {
      if (filters.locationId && complaint.locationId !== filters.locationId) return false
      if (filters.type && complaint.type !== filters.type) return false
      if (filters.status && complaint.status !== filters.status) return false
      return true
    })
  }, [complaints, filters])

  function replaceComplaint(next) {
    setComplaints((current) => current.map((item) => (item.id === next.id ? { ...item, ...next } : item)))
  }

  async function onUpdateStatus(event) {
    event.preventDefault()
    if (!selected) return
    setPending(true)
    setError('')
    try {
      const updated = await updateComplaintStatus(selected.id, { status, assignee })
      const hasContent = Boolean(updated?.description || updated?.type)
      replaceComplaint(
        hasContent
          ? { ...selected, ...updated, id: selected.id }
          : { ...selected, status, assignee, id: selected.id },
      )
    } catch {
      setError('Could not update the complaint.')
    } finally {
      setPending(false)
    }
  }

  async function onAddNote(event) {
    event.preventDefault()
    if (!selected || !note.trim()) return
    setPending(true)
    setError('')
    const text = note.trim()
    try {
      await addComplaintNote(selected.id, text)
      replaceComplaint({
        ...selected,
        notes: [...(selected.notes || []), { id: `local-${Date.now()}`, note: text, createdAt: new Date().toISOString() }],
      })
      setNote('')
    } catch {
      setError('Could not add the note.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="max-w-5xl">
      <h2 className="text-2xl font-semibold">Complaints</h2>
      <p className="mt-2 text-sm text-slate-400">{STATUS_ORDER}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
      </div>

      {state === 'loading' ? <p className="mt-6 text-sm text-slate-400">Loading complaints…</p> : null}
      {state === 'error' ? (
        <p className="mt-6 text-sm text-rose-200" role="alert">
          Could not load complaints.
        </p>
      ) : null}
      {state === 'ready' && visible.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">No complaints match these filters.</p>
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
            <p className="mt-4 text-xs text-slate-500">{STATUS_ORDER}</p>
            <form onSubmit={onUpdateStatus} className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1.5 block text-slate-400">Status</span>
                <select className={fieldClass} data-testid="status-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                  {COMPLAINT_STATUSES.map((statusName) => (
                    <option key={statusName} value={statusName}>
                      {statusName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-slate-400">Assign staff</span>
                <input
                  className={fieldClass}
                  data-testid="assignee-input"
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                />
              </label>
              <button
                type="submit"
                data-testid="update-status"
                disabled={pending}
                className="rounded-lg bg-sky-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                Update status
              </button>
            </form>
            <form onSubmit={onAddNote} className="mt-6 space-y-3">
              <h4 className="text-sm font-medium">Notes</h4>
              {selected.notes.length === 0 ? <p className="text-sm text-slate-500">No notes yet.</p> : null}
              <ul className="space-y-2" data-testid="note-list">
                {selected.notes.map((item) => (
                  <li key={item.id} className="rounded-lg border border-slate-800 px-3 py-2 text-sm">
                    {item.note}
                  </li>
                ))}
              </ul>
              <label className="block text-sm">
                <span className="mb-1.5 block text-slate-400">Add note</span>
                <textarea className={`${fieldClass} min-h-20`} data-testid="note-input" value={note} onChange={(event) => setNote(event.target.value)} />
              </label>
              <button
                type="submit"
                data-testid="add-note"
                disabled={pending || !note.trim()}
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
