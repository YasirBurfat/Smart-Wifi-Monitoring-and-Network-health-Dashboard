function formatMetric(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const number = Number(value)
  const text = Number.isInteger(number) ? String(number) : number.toFixed(1)
  return unit ? `${text} ${unit}` : text
}

export default function LocationGrid({ locations }) {
  if (!locations?.length) {
    return <p className="np-empty">No locations to show.</p>
  }

  return (
    <div className="grid gap-3 md:grid-cols-2" data-testid="location-grid">
      {locations.map((location) => (
        <article key={location.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">{location.name}</h3>
              <p className="text-xs text-slate-500">{location.building || 'No building'}</p>
            </div>
            <p className="text-xs text-slate-300">{location.networkStatus || '—'}</p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Latest speed</dt>
              <dd>{formatMetric(location.latestDownload, 'Mbps')}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Avg download</dt>
              <dd>{formatMetric(location.avgDownload, 'Mbps')}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Avg upload</dt>
              <dd>{formatMetric(location.avgUpload, 'Mbps')}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Avg ping</dt>
              <dd>{formatMetric(location.avgPing, 'ms')}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Tests</dt>
              <dd>{formatMetric(location.tests)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Complaints</dt>
              <dd>{formatMetric(location.complaints)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  )
}
