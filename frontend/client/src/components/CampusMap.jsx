import { STATUS_COLOR } from '../status.js'

function coords(location, index) {
  const raw = location?.mapPosition
  if (raw && typeof raw === 'object') {
    const x = Number(raw.x ?? raw.col ?? 0)
    const y = Number(raw.y ?? raw.row ?? 0)
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  }
  if (typeof raw === 'string' && raw.includes(',')) {
    const [x, y] = raw.split(',').map((part) => Number(part.trim()))
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  }
  return { x: (index % 3) * 30 + 10, y: Math.floor(index / 3) * 28 + 12 }
}

function pinColor(status) {
  return STATUS_COLOR[status] || '#38bdf8'
}

export default function CampusMap({ locations, loading }) {
  if (loading) {
    return <div className="h-80 animate-pulse rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829]" />
  }

  const spots = (locations || []).map((location, index) => ({ location, ...coords(location, index) }))
  if (spots.length === 0) {
    return (
      <div className="np-empty h-80" data-testid="heatmap">
        No campus locations to map.
      </div>
    )
  }

  const maxX = Math.max(...spots.map((spot) => spot.x), 1)
  const maxY = Math.max(...spots.map((spot) => spot.y), 1)
  const placed = spots.map((spot) => ({
    ...spot,
    left: 10 + (spot.x / maxX) * 72,
    top: 14 + (spot.y / maxY) * 64,
  }))

  return (
    <div className="relative min-h-80 overflow-hidden rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#07111f]" data-testid="heatmap">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 640 420" role="img" aria-label="Campus map">
        <rect width="640" height="420" fill="#07111f" />
        <path d="M40 80 H240 V180 H80 Z" fill="none" stroke="rgba(56,189,248,0.28)" strokeWidth="2" />
        <path d="M280 60 H460 V200 H300 Z" fill="none" stroke="rgba(56,189,248,0.22)" strokeWidth="2" />
        <path d="M80 240 H220 V360 H100 Z" fill="none" stroke="rgba(56,189,248,0.22)" strokeWidth="2" />
        <path d="M360 250 H560 V370 H390 Z" fill="none" stroke="rgba(56,189,248,0.28)" strokeWidth="2" />
        <path d="M160 180 C220 210 250 230 300 200" fill="none" stroke="rgba(34,211,238,0.45)" strokeWidth="3" />
        <path d="M300 200 C360 240 400 250 460 260" fill="none" stroke="rgba(34,211,238,0.35)" strokeWidth="3" />
        <path d="M180 240 V180" stroke="rgba(56,189,248,0.35)" strokeWidth="2" />
        {placed.map((spot) => {
          const color = pinColor(spot.location.networkStatus)
          const cx = 40 + (spot.left / 100) * 560
          const cy = 36 + (spot.top / 100) * 340
          const critical = spot.location.networkStatus === 'Critical'
          return (
            <g key={spot.location.id}>
              {critical ? <circle cx={cx} cy={cy} r="16" fill="none" stroke="#f87171" strokeWidth="2">
                <animate attributeName="r" values="12;20;12" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.8s" repeatCount="indefinite" />
              </circle> : null}
              <circle cx={cx} cy={cy} r="6" fill={color} />
            </g>
          )
        })}
      </svg>
      {placed.map((spot) => {
        const color = pinColor(spot.location.networkStatus)
        const score = spot.location.score
        return (
          <div
            key={spot.location.id}
            className="absolute max-w-[9.5rem] rounded-xl border bg-[#0c1829]/95 px-2.5 py-2 shadow-[0_0_16px_rgba(34,211,238,0.12)]"
            style={{ left: `${spot.left}%`, top: `${spot.top}%`, borderColor: color }}
          >
            <p className="truncate text-xs font-medium text-white">{spot.location.name}</p>
            <p className="text-[11px] uppercase tracking-wide" style={{ color }}>
              {score == null ? spot.location.networkStatus || 'No score' : score}
            </p>
          </div>
        )
      })}
    </div>
  )
}
