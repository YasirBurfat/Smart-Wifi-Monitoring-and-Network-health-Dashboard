import { STATUS_STYLES } from '../status.js'

export default function StatusBadge({ status }) {
  const tone = STATUS_STYLES[status] || 'bg-slate-800 text-slate-300 ring-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}>
      {status}
    </span>
  )
}
