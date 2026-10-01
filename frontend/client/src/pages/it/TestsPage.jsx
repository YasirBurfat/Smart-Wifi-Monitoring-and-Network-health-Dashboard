import { useEffect, useState } from 'react'
import { fetchLocations } from '../../api/locations.js'
import { fetchTestPage } from '../../api/tests.js'
import { fieldClass } from '../../components/formStyles.js'
import StatusBadge from '../../components/StatusBadge.jsx'
import { STATUS_LEVELS } from '../../status.js'

const PAGE_SIZE = 100

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
  return row.location?.name || row.locationName || '—'
}

function buildingName(row) {
  if (typeof row.location === 'object' && row.location?.building) return row.location.building
  return row.building || ''
}

function personName(row) {
  if (typeof row.user === 'object' && row.user?.name) return row.user.name
  return row.userName || 'Unknown user'
}

function queryFor(filters, page) {
  const params = { page, limit: PAGE_SIZE }
  if (filters.locationId) params.location = filters.locationId
  if (filters.building) params.building = filters.building
  if (filters.status) params.status = filters.status
  if (filters.date) {
    params.from = `${filters.date}T00:00:00.000Z`
    params.to = `${filters.date}T23:59:59.999Z`
  }
  return params
}

export default function TestsPage() {
  const [locations, setLocations] = useState([])
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [state, setState] = useState('loading')
  const [filters, setFilters] = useState({ locationId: '', building: '', status: '', date: '' })

  useEffect(() => {
    document.title = 'CampusNet · Tests'
  }, [])

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

  useEffect(() => {
    let active = true
    setState('loading')
    fetchTestPage(queryFor(filters, page))
      .then((result) => {
        if (!active) return
        setRows(result.tests)
        setTotal(result.total)
        setPages(result.pages)
        setState('ready')
      })
      .catch(() => {
        if (!active) return
        setRows([])
        setTotal(0)
        setPages(0)
        setState('error')
      })
    return () => {
      active = false
    }
  }, [filters, page])

  const buildings = [...new Set(locations.map((location) => location.building).filter(Boolean))]
  const filtersActive = Boolean(filters.locationId || filters.building || filters.status || filters.date)

  function updateFilter(key, value) {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <section className="max-w-5xl">
      <h2 className="text-2xl font-semibold">Tests</h2>
      <p className="mt-2 text-slate-400">Saved speed tests across campus. The date filter uses UTC.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-400">Location</span>
          <select
            className={fieldClass}
            data-testid="tests-filter-location"
            value={filters.locationId}
            onChange={(event) => updateFilter('locationId', event.target.value)}
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
          <span className="mb-1.5 block text-slate-400">Building</span>
          <select
            className={fieldClass}
            data-testid="tests-filter-building"
            value={filters.building}
            onChange={(event) => updateFilter('building', event.target.value)}
          >
            <option value="">All buildings</option>
            {buildings.map((building) => (
              <option key={building} value={building}>
                {building}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-400">Health</span>
          <select
            className={fieldClass}
            data-testid="tests-filter-status"
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
          >
            <option value="">All bands</option>
            {STATUS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-400">Date</span>
          <input
            type="date"
            className={fieldClass}
            data-testid="tests-filter-date"
            value={filters.date}
            onChange={(event) => updateFilter('date', event.target.value)}
          />
        </label>
      </div>

      {state === 'loading' ? <p className="mt-6 text-sm text-slate-400">Loading tests…</p> : null}
      {state === 'error' ? (
        <p className="mt-6 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
          Could not load tests.
        </p>
      ) : null}
      {state === 'ready' && rows.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400" data-testid="tests-empty">
          {filtersActive ? 'No tests match these filters.' : 'No tests yet.'}
        </p>
      ) : null}
      {state === 'ready' && rows.length > 0 ? (
        <>
          <p className="mt-6 text-sm text-slate-400" data-testid="tests-count">
            Showing {rows.length} of {total}
          </p>
          <ul className="mt-3 space-y-3" data-testid="tests-list">
            {rows.map((row, index) => {
              const health = row.health || row.band || row.status
              const building = buildingName(row)
              return (
                <li key={row.id || row._id || index} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{locationName(row)}</p>
                      <p className="text-xs text-slate-500">
                        {personName(row)}
                        {building ? ` · ${building}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {health ? <StatusBadge status={health} /> : null}
                      <p className="text-xs text-slate-500">{rowDate(row)}</p>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
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
                      <dt className="text-xs text-slate-500">Packet loss</dt>
                      <dd>{formatNumber(row.packetLoss)}%</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Score</dt>
                      <dd>{formatNumber(row.score)}</dd>
                    </div>
                  </dl>
                  {row.trendMessage ? <p className="mt-3 text-sm text-amber-200">{row.trendMessage}</p> : null}
                  {row.problemFlag ? <p className="mt-1 text-sm text-orange-300">{row.problemFlag}</p> : null}
                </li>
              )
            })}
          </ul>
          {pages > 1 ? (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm disabled:opacity-50"
                disabled={page <= 1 || state === 'loading'}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <p className="text-sm text-slate-400">
                Page {page} of {pages}
              </p>
              <button
                type="button"
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm disabled:opacity-50"
                disabled={page >= pages || state === 'loading'}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
