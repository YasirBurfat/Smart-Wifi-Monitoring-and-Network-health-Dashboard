import { useEffect, useState } from 'react'
import { fetchOutages, isOpenOutage, outageLocationName } from '../../api/outages.js'
import { fetchTests } from '../../api/tests.js'
import { readHealth } from '../../api/tests.js'
import StatusBadge from '../../components/StatusBadge.jsx'

function formatWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export default function OutagesPage() {
  const [latest, setLatest] = useState(null)
  const [statusState, setStatusState] = useState('loading')
  const [outages, setOutages] = useState([])
  const [outageState, setOutageState] = useState('loading')

  useEffect(() => {
    document.title = 'CampusNet · Outages'
  }, [])

  useEffect(() => {
    let active = true
    fetchTests()
      .then((tests) => {
        if (!active) return
        const newest = [...tests].sort(
          (left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0),
        )[0]
        setLatest(newest || null)
        setStatusState('ready')
      })
      .catch(() => {
        if (!active) return
        setStatusState('empty')
      })
    fetchOutages()
      .then((list) => {
        if (!active) return
        setOutages(list.filter(isOpenOutage))
        setOutageState('ready')
      })
      .catch(() => {
        if (!active) return
        setOutageState('empty')
      })
    return () => {
      active = false
    }
  }, [])

  const health = latest ? readHealth(latest) : null

  return (
    <section className="max-w-3xl">
      <h2 className="text-2xl font-semibold">Outages</h2>
      <p className="mt-2 text-slate-400">Recent network status and current outages.</p>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4" data-testid="recent-status">
        <h3 className="text-sm font-medium text-slate-300">Recent status</h3>
        {statusState === 'loading' ? <p className="mt-3 text-sm text-slate-400">Loading status…</p> : null}
        {statusState !== 'loading' && !latest ? <p className="mt-3 text-sm text-slate-400">No recent tests.</p> : null}
        {latest ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            {health ? <StatusBadge status={health} /> : <span className="text-slate-400">No health yet</span>}
            <span>{latest.downloadMbps ?? latest.download ?? '—'} Mbps down</span>
            <span>{latest.pingMs ?? latest.ping ?? '—'} ms ping</span>
            {formatWhen(latest.createdAt) ? <span className="text-slate-500">{formatWhen(latest.createdAt)}</span> : null}
          </div>
        ) : null}
      </section>

      <section className="mt-4" data-testid="outage-list">
        <h3 className="text-sm font-medium text-slate-300">Outages</h3>
        {outageState === 'loading' ? <p className="mt-3 text-sm text-slate-400">Loading outages…</p> : null}
        {outageState !== 'loading' && outages.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No current outages.</p>
        ) : null}
        {outages.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {outages.map((outage, index) => (
              <li key={outage.id || index} className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                Possible Wi-Fi outage detected in {outageLocationName(outage)}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </section>
  )
}
