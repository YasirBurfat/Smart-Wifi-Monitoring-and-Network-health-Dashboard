import { useEffect } from 'react'
import { Wifi } from 'lucide-react'
import HealthStatus from './HealthStatus.jsx'

export default function AuthScreen({ title, children }) {
  useEffect(() => {
    document.title = `CampusNet · ${title}`
  }, [title])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center gap-3 px-4 py-4 sm:px-6">
        <Wifi aria-hidden="true" className="text-sky-400" size={22} />
        <h1 className="text-lg font-semibold tracking-tight">CampusNet</h1>
        <div className="ml-auto">
          <HealthStatus />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col px-4 pb-12">{children}</main>
    </div>
  )
}
