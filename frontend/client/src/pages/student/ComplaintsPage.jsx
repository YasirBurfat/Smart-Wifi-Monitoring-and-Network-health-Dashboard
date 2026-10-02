import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { COMPLAINT_STATUSES, COMPLAINT_TYPES, createComplaint, fetchComplaints } from '../../api/complaints.js'
import { getApiErrorMessage } from '../../api/errors.js'
import { fetchLocations } from '../../api/locations.js'
import { fetchTests, readHealth } from '../../api/tests.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { fieldClass } from '../../components/formStyles.js'
import RequestError from '../../components/RequestError.jsx'
import { BlockSkeleton, WidgetSkeleton } from '../../components/Skeleton.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'

const PROBLEMS = [
  { label: 'No Internet', type: 'no connection' },
  { label: 'Slow Internet', type: 'slow internet' },
  { label: 'High Ping', type: 'high latency' },
  { label: 'Frequent Disconnection', type: 'wifi dropping' },
  { label: 'Weak Signal', type: 'hardware/access point' },
  { label: 'Website/Service Unavailable', type: 'login/authentication' },
  { label: 'Other', type: 'other' },
]

const SEVERITIES = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
]

function formatWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  const rounded = Math.round(number * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

function ownComplaints(rows, user) {
  return rows.filter((row) => {
    if (!row.userId || user?.id == null) return true
    return String(row.userId) === String(user.id)
  })
}

function problemLabel(type) {
  return PROBLEMS.find((item) => item.type === type)?.label || type
}

function testLocationId(test) {
  return test?.locationId || test?.location?.id || test?.location?._id || ''
}

function latestForLocation(tests, locationId) {
  if (!locationId) return null
  return [...tests]
    .filter((test) => String(testLocationId(test)) === String(locationId))
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))[0] || null
}

