import { useHealth } from '../hooks/useHealth.js'

const labels = {
  checking: 'Checking API…',
  ok: 'API OK',
  down: 'API down',
}

export default function HealthStatus() {
  const status = useHealth()
  const tone =
    status === 'ok'
      ? 'bg-emerald-400/10 text-emerald-300'
      : status === 'down'
        ? 'bg-rose-400/10 text-rose-300'
        : 'bg-slate-800 text-slate-300'

  return (
    <p className={`rounded-full px-3 py-1 text-sm font-medium ${tone}`} role="status">
      {labels[status] ?? 'API down'}
    </p>
  )
}
