export default function TextField({ label, ...props }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-slate-300">{label}</span>
      <input
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-sky-400 placeholder:text-slate-500 focus:ring-2"
        {...props}
      />
    </label>
  )
}