export default function ComplaintsPage() {
  const { user } = useAuth()
  const [locations, setLocations] = useState([])
  const [locationState, setLocationState] = useState('loading')
  const [complaints, setComplaints] = useState([])
  const [listState, setListState] = useState('loading')
  const [type, setType] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [description, setDescription] = useState('')
  const [locationId, setLocationId] = useState('')
  const [pending, setPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')
  const [savedId, setSavedId] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [tests, setTests] = useState([])
  const [showReports, setShowReports] = useState(false)
  const [filters, setFilters] = useState({ locationId: '', type: '', status: '', date: '' })
  const [listAttempt, setListAttempt] = useState(0)

  useEffect(() => {
    document.title = 'CampusNet · Complaints'
  }, [])

  useEffect(() => {
    let active = true
    Promise.allSettled([fetchLocations(), fetchTests()]).then(([locationResult, testResult]) => {
      if (!active) return
      const list = locationResult.status === 'fulfilled' ? locationResult.value : []
      const loadedTests = testResult.status === 'fulfilled' ? testResult.value : []
      setLocations(list)
      setLocationId((current) => (list.some((location) => location.id === current) ? current : list[0]?.id || ''))
      setLocationState(locationResult.status === 'fulfilled' ? (list.length ? 'ready' : 'empty') : 'error')
      setTests(loadedTests)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchComplaints(filters)
      .then((rows) => {
        if (!active) return
        setComplaints(ownComplaints(rows, user))
        setListError('')
        setListState('ready')
      })
      .catch((err) => {
        if (!active) return
        setListError(getApiErrorMessage(err, 'Could not load complaints.'))
        setListState('error')
      })
    return () => {
      active = false
    }
  }, [user, filters, listAttempt])

  const latest = latestForLocation(tests, locationId)

  async function onSubmit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!locationId) nextErrors.location = 'Choose a location.'
    if (!type) nextErrors.type = 'Choose a category.'
    const trimmed = description.trim()
    if (trimmed && trimmed.length < 3) nextErrors.description = 'Use at least 3 characters, or leave the description empty.'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setError('')
      return
    }
    setPending(true)
    setError('')
    setSavedId('')
    try {
      const testId = latest?.id || latest?._id || ''
      const payload = { type, severity, locationId }
      if (trimmed) payload.description = trimmed
      if (testId) {
        payload.testId = String(testId)
        payload.attachLatestTest = true
      }
      const saved = await createComplaint(payload)
      const id = saved?.id ? String(saved.id) : ''
      if (!id) {
        setError('The server did not return a report id.')
        return
      }
      setSavedId(id)
      setReceipt({
        id,
        type,
        severity,
        locationName: locations.find((location) => location.id === locationId)?.name || '',
        createdAt: saved?.createdAt || new Date().toISOString(),
        test: testId ? latest : null,
      })
      setDescription('')
      setType('')
      setFieldErrors({})
      setShowReports(false)
      try {
        const rows = await fetchComplaints(filters)
        setComplaints(ownComplaints(rows, user))
        setListState('ready')
      } catch (listErr) {
        setListError(getApiErrorMessage(listErr, 'Could not load complaints.'))
        setListState('error')
      }
    } catch (err) {
      const issues = Array.isArray(err?.response?.data?.errors) ? err.response.data.errors : []
      const next = {}
      for (const issue of issues) {
        const path = String(issue?.path || '')
        if (path.includes('description')) next.description = issue.message
        if (path.includes('location')) next.location = issue.message
        if (path.includes('type')) next.type = issue.message
      }
      if (Object.keys(next).length) setFieldErrors(next)
      setError(getApiErrorMessage(err, 'Could not submit the complaint.'))
    } finally {
      setPending(false)
    }
  }

  if (receipt && !showReports) {
    const health = receipt.test ? readHealth(receipt.test) : null
    return (
      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
        <div>
          <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-[#22d3ee] text-[#22d3ee] shadow-[0_0_18px_rgba(34,211,238,0.35)]">
            <Check aria-hidden="true" size={28} />
          </div>
          <h2 className="mt-4 text-3xl font-semibold text-white">Report Received!</h2>
          <p className="mt-2 max-w-xl text-[#cbd5e1]">IT has the issue and can see the test attached to this report.</p>
          <article className="mt-6 rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] p-4" data-testid="complaint-saved">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-white">Report {receipt.id || savedId}</p>
              <span className="rounded-full bg-[#22d3ee]/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#22d3ee]">Monitoring</span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt>Location</dt><dd className="text-white">{receipt.locationName || '—'}</dd></div>
              <div><dt>Submitted</dt><dd className="text-white">{formatWhen(receipt.createdAt) || '—'}</dd></div>
              <div><dt>Issue type</dt><dd className="text-white">{problemLabel(receipt.type)}</dd></div>
              <div><dt>Download</dt><dd className="text-white">{formatNumber(receipt.test?.downloadMbps ?? receipt.test?.download)} Mbps</dd></div>
              <div><dt>Upload</dt><dd className="text-white">{formatNumber(receipt.test?.uploadMbps ?? receipt.test?.upload)} Mbps</dd></div>
              <div><dt>Ping</dt><dd className="text-white">{formatNumber(receipt.test?.pingMs ?? receipt.test?.ping)} ms</dd></div>
              <div><dt>Packet loss</dt><dd className="text-white">{formatNumber(receipt.test?.packetLoss)}%</dd></div>
              <div><dt>Health</dt><dd>{health ? <StatusBadge status={health} /> : '—'}</dd></div>
            </dl>
          </article>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/student/home" className="inline-flex items-center gap-2 bg-sky-400 px-4 py-2 text-sm">Back to Dashboard</Link>
            <button type="button" className="rounded-full border border-[rgba(56,189,248,0.18)] px-4 py-2 text-sm text-white" onClick={() => setShowReports(true)}>
              View My Reports
            </button>
          </div>
        </div>
        <ol className="rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] p-4">
          {['Report Received', 'IT Team Notification', 'Investigation', 'Resolution'].map((step, index) => (
            <li key={step} className="flex gap-3 pb-4 last:pb-0">
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-[#22d3ee]' : 'bg-[#94a3b8]'}`} />
              <span className={index === 0 ? 'text-white' : 'text-[#94a3b8]'}>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    )
  }

  return (
    <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
      <div>
        <h2 className="text-3xl font-semibold uppercase leading-tight text-white">
          Something wrong with
          <span className="mt-1 block text-[#22d3ee]">your connection?</span>
        </h2>
        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          <fieldset>
            <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">1 Select location</legend>
            {locationState === 'loading' ? <BlockSkeleton className="mt-3 h-10" /> : null}
            {locationState === 'empty' ? <p className="np-empty mt-3" data-testid="no-locations">no locations</p> : null}
            {locationState === 'error' ? <p className="mt-3 text-sm text-rose-200" role="alert">Could not load locations.</p> : null}
            {fieldErrors.location ? <p className="mt-3 text-sm text-rose-200" role="alert">{fieldErrors.location}</p> : null}
            {locationState === 'ready' ? (
              <select className={`${fieldClass} mt-3`} data-testid="complaint-location" value={locationId} onChange={(event) => setLocationId(event.target.value)} required>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            ) : null}
          </fieldset>
          <fieldset data-testid="complaint-type">
            <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">2 What's the problem?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PROBLEMS.map((problem) => {
                const active = type === problem.type
                return (
                  <button
                    key={problem.type}
                    type="button"
                    className={`rounded-2xl border px-3 py-3 text-left text-sm ${active ? 'border-[#22d3ee] bg-[#22d3ee]/10 text-white' : 'border-[rgba(56,189,248,0.18)] bg-[#0c1829] text-[#cbd5e1]'}`}
                    onClick={() => setType(problem.type)}
                  >
                    {problem.label}
                  </button>
                )
              })}
            </div>
            {fieldErrors.type ? <p className="mt-3 text-sm text-rose-200" role="alert">{fieldErrors.type}</p> : null}
          </fieldset>
          <fieldset data-testid="complaint-severity">
            <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">3 Severity</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {SEVERITIES.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-sm ${severity === level.value ? 'border-[#22d3ee] text-white' : 'border-[rgba(56,189,248,0.18)] text-[#cbd5e1]'}`}
                  onClick={() => setSeverity(level.value)}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-1.5 block">4 Description optional</span>
            <textarea className={`${fieldClass} min-h-28`} data-testid="complaint-description" value={description} onChange={(event) => setDescription(event.target.value)} />
            {fieldErrors.description ? <p className="mt-1 text-sm text-rose-200" role="alert">{fieldErrors.description}</p> : null}
          </label>
          {error ? (
            <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert" data-testid="complaint-error">{error}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" data-testid="submit-complaint" disabled={pending || locationState !== 'ready'} className="inline-flex items-center gap-2 bg-sky-400 px-4 py-2 text-sm disabled:opacity-60">
              {pending ? 'Submitting…' : 'Report'}
            </button>
            <button
              type="button"
              className="rounded-full border border-[rgba(56,189,248,0.18)] px-4 py-2 text-sm text-white"
              onClick={() => {
                setType('')
                setSeverity('medium')
                setDescription('')
                setError('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>

        <h3 className="mt-10 text-lg font-medium text-white">My reports</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block">Location</span>
            <select className={fieldClass} data-testid="my-filter-location" value={filters.locationId} onChange={(event) => setFilters((current) => ({ ...current, locationId: event.target.value }))}>
              <option value="">All locations</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block">Category</span>
            <select className={fieldClass} data-testid="my-filter-type" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="">All categories</option>
              {COMPLAINT_TYPES.map((category) => <option key={category} value={category}>{problemLabel(category)}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block">Status</span>
            <select className={fieldClass} data-testid="my-filter-status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              {COMPLAINT_STATUSES.map((statusName) => <option key={statusName} value={statusName}>{statusName}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block">Date</span>
            <input type="date" className={fieldClass} data-testid="my-filter-date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
          </label>
        </div>
        {listState === 'loading' ? <WidgetSkeleton label="Loading complaints…" className="mt-3 h-24" /> : null}
        {listState === 'error' ? <RequestError message={listError} onRetry={() => setListAttempt((value) => value + 1)} /> : null}
        {listState === 'ready' && complaints.length === 0 ? <p className="np-empty mt-3">No complaints yet.</p> : null}
        {listState === 'ready' && complaints.length > 0 ? (
          <ul className="mt-4 space-y-3" data-testid="complaint-list">
            {complaints.map((complaint) => (
              <li key={complaint.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">{problemLabel(complaint.type)}</p>
                  <p className="text-xs uppercase tracking-wide text-[#94a3b8]">{complaint.status}</p>
                </div>
                <p className="mt-2 text-sm text-[#cbd5e1]">{complaint.description}</p>
                <p className="mt-2 text-xs text-[#94a3b8]">{complaint.locationName || 'Location'} {formatWhen(complaint.createdAt) ? `· ${formatWhen(complaint.createdAt)}` : ''}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <aside className="rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">Latest test result</p>
        {!latest ? <p className="np-empty mt-3">No test attached yet.</p> : null}
        {latest ? (
          <>
            <div className="mx-auto mt-4 grid h-24 w-24 place-items-center rounded-full border-4 border-[#22d3ee] text-2xl font-semibold text-white">
              {formatNumber(latest.score)}
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt>Download</dt><dd className="text-white">{formatNumber(latest.downloadMbps ?? latest.download)} Mbps</dd></div>
              <div><dt>Upload</dt><dd className="text-white">{formatNumber(latest.uploadMbps ?? latest.upload)} Mbps</dd></div>
              <div><dt>Ping</dt><dd className="text-white">{formatNumber(latest.pingMs ?? latest.ping)} ms</dd></div>
              <div><dt>Packet loss</dt><dd className="text-white">{formatNumber(latest.packetLoss)}%</dd></div>
              <div><dt>Location</dt><dd className="text-white">{latest.location?.name || '—'}</dd></div>
              <div><dt>Tested</dt><dd className="text-white">{formatWhen(latest.createdAt) || '—'}</dd></div>
            </dl>
            <p className="mt-4 text-sm text-[#cbd5e1]">The last test is attached.</p>
          </>
        ) : null}
      </aside>
    </section>
  )
}
