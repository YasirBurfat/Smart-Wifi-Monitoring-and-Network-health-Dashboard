import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fetchAiSummary, fetchRecommendations } from '../../api/ai.js'
import { fetchByLocation, fetchDaily, fetchHourly } from '../../api/analytics.js'
import { emptySummary, fetchHeatmap, fetchSummary, fetchTrends } from '../../api/dashboard.js'
import { getApiErrorMessage } from '../../api/errors.js'
import { fetchComplaints } from '../../api/complaints.js'
import { fetchLocations } from '../../api/locations.js'
import { fetchOutages, isOpenOutage, outageLocationName } from '../../api/outages.js'
import CampusMap from '../../components/CampusMap.jsx'
import DashboardCharts from '../../components/DashboardCharts.jsx'
import FilterBar from '../../components/FilterBar.jsx'
import RequestError from '../../components/RequestError.jsx'
import { BlockSkeleton, CardSkeleton } from '../../components/Skeleton.jsx'
import { EMPTY_FILTERS, applyDashboardFilters } from '../../dashboardFilters.js'
import { STATUS_COLOR, STATUS_LEVELS } from '../../status.js'

const RANGES = ['24H', '7D', '30D']

function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const number = Number(value)
  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

function investigatePath() {
  const path = window.location.pathname
  if (path.startsWith('/admin')) return '/admin/locations'
  if (path.startsWith('/manager')) return '/manager/locations'
  return '/it/outages'
}

