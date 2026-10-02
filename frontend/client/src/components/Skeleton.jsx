export function CardSkeleton() {
  return <div className="h-24 animate-pulse rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829]" />
}

export function BlockSkeleton({ className = 'h-40' }) {
  return <div className={`animate-pulse rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0c1829] ${className}`} />
}

export function WidgetSkeleton({ label = 'Loading…', className = 'mt-6 h-24' }) {
  return (
    <div className={className} role="status">
      <span className="sr-only">{label}</span>
      <BlockSkeleton className="h-full" />
    </div>
  )
}
