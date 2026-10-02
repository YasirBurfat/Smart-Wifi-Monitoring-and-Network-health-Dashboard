import { Activity } from 'lucide-react'

export default function Wordmark({ compact = false }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Activity aria-hidden="true" className="shrink-0 text-[#22d3ee]" size={compact ? 18 : 22} />
      <span className={`truncate font-semibold tracking-[0.14em] text-white ${compact ? 'text-xs' : 'text-sm'}`}>
        NETPULSE CAMPUS
      </span>
    </div>
  )
}
