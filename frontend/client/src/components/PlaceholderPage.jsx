import { useEffect } from 'react'

export default function PlaceholderPage({ title }) {
  useEffect(() => {
    document.title = `CampusNet · ${title}`
  }, [title])

  return (
    <section>
      <h2 className="text-2xl font-semibold" data-testid="page-title">
        {title}
      </h2>
      <p className="mt-2 max-w-xl text-slate-400">This section is not available yet.</p>
    </section>
  )
}