export default function DashboardPage({ mode = 'full' }) {
  const [summary, setSummary] = useState(emptySummary())
  const [locations, setLocations] = useState([])
  const [complaints, setComplaints] = useState([])
  const [outages, setOutages] = useState([])
  const [hourly, setHourly] = useState([])
  const [daily, setDaily] = useState([])
  const [aiSummary, setAiSummary] = useState('')
  const [action, setAction] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [range, setRange] = useState('24H')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [panelErrors, setPanelErrors] = useState({ map: '', trend: '', hourly: '', daily: '', ai: '', alerts: '', outages: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    document.title = 'CampusNet · Dashboard'
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    Promise.allSettled([
      fetchSummary(),
      fetchHeatmap(),
      fetchTrends(),
      fetchByLocation(),
      fetchLocations(),
      fetchComplaints(),
      fetchOutages(),
      fetchHourly(),
      fetchDaily(),
      fetchAiSummary(),
      fetchRecommendations(),
    ]).then((results) => {
      if (!active) return
      const [summaryResult, heatmapResult, trendResult, byLocationResult, locationResult, complaintResult, outageResult, hourlyResult, dailyResult, aiResult, recommendationResult] = results
      if (summaryResult.status !== 'fulfilled') {
        setSummary(emptySummary())
        setLocations([])
        setComplaints([])
        setOutages([])
        setHourly([])
        setDaily([])
        setAiSummary('')
        setAction('')
        setLoadError(getApiErrorMessage(summaryResult.reason, 'Could not load the dashboard.'))
        setLoading(false)
        return
      }
      const summaryValue = summaryResult.value
      const heatmap = heatmapResult.status === 'fulfilled' ? heatmapResult.value : []
      const byLocation = byLocationResult.status === 'fulfilled' ? byLocationResult.value : []
      const apiLocations = locationResult.status === 'fulfilled' ? locationResult.value : []
      const metrics = new Map(byLocation.map((location) => [location.id, location]))
      const merged = (heatmap.length ? heatmap : summaryValue.locations.length ? summaryValue.locations : apiLocations).map((location) => {
        const extra = metrics.get(location.id)
        if (!extra) return location
        return {
          ...location,
          avgDownload: location.avgDownload ?? extra.avgDownload,
          avgUpload: location.avgUpload ?? extra.avgUpload,
          avgPing: location.avgPing ?? extra.avgPing,
          avgPacketLoss: location.avgPacketLoss ?? extra.avgPacketLoss,
          score: location.score ?? extra.score,
          tests: location.tests ?? extra.tests,
          networkStatus: location.networkStatus || extra.networkStatus,
        }
      })
      const trends = trendResult.status === 'fulfilled' ? trendResult.value : []
      setSummary({
        ...summaryValue,
        locations: merged,
        hourly: trends.length ? trends : summaryValue.hourly,
      })
      setLocations(merged)
      setComplaints(complaintResult.status === 'fulfilled' ? complaintResult.value : [])
      setOutages(outageResult.status === 'fulfilled' ? outageResult.value.filter(isOpenOutage) : [])
      setHourly(hourlyResult.status === 'fulfilled' ? hourlyResult.value : [])
      setDaily(dailyResult.status === 'fulfilled' ? dailyResult.value : [])
      setAiSummary(aiResult.status === 'fulfilled' ? aiResult.value?.summary || '' : '')
      const recommendations = recommendationResult.status === 'fulfilled' ? recommendationResult.value.recommendations : []
      setAction(recommendations[0]?.reason || recommendations[0]?.name || '')
      setPanelErrors({
        map: heatmapResult.status === 'fulfilled' ? '' : getApiErrorMessage(heatmapResult.reason, 'Could not load the map.'),
        trend: trendResult.status === 'fulfilled' || (summaryValue.hourly || []).length ? '' : getApiErrorMessage(trendResult.reason, 'Could not load the trend.'),
        hourly: hourlyResult.status === 'fulfilled' ? '' : getApiErrorMessage(hourlyResult.reason, 'Could not load hourly performance.'),
        daily: dailyResult.status === 'fulfilled' ? '' : getApiErrorMessage(dailyResult.reason, 'Could not load daily performance.'),
        ai: aiResult.status === 'fulfilled' && recommendationResult.status === 'fulfilled' ? '' : getApiErrorMessage(aiResult.status === 'rejected' ? aiResult.reason : recommendationResult.reason, 'Could not load AI insights.'),
        alerts: complaintResult.status === 'fulfilled' ? '' : getApiErrorMessage(complaintResult.reason, 'Could not load alerts.'),
        outages: outageResult.status === 'fulfilled' ? '' : getApiErrorMessage(outageResult.reason, 'Could not load outages.'),
      })
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [attempt])

  const filtered = useMemo(
    () => applyDashboardFilters(locations, complaints, summary.hourly, filters),
    [locations, complaints, summary.hourly, filters],
  )

  const scores = filtered.locations.map((location) => location.score).filter((score) => score != null)
  const healthPercent = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : null
  const donut = STATUS_LEVELS.map((level) => ({
    name: level,
    value: filtered.locations.filter((location) => location.networkStatus === level).length,
    color: STATUS_COLOR[level],
  })).filter((entry) => entry.value > 0)
  const attention = filtered.locations.filter((location) => location.networkStatus === 'Poor' || location.networkStatus === 'Critical')
  const series = range === '24H' ? hourly : range === '30D' ? daily : (summary.hourly || []).slice(-7)
  const seriesError = range === '24H' ? panelErrors.hourly : range === '30D' ? panelErrors.daily : panelErrors.trend
  function retry() {
    setAttempt((value) => value + 1)
  }
  const leadOutage = outages[0]
  const alerts = complaints.slice(0, 4)

  const kpis = [
    { label: 'Network Health', value: healthPercent == null ? '—' : `${healthPercent}%`, delta: 'score avg' },
    { label: 'Tests Today', value: formatNumber(summary.testsToday), delta: 'today' },
    { label: 'Open Reports', value: formatNumber(summary.openComplaints), delta: 'open' },
    { label: 'Possible Outages', value: formatNumber(summary.currentOutages), delta: 'active' },
    { label: 'Avg Speed', value: formatNumber(summary.avgDownload), delta: 'Mbps' },
  ]

  return (
    <section className="min-w-0" data-testid="dashboard">
      <h2 className="text-2xl font-semibold text-white">{mode === 'it' ? 'Command Center' : 'Overview'}</h2>
      {!loading && loadError ? <RequestError message={loadError} onRetry={retry} /> : null}
      {!loading && !loadError && locations.length === 0 && summary.testsToday == null ? (
        <p className="np-empty mt-4">No dashboard data yet.</p>
      ) : null}

      {loadError ? null : <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" data-testid="summary-cards">
        {loading
          ? Array.from({ length: 5 }, (_, index) => <CardSkeleton key={index} />)
          : kpis.map((card) => (
            <article key={card.label} className="rounded-2xl border border-slate-800 bg-[#0c1829] p-4" data-testid="summary-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">{card.label}</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <p className="text-2xl font-semibold text-white">{card.value}</p>
                {card.label === 'Network Health' && healthPercent != null ? (
                  <svg viewBox="0 0 36 36" className="h-10 w-10">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(56,189,248,0.18)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#22d3ee" strokeWidth="3" strokeDasharray={`${(healthPercent / 100) * 88} 88`} transform="rotate(-90 18 18)" />
                  </svg>
                ) : null}
              </div>
              <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[#34d399]">{card.delta}</p>
            </article>
          ))}
      </div>}

      {loadError ? null : <>
      <div className="mt-6">
        <FilterBar filters={filters} locations={locations} onChange={setFilters} />
      </div>

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.7fr)]">
        <div>
          {panelErrors.map ? <RequestError message={panelErrors.map} onRetry={retry} /> : null}
          <CampusMap locations={filtered.locations} loading={loading} />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {loading ? <BlockSkeleton className="h-20" /> : null}
            {!loading && filtered.locations.length === 0 ? <p className="np-empty">No locations to show.</p> : null}
            {filtered.locations.map((location) => {
              const color = STATUS_COLOR[location.networkStatus] || '#38bdf8'
              const critical = location.networkStatus === 'Critical'
              return (
                <article key={location.id} className={`rounded-2xl border bg-[#0c1829] p-3 ${critical ? 'animate-pulse border-[#f87171]' : 'border-[rgba(56,189,248,0.18)]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm text-white">{location.name}</h3>
                    <span className="text-sm font-semibold" style={{ color }}>{location.score ?? location.networkStatus ?? '—'}</span>
                  </div>
                  <p className="mt-2 text-xs text-[#cbd5e1]">
                    {formatNumber(location.avgDownload)} Mbps · {formatNumber(location.avgPing)} ms · {formatNumber(location.avgPacketLoss)}% loss
                  </p>
                </article>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-[#f87171]/50 bg-[#3f1218] p-4" data-testid="operational-outages">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f87171]">Possible outage detected</p>
            {loading ? <BlockSkeleton className="mt-3 h-24" /> : null}
            {!loading && panelErrors.outages ? <RequestError message={panelErrors.outages} onRetry={retry} /> : null}
            {!loading && !panelErrors.outages && !leadOutage ? <p className="np-empty mt-3">No current outages.</p> : null}
            {!panelErrors.outages && leadOutage ? (
              <div className="mt-3 text-sm text-[#cbd5e1]">
                <p className="text-white">{outageLocationName(leadOutage)}</p>
                <p className="mt-2">{leadOutage.type || 'Outage'} · {leadOutage.complaintCount ?? '—'} reports</p>
                <Link to={investigatePath()} className="mt-4 inline-flex bg-sky-400 px-4 py-2 text-sm">Investigate</Link>
              </div>
            ) : null}
            {outages.length > 1 ? (
              <ul className="mt-3 space-y-2">
                {outages.slice(1).map((outage, index) => (
                  <li key={outage.id || index} className="text-sm text-[#f87171]">
                    Possible Wi-Fi outage detected in {outageLocationName(outage)}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">AI Network Intelligence</p>
            {loading ? <BlockSkeleton className="mt-3 h-20" /> : null}
            {!loading && panelErrors.ai ? <RequestError message={panelErrors.ai} onRetry={retry} /> : null}
            {!loading && !panelErrors.ai && !aiSummary ? <p className="np-empty mt-3">No summary yet.</p> : null}
            {!panelErrors.ai && aiSummary ? <p className="mt-3 text-sm text-[#cbd5e1]">{aiSummary}</p> : null}
            {!panelErrors.ai && action ? <p className="mt-3 text-sm text-white">Recommended action: {action}</p> : null}
          </section>

          <section className="rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">Recent alerts</p>
            {loading ? <BlockSkeleton className="mt-3 h-20" /> : null}
            {!loading && panelErrors.alerts ? <RequestError message={panelErrors.alerts} onRetry={retry} /> : null}
            {!loading && !panelErrors.alerts && alerts.length === 0 ? <p className="np-empty mt-3">No alerts.</p> : null}
            {!panelErrors.alerts ? (
              <ul className="mt-3 space-y-2">
                {alerts.map((alert) => (
                  <li key={alert.id} className="text-sm text-[#cbd5e1]">{alert.type} · {alert.locationName || 'Campus'}</li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] p-4">
          <h3 className="text-sm text-white">Health</h3>
          {loading ? <BlockSkeleton className="mt-3 h-40" /> : null}
          {!loading && donut.length === 0 ? <p className="np-empty mt-3">No status mix yet.</p> : null}
          {!loading && donut.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} stroke="none">
                    {donut.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] p-4 xl:col-span-2" data-testid="chart-hourly">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm text-white">Performance</h3>
            <div className="flex gap-2">
              {RANGES.map((item) => (
                <button key={item} type="button" className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-wide ${range === item ? 'bg-[#22d3ee] text-[#041018]' : 'text-[#94a3b8]'}`} onClick={() => setRange(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          {loading ? <BlockSkeleton className="mt-3 h-48" /> : null}
          {!loading && seriesError ? <RequestError message={seriesError} onRetry={retry} /> : null}
          {!loading && !seriesError && series.length === 0 ? <p className="np-empty mt-3">No performance data.</p> : null}
          {!loading && !seriesError && series.length > 0 ? (
            <div className="mt-3 h-52 bg-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#0c1829', border: '1px solid rgba(56,189,248,0.18)', color: '#cbd5e1' }} />
                  <Line type="monotone" dataKey="download" name="Download" stroke="#22d3ee" dot={false} />
                  <Line type="monotone" dataKey="upload" name="Upload" stroke="#38bdf8" dot={false} />
                  <Line type="monotone" dataKey="ping" name="Latency" stroke="#fbbf24" dot={false} />
                  <Line type="monotone" dataKey="packetLoss" name="Packet loss" stroke="#f87171" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </section>
      </div>

      <section className="mt-6 overflow-x-auto rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829]">
        <h3 className="px-4 pt-4 text-sm text-white">Locations requiring attention</h3>
        {loading ? <BlockSkeleton className="m-4 h-24" /> : null}
        {!loading && attention.length === 0 ? <p className="np-empty m-4">No locations need attention.</p> : null}
        {!loading && attention.length > 0 ? (
          <table className="mt-2 min-w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Download</th>
                <th className="px-4 py-3">Ping</th>
                <th className="px-4 py-3">Loss</th>
              </tr>
            </thead>
            <tbody>
              {attention.map((location) => (
                <tr key={location.id} className="border-t border-[rgba(56,189,248,0.18)]">
                  <td className="px-4 py-3 text-white">{location.name}</td>
                  <td className="px-4 py-3" style={{ color: STATUS_COLOR[location.networkStatus] }}>{location.networkStatus}</td>
                  <td className="px-4 py-3">{formatNumber(location.avgDownload)}</td>
                  <td className="px-4 py-3">{formatNumber(location.avgPing)}</td>
                  <td className="px-4 py-3">{formatNumber(location.avgPacketLoss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <div className="mt-6">
        {loading ? <BlockSkeleton className="h-64" /> : <DashboardCharts locations={filtered.locations} hourly={filtered.hourly} showHourly={false} />}
      </div>
      </>}
    </section>
  )
}
