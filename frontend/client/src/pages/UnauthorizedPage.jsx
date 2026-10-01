import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { homeForRole } from '../navigation.js'

export default function UnauthorizedPage() {
  const { user } = useAuth()

  useEffect(() => {
    document.title = 'CampusNet · Unauthorized'
  }, [])

  const destination = user ? homeForRole(user.role) : '/login'

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold" data-testid="unauthorized">
          Unauthorized
        </h1>
        <p className="mt-2 text-slate-400">Your account cannot open that page.</p>
        <Link
          to={destination}
          className="mt-6 inline-flex rounded-lg bg-sky-400 px-3 py-2 text-sm font-semibold text-slate-950"
        >
          {user ? 'Back to your pages' : 'Sign in'}
        </Link>
      </div>
    </main>
  )
}
