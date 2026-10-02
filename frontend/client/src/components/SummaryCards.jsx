const CARDS = [
  { key: 'testsToday', label: 'Tests Today' },
  { key: 'avgDownload', label: 'Avg Download', unit: 'Mbps' },
  { key: 'avgUpload', label: 'Avg Upload', unit: 'Mbps' },
  { key: 'avgPing', label: 'Avg Ping', unit: 'ms' },
  { key: 'poorLocations', label: 'Poor Locations' },
  { key: 'openComplaints', label: 'Open Complaints' },
  { key: 'resolvedComplaints', label: 'Resolved Complaints' },
  { key: 'currentOutages', label: 'Current Outages' },
]

function formatValue(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const number = Number(value)
  const text = Number.isInteger(number) ? String(number) : number.toFixed(1)
  return unit ? `${text} ${unit}` : text
}

export default function SummaryCards({ summary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="summary-cards">
      {CARDS.map((card) => (
        <article key={card.key} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4" data-testid="summary-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatValue(summary?.[card.key], card.unit)}</p>
        </article>
      ))}
    </div>
  )
}
