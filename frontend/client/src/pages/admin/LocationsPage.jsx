import { useEffect, useState } from 'react'
import { createLocation, deleteLocation, fetchLocations, updateLocation } from '../../api/locations.js'
import { getApiErrorMessage } from '../../api/errors.js'
import { fieldClass } from '../../components/formStyles.js'
import RequestError from '../../components/RequestError.jsx'
import { WidgetSkeleton } from '../../components/Skeleton.jsx'

const EMPTY_FORM = { name: '', building: '', floor: '', description: '' }

export default function LocationsPage({ canWrite = false }) {
  const [locations, setLocations] = useState([])
  const [state, setState] = useState('loading')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    document.title = 'CampusNet · Locations'
  }, [])

  function load() {
    setState('loading')
    return fetchLocations()
      .then((list) => {
        setLocations(list)
        setState('ready')
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'Could not load locations.'))
        setState('error')
      })
  }

  useEffect(() => {
    let active = true
    fetchLocations()
      .then((list) => {
        if (!active) return
        setLocations(list)
        setState('ready')
      })
      .catch((err) => {
        if (!active) return
        setError(getApiErrorMessage(err, 'Could not load locations.'))
        setState('error')
      })
    return () => {
      active = false
    }
  }, [attempt])

  function beginEdit(location) {
    setEditingId(location.id)
    setForm({
      name: location.name || '',
      building: location.building || '',
      floor: location.floor || '',
      description: location.description || '',
    })
    setError('')
    setNotice('')
  }

  async function onSubmit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Name is required.'
    if (!form.building.trim()) nextErrors.building = 'Building is required.'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setError('')
      return
    }
    setPending(true)
    setError('')
    setNotice('')
    const payload = {
      name: form.name.trim(),
      building: form.building.trim(),
      floor: form.floor.trim(),
      description: form.description.trim(),
    }
    try {
      if (editingId) await updateLocation(editingId, payload)
      else await createLocation(payload)
      setForm(EMPTY_FORM)
      setEditingId('')
      setFieldErrors({})
      setNotice(editingId ? 'Location updated.' : 'Location added. Students will see it in the location list.')
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save the location.'))
    } finally {
      setPending(false)
    }
  }

  async function onDelete(location) {
    if (!window.confirm(`Delete ${location.name}?`)) return
    setError('')
    setNotice('')
    try {
      await deleteLocation(location.id)
      if (editingId === location.id) {
        setEditingId('')
        setForm(EMPTY_FORM)
      }
      setNotice('Location deleted.')
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete the location.'))
    }
  }

  return (
    <section className="max-w-4xl">
      <h2 className="text-2xl font-semibold">Locations</h2>
      <p className="mt-2 text-slate-400">
        {canWrite ? 'Add, edit, or delete campus locations.' : 'Location health for comparison. Role changes are not available here.'}
      </p>

      {canWrite ? (
        <form onSubmit={onSubmit} className="mt-6 grid gap-3 sm:grid-cols-2" data-testid="location-form">
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-300">Name</span>
            <input className={fieldClass} data-testid="location-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} aria-invalid={fieldErrors.name ? 'true' : undefined} />
            {fieldErrors.name ? <p className="mt-1 text-sm text-rose-200" role="alert">{fieldErrors.name}</p> : null}
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-300">Building</span>
            <input className={fieldClass} data-testid="location-building" value={form.building} onChange={(event) => setForm((current) => ({ ...current, building: event.target.value }))} aria-invalid={fieldErrors.building ? 'true' : undefined} />
            {fieldErrors.building ? <p className="mt-1 text-sm text-rose-200" role="alert">{fieldErrors.building}</p> : null}
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-300">Floor</span>
            <input className={fieldClass} value={form.floor} onChange={(event) => setForm((current) => ({ ...current, floor: event.target.value }))} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block text-slate-300">Description</span>
            <input className={fieldClass} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" data-testid="save-location" disabled={pending} className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
              {pending ? 'Saving…' : editingId ? 'Save changes' : 'Add location'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
                onClick={() => {
                  setEditingId('')
                  setForm(EMPTY_FORM)
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {error ? <p className="mt-4 text-sm text-rose-200" role="alert">{error}</p> : null}
      {notice ? <p className="mt-4 text-sm text-emerald-200" role="status">{notice}</p> : null}
      {state === 'loading' ? <WidgetSkeleton label="Loading locations…" /> : null}
      {state === 'error' ? <RequestError message={error || 'Could not load locations.'} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {state === 'ready' && locations.length === 0 ? <p className="np-empty mt-6">No locations yet.</p> : null}
      {state === 'ready' && locations.length > 0 ? (
        <ul className="mt-6 space-y-3" data-testid="location-list">
          {locations.map((location) => (
            <li key={location.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{location.name}</p>
                  <p className="text-xs text-slate-500">
                    {location.building || 'No building'}
                    {location.floor ? ` · Floor ${location.floor}` : ''}
                  </p>
                </div>
                <p className="text-xs text-slate-300">{location.networkStatus || 'Unknown'}</p>
              </div>
              {canWrite ? (
                <div className="mt-3 flex gap-2">
                  <button type="button" className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm" onClick={() => beginEdit(location)}>
                    Edit
                  </button>
                  <button type="button" className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-sm text-rose-200" onClick={() => onDelete(location)}>
                    Delete
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
