import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const tooltipStyle = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#e2e8f0',
}

function ChartFrame({ title, testId, children, empty }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4" data-testid={testId}>
      <h3 className="text-sm font-medium text-slate-300">{title}</h3>
      {empty ? <p className="mt-6 text-sm text-slate-400">No data for this chart.</p> : <div className="mt-4 h-64 w-full min-w-0">{children}</div>}
    </section>
  )
}

export default function DashboardCharts({ locations, hourly }) {
  const speedData = (locations || [])
    .filter((location) => location.avgDownload != null || location.latestDownload != null)
    .map((location) => ({
      name: location.name,
      speed: location.avgDownload ?? location.latestDownload,
    }))
  const pingData = (locations || [])
    .filter((location) => location.avgPing != null)
    .map((location) => ({ name: location.name, ping: location.avgPing }))
  const hourlyData = Array.isArray(hourly) ? hourly : []

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartFrame title="Speed by location" testId="chart-speed" empty={speedData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={speedData}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="speed" fill="#38bdf8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartFrame title="Ping by location" testId="chart-ping" empty={pingData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pingData}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="ping" fill="#fbbf24" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      {hourlyData.length > 0 ? (
        <ChartFrame title="Hourly trend" testId="chart-hourly" empty={false}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="download" stroke="#38bdf8" fill="#0ea5e9" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      ) : (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4" data-testid="chart-hourly">
          <h3 className="text-sm font-medium text-slate-300">Hourly trend</h3>
          <p className="mt-6 text-sm text-slate-400">No hourly data.</p>
        </section>
      )}
    </div>
  )
}
