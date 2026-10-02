import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const tooltipStyle = {
  background: '#0c1829',
  border: '1px solid rgba(56,189,248,0.18)',
  borderRadius: 16,
  color: '#cbd5e1',
}

const axisTick = { fill: '#94a3b8', fontSize: 11 }
const grid = 'rgba(56,189,248,0.12)'

function ChartFrame({ title, testId, children, empty }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-[#0c1829]/80 p-4" data-testid={testId}>
      <h3 className="text-sm font-medium text-white">{title}</h3>
      {empty ? <p className="np-empty mt-4">No data for this chart.</p> : <div className="mt-4 h-64 w-full min-w-0 bg-transparent">{children}</div>}
    </section>
  )
}

function present(rows, key) {
  return rows.some((row) => row[key] != null && Number.isFinite(Number(row[key])))
}

export default function DashboardCharts({ locations, hourly, hourlyTitle = 'Hourly trend', showHourly = true }) {
  const speedData = (locations || [])
    .filter((location) => location.avgDownload != null || location.latestDownload != null || location.avgUpload != null)
    .map((location) => ({
      name: location.name,
      download: location.avgDownload ?? location.latestDownload,
      upload: location.avgUpload,
    }))
  const signalData = (locations || [])
    .filter((location) => location.avgPing != null || location.avgPacketLoss != null)
    .map((location) => ({
      name: location.name,
      ping: location.avgPing,
      loss: location.avgPacketLoss,
    }))
  const hourlyData = Array.isArray(hourly) ? hourly : []
  const showUpload = present(speedData, 'upload')
  const showPing = signalData.some((row) => Number(row.ping) > 0 || row.ping != null)
  const showLoss = present(signalData, 'loss')
  const showHourlyPing = hourlyData.some((point) => Number(point.ping) > 0)
  const showHourlyUpload = present(hourlyData, 'upload')
  const showHourlyLoss = present(hourlyData, 'packetLoss')

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartFrame title="Speed by location" testId="chart-speed" empty={speedData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={speedData}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ color: '#cbd5e1' }} />
            <Bar dataKey="download" name="Download" fill="#22d3ee" radius={[6, 6, 0, 0]} />
            {showUpload ? <Bar dataKey="upload" name="Upload" fill="#38bdf8" radius={[6, 6, 0, 0]} /> : null}
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartFrame title="Latency and packet loss" testId="chart-ping" empty={signalData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={signalData}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis yAxisId="ping" tick={axisTick} axisLine={false} tickLine={false} />
            {showLoss ? <YAxis yAxisId="loss" orientation="right" tick={axisTick} axisLine={false} tickLine={false} /> : null}
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ color: '#cbd5e1' }} />
            {showPing ? <Bar yAxisId="ping" dataKey="ping" name="Latency" fill="#fbbf24" radius={[6, 6, 0, 0]} /> : null}
            {showLoss ? <Bar yAxisId="loss" dataKey="loss" name="Packet loss" fill="#f87171" radius={[6, 6, 0, 0]} /> : null}
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      {showHourly && hourlyData.length > 0 ? (
        <ChartFrame title={hourlyTitle} testId="chart-hourly" empty={false}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: '#cbd5e1' }} />
              <Area type="monotone" dataKey="download" name="Download" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.16} />
              {showHourlyUpload ? <Area type="monotone" dataKey="upload" name="Upload" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.12} /> : null}
              {showHourlyPing ? <Area type="monotone" dataKey="ping" name="Latency" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.1} /> : null}
              {showHourlyLoss ? <Area type="monotone" dataKey="packetLoss" name="Packet loss" stroke="#f87171" fill="#f87171" fillOpacity={0.1} /> : null}
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      ) : null}
      {showHourly && hourlyData.length === 0 ? (
        <section className="rounded-2xl border border-slate-800 bg-[#0c1829]/80 p-4" data-testid="chart-hourly">
          <h3 className="text-sm font-medium text-white">{hourlyTitle}</h3>
          <p className="np-empty mt-4">No hourly data.</p>
        </section>
      ) : null}
    </div>
  )
}
