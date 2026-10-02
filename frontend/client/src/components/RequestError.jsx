export default function RequestError({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="mt-4" role="alert">
      <p className="text-sm text-rose-200">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-slate-700 px-3 py-1.5 text-sm"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}
