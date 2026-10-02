import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { homeForRole } from '../navigation.js'

export default function UnauthorizedPage() {
  const { user } = useAuth()

  useEffect(() => {
    document.title = 'NetPulse Campus · 403'
  }, [])

  const destination = user ? homeForRole(user.role) : '/login'

  return (
    <main className="flex min-h-screen flex-col px-4 text-[#cbd5e1]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <h1 className="text-2xl font-semibold" data-testid="unauthorized">
          403
        </h1>
        <p className="mt-2 text-[#cbd5e1]">Your account cannot open that page.</p>
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
