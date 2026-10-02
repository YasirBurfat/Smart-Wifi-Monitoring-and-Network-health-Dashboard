import { useEffect } from 'react'
import HealthStatus from './HealthStatus.jsx'
import Wordmark from './Wordmark.jsx'

export default function AuthScreen({ title, children }) {
  useEffect(() => {
    document.title = `NetPulse Campus · ${title}`
  }, [title])

  return (
    <div className="flex min-h-screen flex-col text-[#cbd5e1]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[rgba(56,189,248,0.18)] px-4 py-4 sm:px-6">
        <Wordmark />
        <div className="ml-auto">
          <HealthStatus />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8">
        <p className="mb-6 text-[11px] uppercase tracking-[0.16em] text-[#94a3b8]">
          SEE THE SIGNAL. FIND THE PROBLEM. FIX THE NETWORK.
        </p>
        {children}
      </main>
      <footer className="px-4 py-4 text-center text-[11px] uppercase tracking-[0.18em] text-[#94a3b8]">
        SMART CONNECTIVITY, BETTER CAMPUS.
      </footer>
    </div>
  )
}
