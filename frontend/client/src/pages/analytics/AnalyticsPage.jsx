import { useEffect, useMemo, useState } from 'react'
import { fetchByLocation, fetchComplaintsByBuilding } from '../../api/analytics.js'
import { getApiErrorMessage } from '../../api/errors.js'
import RequestError from '../../components/RequestError.jsx'
import { WidgetSkeleton } from '../../components/Skeleton.jsx'

function average(values) {
  const numbers = values.filter((value) => Number.isFinite(value))
  if (!numbers.length) return null
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length
}

function formatMetric(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toFixed(digits)
}

export default function AnalyticsPage() {
  const [locations, setLocations] = useState([])
  const [buildings, setBuildings] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    document.title = 'CampusNet · Analytics'
  }, [])

  useEffect(() => {
    let active = true
    setState('loading')
    setError('')
    Promise.allSettled([fetchByLocation(), fetchComplaintsByBuilding()]).then(([locationResult, buildingResult]) => {
      if (!active) return
      setLocations(locationResult.status === 'fulfilled' ? locationResult.value : [])
      setBuildings(buildingResult.status === 'fulfilled' ? buildingResult.value : [])
      const failed = locationResult.status === 'rejected' ? locationResult : buildingResult.status === 'rejected' ? buildingResult : null
      if (locationResult.status === 'rejected' && buildingResult.status === 'rejected') {
        setError(getApiErrorMessage(locationResult.reason, 'Could not load analytics.'))
        setState('error')
        return
      }
      if (failed) setError(getApiErrorMessage(failed.reason, 'Could not load part of the analytics.'))
      setState('ready')
    })
    return () => {
      active = false
    }
  }, [attempt])

  const comparison = useMemo(() => {
    const complaintMap = new Map(buildings.map((row) => [row.building, row]))
    const groups = new Map()
    for (const location of locations) {
      const key = location.building || 'Unassigned'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(location)
    }
    return [...groups.entries()].map(([building, rows]) => {
      const complaints = complaintMap.get(building)
      return {
        building,
        locations: rows.length,
        avgDownload: average(rows.map((row) => row.avgDownload)),
        avgPing: average(rows.map((row) => row.avgPing)),
        tests: rows.reduce((sum, row) => sum + (Number(row.tests) || 0), 0),
        complaints: complaints?.total || 0,
        open: complaints?.open || 0,
      }
    }).sort((left, right) => left.building.localeCompare(right.building))
  }, [locations, buildings])

  return (
    <section className="max-w-5xl" data-testid="building-comparison">
      <h2 className="text-2xl font-semibold">Analytics</h2>
      <p className="mt-2 text-slate-400">Building comparison from location tests and complaints. This page does not change user roles.</p>

      {state === 'loading' ? <WidgetSkeleton label="Loading analytics…" className="mt-6 h-48" /> : null}
      {error ? <RequestError message={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {state === 'ready' && !error && comparison.length === 0 ? (
        <p className="np-empty mt-6">No buildings to compare yet.</p>
      ) : null}
      {state === 'ready' && comparison.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Building</th>
                <th className="px-4 py-3 font-medium">Locations</th>
                <th className="px-4 py-3 font-medium">Avg download</th>
                <th className="px-4 py-3 font-medium">Avg ping</th>
                <th className="px-4 py-3 font-medium">Tests</th>
                <th className="px-4 py-3 font-medium">Complaints</th>
                <th className="px-4 py-3 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.building} className="border-t border-slate-800">
                  <td className="px-4 py-3">{row.building}</td>
                  <td className="px-4 py-3">{row.locations}</td>
                  <td className="px-4 py-3">{formatMetric(row.avgDownload)} Mbps</td>
                  <td className="px-4 py-3">{formatMetric(row.avgPing)} ms</td>
                  <td className="px-4 py-3">{row.tests}</td>
                  <td className="px-4 py-3">{row.complaints}</td>
                  <td className="px-4 py-3">{row.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
