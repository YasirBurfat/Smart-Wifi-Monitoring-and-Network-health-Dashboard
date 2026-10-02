import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '../../api/errors.js'
import { fetchLocations } from '../../api/locations.js'
import { fetchTests, readHealth } from '../../api/tests.js'
import { fieldClass } from '../../components/formStyles.js'
import RequestError from '../../components/RequestError.jsx'
import { WidgetSkeleton } from '../../components/Skeleton.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { STATUS_LEVELS } from '../../status.js'

function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  const rounded = Math.round(number * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

function rowDate(row) {
  const raw = row.createdAt || row.created_at || row.testedAt || row.date
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

function locationName(row) {
  if (typeof row.location === 'string') return row.location
  return row.location?.name || row.locationName || row.locationId || '—'
}

function ownRows(rows, user) {
  return rows.filter((row) => {
    const owner = row.userId || row.user?.id || (typeof row.user === 'string' ? row.user : null)
    if (owner == null || user?.id == null) return true
    return String(owner) === String(user.id)
  })
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [locations, setLocations] = useState([])
  const [filters, setFilters] = useState({ locationId: '', status: '', date: '' })
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    document.title = 'CampusNet · My History'
  }, [])

  useEffect(() => {
    let active = true
    const params = {}
    if (filters.locationId) params.location = filters.locationId
    if (filters.status) params.status = filters.status
    if (filters.date) {
      params.from = `${filters.date}T00:00:00.000Z`
      params.to = `${filters.date}T23:59:59.999Z`
    }
    fetchTests(params)
      .then((tests) => {
        if (!active) return
        setRows(ownRows(tests, user))
        setStatus('ready')
      })
      .catch((err) => {
        if (!active) return
        setError(getApiErrorMessage(err, 'Could not load your tests.'))
        setStatus('error')
      })
    return () => {
      active = false
    }
  }, [user, filters, attempt])

  useEffect(() => {
    let active = true
    fetchLocations()
      .then((list) => {
        if (active) setLocations(list)
      })
      .catch(() => {
        if (active) setLocations([])
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="max-w-3xl">
      <h2 className="text-2xl font-semibold">My History</h2>
      <p className="mt-2 text-slate-400">Your saved speed tests. The date filter uses UTC.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-400">Location</span>
          <select className={fieldClass} data-testid="history-filter-location" value={filters.locationId} onChange={(event) => setFilters((current) => ({ ...current, locationId: event.target.value }))}>
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-400">Health</span>
          <select className={fieldClass} data-testid="history-filter-status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All bands</option>
            {STATUS_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-400">Date</span>
          <input type="date" className={fieldClass} data-testid="history-filter-date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
        </label>
      </div>

      {status === 'loading' ? <WidgetSkeleton label="Loading tests…" /> : null}
      {status === 'error' ? <RequestError message={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {status === 'ready' && rows.length === 0 ? (
        <p className="np-empty mt-6">No tests yet.</p>
      ) : null}
      {status === 'ready' && rows.length > 0 ? (
        <ul className="mt-6 space-y-3" data-testid="history-list">
          {rows.map((row, index) => {
            const health = readHealth(row)
            return (
              <li key={row.id || row._id || index} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{locationName(row)}</p>
                  <p className="text-xs text-slate-500">{rowDate(row)}</p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-slate-500">Download</dt>
                    <dd>{formatNumber(row.downloadMbps ?? row.download)} Mbps</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Upload</dt>
                    <dd>{formatNumber(row.uploadMbps ?? row.upload)} Mbps</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Ping</dt>
                    <dd>{formatNumber(row.pingMs ?? row.ping)} ms</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Jitter</dt>
                    <dd>{row.jitterMs == null && row.jitter == null ? '—' : `${formatNumber(row.jitterMs ?? row.jitter)} ms`}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Packet loss</dt>
                    <dd>{formatNumber(row.packetLoss ?? row.packet_loss)}%</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Health</dt>
                    <dd>{health ? <StatusBadge status={health} /> : '—'}</dd>
                  </div>
                </dl>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
