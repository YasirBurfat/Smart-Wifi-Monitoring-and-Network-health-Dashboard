import { useEffect, useState } from 'react'
import { fetchLocations } from '../../api/locations.js'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useSpeedTest } from '../../hooks/useSpeedTest.js'

const STAGES = [
  { id: 'ping', label: 'Ping' },
  { id: 'download', label: 'Download' },
  { id: 'upload', label: 'Upload' },
]

function stageMarker(id, stage, hasError, demo) {
  if (demo) return 'pending'
  const order = STAGES.map((item) => item.id)
  const index = order.indexOf(id)
  const current = order.indexOf(stage)
  if (hasError) {
    if (current === index) return 'failed'
    if (current > index) return 'complete'
    return 'pending'
  }
  if (stage === 'saving' || stage === 'done') return 'complete'
  if (current === index) return 'active'
  if (current > index) return 'complete'
  return 'pending'
}

function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  const rounded = Math.round(number * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

export default function SpeedTestPage() {
  const { stage, result, health, error, running, run } = useSpeedTest()
  const [locations, setLocations] = useState([])
  const [locationState, setLocationState] = useState('loading')
  const [locationId, setLocationId] = useState('')
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    document.title = 'CampusNet · Speed Test'
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

  const cannotRun =
    running || locationState === 'loading' || locationState === 'empty' || (locationState === 'ready' && !locationId)

  function onRun() {
    if (cannotRun) return
    run({ locationId, demo })
  }

  return (
    <section className="max-w-3xl">
      <h2 className="text-2xl font-semibold">Speed Test</h2>
      <p className="mt-2 text-slate-400">Measure the campus connection from a location.</p>

      <div className="mt-6">
        <label className="block text-sm" htmlFor="location">
          <span className="mb-1.5 block text-slate-300">Location</span>
          {locationState === 'loading' ? <p className="text-slate-400">Loading locations…</p> : null}
          {locationState === 'empty' ? (
            <p className="text-slate-300" data-testid="no-locations">
              no locations
            </p>
          ) : null}
          {locationState === 'error' ? (
            <p className="text-slate-400">Could not load locations.</p>
          ) : null}
          {locationState === 'ready' ? (
            <select
              id="location"
              data-testid="location-select"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              disabled={running}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-sky-400 focus:ring-2"
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          ) : null}
        </label>
      </div>

      <p className="mt-6 text-sm" data-testid="stages">
        {STAGES.map((item, index) => {
          const marker = stageMarker(item.id, stage, Boolean(error), demo)
          const tone =
            marker === 'active'
              ? 'text-sky-300'
              : marker === 'complete'
                ? 'text-slate-100'
                : marker === 'failed'
                  ? 'text-rose-300'
                  : 'text-slate-500'
          return (
            <span key={item.id}>
              {index > 0 ? <span className="text-slate-500"> → </span> : null}
              <span data-stage={item.id} data-state={marker} className={`font-medium ${tone}`} aria-current={marker === 'active' ? 'step' : undefined}>
                {item.label}
              </span>
            </span>
          )
        })}
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          data-testid="run-speed-test"
          onClick={onRun}
          disabled={cannotRun}
          aria-busy={running}
          className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {running ? 'Running…' : 'Run Speed Test'}
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            data-testid="demo-metrics"
            checked={demo}
            disabled={running}
            onChange={(event) => setDemo(event.target.checked)}
          />
          Demo metrics
        </label>
      </div>
      <p className="mt-2 text-xs text-slate-500">Demo metrics: download 36, upload 14, ping 28, packet loss 1.</p>

      {error ? (
        <p
          className="mt-6 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
          role="alert"
          data-testid="speed-error"
        >
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4" data-testid="result-card">
          <h3 className="text-sm font-medium text-slate-300">Result</h3>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Download</dt>
              <dd className="mt-1 text-lg font-semibold" data-testid="result-download">
                {formatNumber(result.downloadMbps)} Mbps
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Upload</dt>
              <dd className="mt-1 text-lg font-semibold" data-testid="result-upload">
                {formatNumber(result.uploadMbps)} Mbps
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Ping</dt>
              <dd className="mt-1 text-lg font-semibold" data-testid="result-ping">
                {formatNumber(result.pingMs)} ms
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Jitter</dt>
              <dd className="mt-1 text-lg font-semibold" data-testid="result-jitter">
                {result.jitterMs == null ? '—' : `${formatNumber(result.jitterMs)} ms`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Packet loss</dt>
              <dd className="mt-1 text-lg font-semibold" data-testid="result-loss">
                {formatNumber(result.packetLoss)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Health</dt>
              <dd className="mt-1" data-testid="result-health">
                {health ? <StatusBadge status={health} /> : '—'}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
    </section>
  )
}
