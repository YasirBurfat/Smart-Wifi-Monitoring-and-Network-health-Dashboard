import { useEffect, useState } from 'react'
import { fetchLogs } from '../../api/logs.js'
import { getApiErrorMessage } from '../../api/errors.js'
import RequestError from '../../components/RequestError.jsx'
import { WidgetSkeleton } from '../../components/Skeleton.jsx'

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

function actorName(actor) {
  if (!actor) return 'System'
  return actor.name || actor.email || 'User'
}

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    document.title = 'CampusNet · Activity log'
  }, [])

  useEffect(() => {
    let active = true
    fetchLogs()
      .then((result) => {
        if (!active) return
        setLogs(result.logs)
        setState('ready')
      })
      .catch((err) => {
        if (!active) return
        setError(getApiErrorMessage(err, 'Could not load the activity log.'))
        setState('error')
      })
    return () => {
      active = false
    }
  }, [attempt])

  return (
    <section className="max-w-5xl">
      <h2 className="text-2xl font-semibold">Activity log</h2>
      <p className="mt-2 text-slate-400">Create, update, and delete entries recorded by the server.</p>
      {state === 'loading' ? <WidgetSkeleton label="Loading log…" /> : null}
      {state === 'error' ? <RequestError message={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {state === 'ready' && logs.length === 0 ? <p className="np-empty mt-6">No activity yet.</p> : null}
      {state === 'ready' && logs.length > 0 ? (
        <ul className="mt-6 space-y-3" data-testid="activity-log">
          {logs.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {entry.action} {entry.entity}
                </p>
                <p className="text-xs text-slate-500">{formatWhen(entry.createdAt)}</p>
              </div>
              <p className="mt-1 text-xs text-slate-400">{actorName(entry.actor)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
