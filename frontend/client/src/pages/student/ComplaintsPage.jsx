import { useEffect, useState } from 'react'
import { COMPLAINT_TYPES, createComplaint, fetchComplaints } from '../../api/complaints.js'
import { fetchLocations } from '../../api/locations.js'
import { fetchTests } from '../../api/tests.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { fieldClass } from '../../components/formStyles.js'

function formatWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function ownComplaints(rows, user) {
  return rows.filter((row) => {
    if (!row.userId || user?.id == null) return true
    return String(row.userId) === String(user.id)
  })
}

export default function ComplaintsPage() {
  const { user } = useAuth()
  const [locations, setLocations] = useState([])
  const [locationState, setLocationState] = useState('loading')
  const [complaints, setComplaints] = useState([])
  const [listState, setListState] = useState('loading')
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [locationId, setLocationId] = useState('')
  const [attachLatestTest, setAttachLatestTest] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    document.title = 'CampusNet · Complaints'
  }, [])

  useEffect(() => {
    let active = true
    fetchLocations()
      .then((list) => {
        if (!active) return
        setLocations(list)
        setLocationId(list[0]?.id || '')
        setLocationState(list.length ? 'ready' : 'empty')
      })
      .catch(() => {
        if (!active) return
        setLocationState('error')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchComplaints()
      .then((rows) => {
        if (!active) return
        setComplaints(ownComplaints(rows, user))
        setListState('ready')
      })
      .catch(() => {
        if (!active) return
        setListState('error')
      })
    return () => {
      active = false
    }
  }, [user])

  async function onSubmit(event) {
    event.preventDefault()
    if (!type || !description.trim() || !locationId) {
      setError('Choose a category, location, and description.')
      return
    }
    setPending(true)
    setError('')
    setNotice('')
    try {
      let testId = ''
      if (attachLatestTest) {
        try {
          const tests = await fetchTests()
          const latest = [...tests].sort(
            (left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0),
          )[0]
          testId = latest?.id || latest?._id || ''
        } catch {
          testId = ''
        }
      }
      await createComplaint({
        type,
        description: description.trim(),
        locationId,
        attachLatestTest,
        ...(testId ? { testId: String(testId) } : {}),
      })
      const rows = await fetchComplaints()
      setComplaints(ownComplaints(rows, user))
      setListState('ready')
      setDescription('')
      setAttachLatestTest(false)
      setType('')
      setNotice('Complaint submitted.')
    } catch {
      setError('Could not submit the complaint.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="max-w-3xl">
      <h2 className="text-2xl font-semibold">Report a Problem</h2>
      <p className="mt-2 text-slate-400">Tell IT what is happening on the campus network.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-300">Category</span>
          <select
            className={fieldClass}
            data-testid="complaint-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            required
          >
            <option value="">Select a category</option>
            {COMPLAINT_TYPES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-300">Description</span>
          <textarea
            className={`${fieldClass} min-h-28`}
            data-testid="complaint-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-300">Location</span>
          {locationState === 'loading' ? <p className="text-slate-400">Loading locations…</p> : null}
          {locationState === 'empty' ? <p data-testid="no-locations">no locations</p> : null}
          {locationState === 'error' ? <p className="text-slate-400">Could not load locations.</p> : null}
          {locationState === 'ready' ? (
            <select
              className={fieldClass}
              data-testid="complaint-location"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              required
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          ) : null}
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            data-testid="attach-latest-test"
            checked={attachLatestTest}
            onChange={(event) => setAttachLatestTest(event.target.checked)}
          />
          Attach my latest test
        </label>
        {error ? (
          <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert" data-testid="complaint-error">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200" role="status">
            {notice}
          </p>
        ) : null}
        <button
          type="submit"
          data-testid="submit-complaint"
          disabled={pending || locationState !== 'ready'}
          className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {pending ? 'Submitting…' : 'Submit complaint'}
        </button>
      </form>

      <h3 className="mt-10 text-lg font-medium">My Complaints</h3>
      {listState === 'loading' ? <p className="mt-3 text-sm text-slate-400">Loading complaints…</p> : null}
      {listState === 'error' ? (
        <p className="mt-3 text-sm text-rose-200" role="alert">
          Could not load complaints.
        </p>
      ) : null}
      {listState === 'ready' && complaints.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No complaints yet.</p>
      ) : null}
      {listState === 'ready' && complaints.length > 0 ? (
        <ul className="mt-4 space-y-3" data-testid="complaint-list">
          {complaints.map((complaint) => (
            <li key={complaint.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{complaint.type}</p>
                <p className="text-xs text-slate-400">{complaint.status}</p>
              </div>
              <p className="mt-2 text-sm text-slate-300">{complaint.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                {complaint.locationName || 'Location'} {formatWhen(complaint.createdAt) ? `· ${formatWhen(complaint.createdAt)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
