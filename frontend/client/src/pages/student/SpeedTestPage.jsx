import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Wifi } from 'lucide-react'
import { fetchLocations } from '../../api/locations.js'
import { getApiErrorMessage } from '../../api/errors.js'
import { fetchTests } from '../../api/tests.js'
import RequestError from '../../components/RequestError.jsx'
import { BlockSkeleton } from '../../components/Skeleton.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useSpeedTest } from '../../hooks/useSpeedTest.js'

const VISUAL_STEPS = [
  'Connecting',
  'Measuring latency',
  'Checking packet loss',
  'Testing download',
  'Testing upload',
  'Calculating health score',
]

function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  const rounded = Math.round(number * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

function stepState(index, stage) {
  if (!stage || stage === 'idle') return 'pending'
  if (stage === 'done') return 'complete'
  const activeIndex = { ping: 1, download: 3, upload: 4, saving: 5 }[stage]
  if (activeIndex == null) return 'pending'
  if (index < activeIndex) return 'complete'
  if (index === activeIndex) return 'active'
  return 'pending'
}

function Sparkline({ values, color }) {
  const nums = (values || []).map(Number).filter((value) => Number.isFinite(value))
  if (nums.length < 2) {
    return <svg viewBox="0 0 80 24" className="h-6 w-20" aria-hidden="true"><line x1="0" y1="12" x2="80" y2="12" stroke={color} strokeOpacity="0.45" /></svg>
  }
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const span = max - min || 1
  const points = nums.map((value, index) => {
    const x = (index / (nums.length - 1)) * 80
    const y = 22 - ((value - min) / span) * 20
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox="0 0 80 24" className="h-6 w-20" aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  )
}

export default function SpeedTestPage() {
  const navigate = useNavigate()
  const { stage, result, health, error, running, run, cancel } = useSpeedTest()
  const [locations, setLocations] = useState([])
  const [history, setHistory] = useState([])
  const [locationState, setLocationState] = useState('loading')
  const [locationError, setLocationError] = useState('')
  const [locationId, setLocationId] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [demo, setDemo] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    document.title = 'CampusNet · Speed Test'
  }, [])

  useEffect(() => {
    let active = true
    Promise.allSettled([fetchLocations(), fetchTests()]).then(([locationResult, testResult]) => {
      if (!active) return
      const list = locationResult.status === 'fulfilled' ? locationResult.value : []
      setLocations(list)
      setLocationId((current) => (list.some((location) => location.id === current) ? current : list[0]?.id || ''))
      setLocationError(locationResult.status === 'fulfilled' ? '' : getApiErrorMessage(locationResult.reason, 'Could not load locations.'))
      setLocationState(locationResult.status === 'fulfilled' ? (list.length ? 'ready' : 'empty') : 'error')
      setHistory(testResult.status === 'fulfilled' ? testResult.value : [])
    })
    return () => {
      active = false
    }
  }, [attempt])

  const selected = locations.find((location) => location.id === locationId) || null
  const series = useMemo(() => {
    const rows = history.filter((test) => {
      const id = test.locationId || test.location?.id || test.location?._id
      return !selected || String(id) === String(selected.id)
    }).slice(0, 8).reverse()
    return {
      ping: rows.map((row) => row.pingMs ?? row.ping),
      download: rows.map((row) => row.downloadMbps ?? row.download),
      upload: rows.map((row) => row.uploadMbps ?? row.upload),
      loss: rows.map((row) => row.packetLoss),
    }
  }, [history, selected])

  const cannotRun = running || locationState === 'loading'
  const percent = stage === 'done' ? 100 : stage === 'saving' ? 90 : stage === 'upload' ? 72 : stage === 'download' ? 48 : stage === 'ping' ? 20 : 0

  function onRun() {
    if (running || locationState === 'loading') return
    if (locationState !== 'ready' || !locationId) {
      setFieldError('Choose a location.')
      return
    }
    setFieldError('')
    run({ locationId, demo })
  }

  function onCancel() {
    cancel()
    navigate('/student/home')
  }

  const radius = 86
  const circ = 2 * Math.PI * radius
  const dash = circ * (1 - percent / 100)

  return (
    <section>
      <h2 className="text-3xl font-semibold uppercase leading-tight text-white">
        Testing your
        <span className="mt-1 block text-[#22d3ee]">campus connection...</span>
      </h2>
      <p className="mt-3 max-w-xl text-[#cbd5e1]">
        This will only take a few seconds. Please keep this page open and don't close your browser.
      </p>

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(16rem,0.7fr)]">
        <div className="rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] p-6">
          {locationState === 'loading' ? <BlockSkeleton className="mb-4 h-10" /> : null}
          {locationState === 'empty' ? <p className="np-empty mb-4" data-testid="no-locations">no locations</p> : null}
          {locationState === 'error' ? <RequestError message={locationError} onRetry={() => setAttempt((value) => value + 1)} /> : null}
          {fieldError ? <p className="mb-4 text-sm text-rose-200" role="alert">{fieldError}</p> : null}
          {locationState === 'ready' ? (
            <label className="mb-4 block text-sm" htmlFor="location">
              <span className="mb-1.5 block">Location</span>
              <select
                id="location"
                data-testid="location-select"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
                disabled={running}
                className="w-full rounded-xl border border-[rgba(56,189,248,0.18)] bg-[#07111f] px-3 py-2 text-[#cbd5e1]"
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="mx-auto grid h-56 w-56 place-items-center">
            <svg viewBox="0 0 200 200" className="h-56 w-56">
              <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(56,189,248,0.15)" strokeWidth="10" />
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={dash}
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div className="-mt-40 text-center">
              <Wifi aria-hidden="true" className="mx-auto text-[#22d3ee]" size={28} />
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">{running ? 'Testing' : 'Ready'}</p>
              <p className="text-3xl font-semibold text-white">{percent}%</p>
            </div>
          </div>

          <ol className="mt-8 space-y-2" data-testid="stages">
            {VISUAL_STEPS.map((label, index) => {
              const marker = error ? 'pending' : stepState(index, stage)
              const color = marker === 'active' ? 'text-[#22d3ee]' : marker === 'complete' ? 'text-white' : marker === 'failed' ? 'text-[#f87171]' : 'text-[#94a3b8]'
              return (
                <li key={label} className={`flex items-center gap-2 text-sm ${color}`} data-state={marker}>
                  {marker === 'complete' ? <Check size={14} aria-hidden="true" /> : <span className="inline-block h-3.5 w-3.5 rounded-full border border-current" />}
                  {label}
                </li>
              )
            })}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="run-speed-test"
              onClick={onRun}
              disabled={cannotRun}
              aria-busy={running}
              className="inline-flex items-center gap-2 bg-sky-400 px-4 py-2 text-sm disabled:opacity-60"
            >
              <Wifi aria-hidden="true" size={16} />
              {running ? 'Running…' : 'Test my Wi-Fi'}
            </button>
            <button type="button" className="rounded-full border border-[rgba(56,189,248,0.18)] px-4 py-2 text-sm text-[#cbd5e1]" onClick={onCancel}>
              Cancel Test
            </button>
            <label className="flex items-center gap-2 text-sm text-[#cbd5e1]">
              <input type="checkbox" data-testid="demo-metrics" checked={demo} disabled={running} onChange={(event) => setDemo(event.target.checked)} />
              Demo metrics
            </label>
          </div>
          {error ? (
            <p className="mt-4 text-sm text-[#f87171]" role="alert" data-testid="speed-error">{error}</p>
          ) : null}
        </div>

        <div className="space-y-3" data-testid="result-card">
          {[
            ['Ping', result?.pingMs, 'ms', series.ping, '#fbbf24', 'result-ping'],
            ['Download', result?.downloadMbps, 'Mbps', series.download, '#22d3ee', 'result-download'],
            ['Upload', result?.uploadMbps, 'Mbps', series.upload, '#38bdf8', 'result-upload'],
            ['Packet loss', result?.packetLoss, '%', series.loss, '#f87171', 'result-loss'],
          ].map(([label, value, unit, spark, color, testId]) => (
            <div key={label} className="flex items-center justify-between rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">{label}</p>
                <p className="text-xl font-semibold text-white" data-testid={testId}>{formatNumber(value)} {unit}</p>
              </div>
              <Sparkline values={spark} color={color} />
            </div>
          ))}
          <div className="rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">Health</p>
            <div className="mt-1" data-testid="result-health">{health ? <StatusBadge status={health} /> : '—'}</div>
          </div>
          {!result && !running ? <p className="np-empty">No result yet.</p> : null}
        </div>

        <aside className="rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">Current location</p>
          {locationState === 'loading' ? <BlockSkeleton className="mt-3 h-24" /> : null}
          {selected ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt>Building</dt><dd className="text-white">{selected.building || '—'}</dd></div>
              <div><dt>Campus</dt><dd className="text-white">Mehran University, Jamshoro</dd></div>
              <div><dt>Access point</dt><dd className="text-white">{selected.name}</dd></div>
              <div><dt>Network name</dt><dd className="text-white">Campus Network</dd></div>
            </dl>
          ) : null}
          {locationState !== 'loading' && !selected ? <p className="np-empty mt-3">No location selected.</p> : null}
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">Quick tips</p>
          <p className="mt-2 text-sm text-[#cbd5e1]">Stay close to the Wi-Fi router and avoid heavy downloads.</p>
        </aside>
      </div>
    </section>
  )
}
