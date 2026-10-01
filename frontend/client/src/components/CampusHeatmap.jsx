const TILE = {
  Green: '#22c55e',
  Yellow: '#eab308',
  Red: '#ef4444',
}

export function heatmapColor(location) {
  const raw = String(location?.networkStatus || '')
  if (TILE[raw]) return TILE[raw]
  const value = raw.toLowerCase()
  if (value === 'excellent' || value === 'good' || value === 'green') return TILE.Green
  if (value === 'fair' || value === 'yellow') return TILE.Yellow
  if (value === 'poor' || value === 'critical' || value === 'red') return TILE.Red
  return '#334155'
}

function positionOf(mapPosition, index) {
  if (!mapPosition) return { x: index % 4, y: Math.floor(index / 4) }
  if (typeof mapPosition === 'string') {
    const [x, y] = mapPosition.split(',').map((part) => Number(part.trim()))
    return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 }
  }
  const x = Number(mapPosition.x ?? mapPosition.col ?? mapPosition.column ?? 0)
  const y = Number(mapPosition.y ?? mapPosition.row ?? 0)
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  }
}

export default function CampusHeatmap({ locations }) {
  const placed = (locations || []).filter((location) => location.mapPosition != null)
  if (placed.length === 0) {
    return <p className="text-sm text-slate-400">No map data.</p>
  }

  const cells = placed.map((location, index) => ({ location, ...positionOf(location.mapPosition, index) }))
  const maxX = Math.max(...cells.map((cell) => cell.x), 0)
  const maxY = Math.max(...cells.map((cell) => cell.y), 0)
  const size = 56
  const width = (maxX + 1) * size
  const height = (maxY + 1) * size

  return (
    <div className="overflow-x-auto" data-testid="heatmap">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Campus heatmap">
        {cells.map((cell) => (
          <g key={cell.location.id} transform={`translate(${cell.x * size + 4} ${cell.y * size + 4})`}>
            <rect width="48" height="48" rx="8" fill={heatmapColor(cell.location)} />
            <text x="24" y="28" textAnchor="middle" fontSize="9" fill="#0f172a">
              {cell.location.name.slice(0, 10)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
