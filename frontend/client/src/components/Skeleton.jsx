export function CardSkeleton() {
  return <div className="h-24 animate-pulse rounded-2xl bg-slate-800/80" />
}

export function BlockSkeleton({ className = 'h-40' }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-800/80 ${className}`} />
}
