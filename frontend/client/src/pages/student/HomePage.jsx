import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Wifi } from 'lucide-react'
import { getApiErrorMessage } from '../../api/errors.js'
import { fetchLocations } from '../../api/locations.js'
import { fetchTests, readHealth } from '../../api/tests.js'
import CampusMap from '../../components/CampusMap.jsx'
import RequestError from '../../components/RequestError.jsx'
import { WidgetSkeleton } from '../../components/Skeleton.jsx'
import { STATUS_COLOR, STATUS_LEVELS } from '../../status.js'

const STORAGE_KEY = 'campusnet.selectedLocation'

function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  const rounded = Math.round(number * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

export default function HomePage() {
  const [locations, setLocations] = useState([])
  const [tests, setTests] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [testError, setTestError] = useState('')
  const [locationId, setLocationId] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    document.title = 'CampusNet · Home'
  }, [])

  useEffect(() => {
    let active = true
    Promise.allSettled([fetchLocations(), fetchTests()]).then(([locationResult, testResult]) => {
      if (!active) return
      const nextLocations = locationResult.status === 'fulfilled' ? locationResult.value : []
      const nextTests = testResult.status === 'fulfilled' ? testResult.value : []
      setLocations(nextLocations)
      setTests(testResult.status === 'fulfilled' ? nextTests : [])
      const stored = window.localStorage.getItem(STORAGE_KEY) || ''
      const match = nextLocations.find((location) => location.id === stored)
      setLocationId(match?.id || nextLocations[0]?.id || '')
      setError(locationResult.status === 'fulfilled' ? '' : getApiErrorMessage(locationResult.reason, 'Could not load locations.'))
      setTestError(testResult.status === 'fulfilled' ? '' : getApiErrorMessage(testResult.reason, 'Could not load your tests.'))
      setState(locationResult.status === 'fulfilled' ? 'ready' : 'error')
    })
    return () => {
      active = false
    }
  }, [attempt])

  useEffect(() => {
    if (!locationId) return
    window.localStorage.setItem(STORAGE_KEY, locationId)
    window.dispatchEvent(new Event('campus-location'))
  }, [locationId])

  useEffect(() => {
    function onSync() {
      const stored = window.localStorage.getItem(STORAGE_KEY) || ''
      if (!stored) return
      setLocationId((current) => (current === stored ? current : stored))
    }
    window.addEventListener('campus-location', onSync)
    return () => window.removeEventListener('campus-location', onSync)
  }, [])

  const selected = locations.find((location) => location.id === locationId) || null
  const lastTest = useMemo(() => {
    const mine = tests.filter((test) => {
      const id = test.locationId || test.location?.id || test.location?._id
      return selected ? String(id) === String(selected.id) : true
    })
    return [...mine].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))[0] || null
  }, [tests, selected])

  const health = selected?.networkStatus && STATUS_LEVELS.includes(selected.networkStatus)
    ? selected.networkStatus
    : lastTest
      ? readHealth(lastTest)
      : null
  const tone = STATUS_COLOR[health] || '#34d399'
  const connected = health === 'Excellent' || health === 'Good' || health === 'Fair'

  return (
    <section className="grid items-start gap-6 xl:grid-cols-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">Student network experience</p>
        <h2 className="mt-3 text-4xl font-semibold uppercase leading-tight text-white">
          How's your
          <span className="mt-1 block text-[#22d3ee]">connection?</span>
        </h2>
        <p className="mt-4 max-w-md text-[#cbd5e1]">
          Check your Wi-Fi, test your speed, and report issues — all in one place.
        </p>
        <Link
          to="/student/speed-test"
          className="mt-6 inline-flex items-center gap-2 bg-sky-400 px-5 py-2.5 text-sm"
        >
          <Wifi aria-hidden="true" size={16} />
          Test my Wi-Fi
        </Link>

        {state === 'loading' ? <WidgetSkeleton label="Loading campus data…" className="mt-6 h-36" /> : null}
        {state === 'error' ? <RequestError message={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
        {state === 'ready' && testError ? <RequestError message={testError} onRetry={() => setAttempt((value) => value + 1)} /> : null}
        {state === 'ready' && locations.length === 0 ? (
          <p className="np-empty mt-6" data-testid="no-locations">No locations yet.</p>
        ) : null}

        {state === 'ready' && locations.length > 0 ? (
          <>
            <button
              type="button"
              className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] px-4 py-3 text-left"
              data-testid="location-health"
              onClick={() => {
                const index = locations.findIndex((location) => location.id === locationId)
                const next = locations[(index + 1) % locations.length]
                if (next) setLocationId(next.id)
              }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone }} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-white">{selected?.name}</span>
                <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: tone }}>
                  {connected ? 'Connected' : health || 'Unknown'}
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="text-[#94a3b8]" size={18} />
            </button>
            <label className="sr-only" htmlFor="home-location">Selected location</label>
            <select
              id="home-location"
              className="sr-only"
              data-testid="home-location"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>

            {!testError ? <section className="mt-4 rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] p-4" data-testid="last-test">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">Last test</p>
              {!lastTest ? <p className="np-empty mt-3">No tests at this location yet.</p> : null}
              {lastTest ? (
                <div className="mt-3 flex flex-wrap items-end gap-6">
                  <p className="text-5xl font-semibold text-white">{formatNumber(lastTest.score)}</p>
                  <p className="pb-1 text-sm font-semibold uppercase tracking-wide" style={{ color: tone }}>{health || '—'}</p>
                  <p className="pb-1 text-sm text-[#cbd5e1]">{formatNumber(lastTest.downloadMbps ?? lastTest.download)} Mbps</p>
                  <p className="pb-1 text-sm text-[#cbd5e1]">{formatNumber(lastTest.pingMs ?? lastTest.ping)} ms</p>
                </div>
              ) : null}
            </section> : null}
          </>
        ) : null}
      </div>
      <CampusMap locations={state === 'ready' ? locations : []} loading={state === 'loading'} />
    </section>
  )
}
