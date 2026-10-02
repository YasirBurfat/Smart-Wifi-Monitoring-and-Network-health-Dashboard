import { useEffect, useState } from 'react'
import { fetchOutages, isOpenOutage, outageLocationName, updateOutage } from '../../api/outages.js'
import { getApiErrorMessage } from '../../api/errors.js'
import RequestError from '../../components/RequestError.jsx'
import { WidgetSkeleton } from '../../components/Skeleton.jsx'

function formatWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export default function ItOutagesPage() {
  const [outages, setOutages] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState('')

  useEffect(() => {
    document.title = 'CampusNet · Outages'
  }, [])

  function load() {
    return fetchOutages()
      .then((list) => {
        setOutages(list)
        setState('ready')
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'Could not load outages.'))
        setState('error')
      })
  }

  useEffect(() => {
    let active = true
    fetchOutages()
      .then((list) => {
        if (!active) return
        setOutages(list)
        setState('ready')
      })
      .catch((err) => {
        if (!active) return
        setError(getApiErrorMessage(err, 'Could not load outages.'))
        setState('error')
      })
    return () => {
      active = false
    }
  }, [])

  const active = outages.filter(isOpenOutage)

  async function onPatch(outage, status) {
    setPendingId(outage.id)
    setError('')
    try {
      await updateOutage(outage.id, status)
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update the outage.'))
    } finally {
      setPendingId('')
    }
  }

  return (
    <section className="max-w-4xl">
      <h2 className="text-2xl font-semibold">Outages</h2>
      <p className="mt-2 text-slate-400">Active outages also appear in the banner. Resolve one when the location recovers.</p>
      {active.length > 0 ? (
        <div className="mt-4 space-y-2" data-testid="outage-banner-list">
          {active.map((outage) => (
            <p key={outage.id} className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              Possible Wi-Fi outage detected in {outageLocationName(outage)}
            </p>
          ))}
        </div>
      ) : null}
      {state === 'loading' ? <WidgetSkeleton label="Loading outages…" /> : null}
      {state === 'error' ? <RequestError message={error} onRetry={load} /> : null}
      {error && state === 'ready' ? <p className="mt-4 text-sm text-rose-200" role="alert">{error}</p> : null}
      {state === 'ready' && outages.length === 0 ? <p className="np-empty mt-6">No outages yet.</p> : null}
      {state === 'ready' && outages.length > 0 ? (
        <ul className="mt-6 space-y-3" data-testid="it-outage-list">
          {outages.map((outage) => {
            const open = isOpenOutage(outage)
            return (
              <li key={outage.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{outageLocationName(outage)}</p>
                  <p className="text-xs text-slate-300">{outage.status}</p>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {outage.type} · {outage.complaintCount} complaints
                  {formatWhen(outage.startedAt) ? ` · ${formatWhen(outage.startedAt)}` : ''}
                </p>
                <button
                  type="button"
                  data-testid="patch-outage"
                  disabled={pendingId === outage.id}
                  onClick={() => onPatch(outage, open ? 'resolved' : 'active')}
                  className="mt-3 rounded-lg border border-slate-700 px-3 py-1.5 text-sm disabled:opacity-60"
                >
                  {pendingId === outage.id ? 'Saving…' : open ? 'Mark resolved' : 'Reopen'}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
