import { useEffect, useMemo, useState } from 'react'
import { emptySummary, fetchSummary } from '../../api/dashboard.js'
import { fetchComplaints } from '../../api/complaints.js'
import { fetchLocations } from '../../api/locations.js'
import { fetchOutages, isOpenOutage, outageLocationName } from '../../api/outages.js'
import CampusHeatmap from '../../components/CampusHeatmap.jsx'
import DashboardCharts from '../../components/DashboardCharts.jsx'
import FilterBar from '../../components/FilterBar.jsx'
import LocationGrid from '../../components/LocationGrid.jsx'
import { BlockSkeleton, CardSkeleton } from '../../components/Skeleton.jsx'
import SummaryCards from '../../components/SummaryCards.jsx'
import { EMPTY_FILTERS, applyDashboardFilters } from '../../dashboardFilters.js'

export default function DashboardPage({ mode = 'full' }) {
  const [summary, setSummary] = useState(emptySummary())
  const [locations, setLocations] = useState([])
  const [complaints, setComplaints] = useState([])
  const [outages, setOutages] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [loading, setLoading] = useState(true)
  const [empty, setEmpty] = useState(false)

  useEffect(() => {
    document.title = 'CampusNet · Dashboard'
  }, [])

  useEffect(() => {
    let active = true
    Promise.allSettled([fetchSummary(), fetchLocations(), fetchComplaints(), fetchOutages()]).then((results) => {
      if (!active) return
      const [summaryResult, locationResult, complaintResult, outageResult] = results
      const summaryValue = summaryResult.status === 'fulfilled' ? summaryResult.value : emptySummary()
      const apiLocations = locationResult.status === 'fulfilled' ? locationResult.value : []
      setSummary(summaryValue)
      setLocations(summaryValue.locations.length ? summaryValue.locations : apiLocations)
      setComplaints(complaintResult.status === 'fulfilled' ? complaintResult.value : [])
      setOutages(outageResult.status === 'fulfilled' ? outageResult.value.filter(isOpenOutage) : [])
      setEmpty(summaryResult.status !== 'fulfilled' && locationResult.status !== 'fulfilled')
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(
    () => applyDashboardFilters(locations, complaints, summary.hourly, filters),
    [locations, complaints, summary.hourly, filters],
  )

  return (
    <section className="max-w-6xl min-w-0" data-testid="dashboard">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="mt-2 text-slate-400">
        {mode === 'it' ? 'Operational view of tests, complaints, and outages.' : 'Campus network analytics.'}
      </p>
      {empty ? <p className="mt-4 text-sm text-slate-400">No dashboard data yet.</p> : null}

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <SummaryCards summary={summary} />
        )}
      </div>

      <div className="mt-6">
        <FilterBar filters={filters} locations={locations} onChange={setFilters} />
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-medium text-slate-300">Locations</h3>
        {loading ? <BlockSkeleton className="h-40" /> : <LocationGrid locations={filtered.locations} />}
      </div>

      {mode === 'it' ? (
        <section className="mt-6" data-testid="operational-outages">
          <h3 className="text-sm font-medium text-slate-300">Current outages</h3>
          {outages.length === 0 ? <p className="mt-3 text-sm text-slate-400">No current outages.</p> : null}
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
      ) : null}

      {mode === 'full' ? (
        <div className="mt-6 space-y-4">
          {loading ? <BlockSkeleton className="h-64" /> : <DashboardCharts locations={filtered.locations} hourly={filtered.hourly} />}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-sm font-medium text-slate-300">Campus heatmap</h3>
            <div className="mt-4">{loading ? <BlockSkeleton className="h-40" /> : <CampusHeatmap locations={filtered.locations} />}</div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
