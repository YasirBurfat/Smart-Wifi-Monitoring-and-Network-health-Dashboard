export default function TextField({ label, error, ...props }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block">{label}</span>
      <input
        className="w-full rounded-xl border border-[rgba(56,189,248,0.18)] bg-[#07111f] px-3 py-2 text-[#cbd5e1] outline-none placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#22d3ee]"
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-sm text-rose-200" role="alert">
          {error}
        </p>
      ) : null}
    </label>
  )
}
