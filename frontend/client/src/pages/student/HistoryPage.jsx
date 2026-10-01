import { useEffect, useState } from 'react'
import { fetchTests, readHealth } from '../../api/tests.js'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

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
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'CampusNet · My History'
  }, [])

  useEffect(() => {
    let active = true
    fetchTests()
      .then((tests) => {
        if (!active) return
        setRows(ownRows(tests, user))
        setStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setError('Could not load your tests.')
        setStatus('error')
      })
    return () => {
      active = false
    }
  }, [user])

  return (
    <section className="max-w-3xl">
      <h2 className="text-2xl font-semibold">My History</h2>
      <p className="mt-2 text-slate-400">Your saved speed tests.</p>

      {status === 'loading' ? <p className="mt-6 text-sm text-slate-400">Loading tests…</p> : null}
      {status === 'error' ? (
        <p className="mt-6 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
          {error}
        </p>
      ) : null}
      {status === 'ready' && rows.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">No tests yet.</p>
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
