import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { homeForRole } from '../navigation.js'

export default function NotFoundPage() {
  const { user } = useAuth()

  useEffect(() => {
    document.title = 'NetPulse Campus · Not found'
  }, [])

  const destination = user ? homeForRole(user.role) : '/login'

  return (
    <main className="flex min-h-screen flex-col px-4 text-[#cbd5e1]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <h1 className="text-2xl font-semibold" data-testid="not-found">
          Page not found
        </h1>
        <p className="mt-2 text-[#cbd5e1]">That address does not match a page in NetPulse Campus.</p>
        <Link
          to={destination}
          className="mt-6 inline-flex w-fit rounded-lg bg-sky-400 px-3 py-2 text-sm font-semibold text-slate-950"
        >
          {user ? 'Back to your pages' : 'Sign in'}
        </Link>
      </div>
      <footer className="py-4 text-center text-[11px] uppercase tracking-[0.18em] text-[#94a3b8]">
        SMART CONNECTIVITY, BETTER CAMPUS.
      </footer>
    </main>
  )
}
