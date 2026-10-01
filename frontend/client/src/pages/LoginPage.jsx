import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthScreen from '../components/AuthScreen.jsx'
import TextField from '../components/TextField.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getApiErrorMessage } from '../api/errors.js'
import { canOpenPath, homeForRole } from '../navigation.js'

const DEMO_ACCOUNTS = [
  { role: 'student', label: 'Student', email: 'student@campus.test' },
  { role: 'it', label: 'IT', email: 'it@campus.test' },
  { role: 'manager', label: 'Manager', email: 'manager@campus.test' },
  { role: 'admin', label: 'Admin', email: 'admin@campus.test' },
]

const DEMO_PASSWORD = 'password123'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function signIn(nextEmail, nextPassword) {
    setError('')
    setPending(true)
    try {
      const user = await login(nextEmail.trim(), nextPassword)
      const from = location.state?.from
      const destination = canOpenPath(user.role, from) ? from : homeForRole(user.role)
      navigate(destination, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Sign in failed.'))
    } finally {
      setPending(false)
    }
  }

  function onSubmit(event) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    signIn(email, password)
  }

  function useDemo(account) {
    setEmail(account.email)
    setPassword(DEMO_PASSWORD)
    signIn(account.email, DEMO_PASSWORD)
  }

  return (
    <AuthScreen title="Sign in">
      <h2 className="text-2xl font-semibold">Sign in</h2>
      <p className="mt-2 text-sm text-slate-400">Use your campus account to open CampusNet.</p>
      {location.state?.registered ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200" role="status">
          Account created. Sign in with your email.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? (
          <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert" data-testid="api-error">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-sky-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-400">
        New student?{' '}
        <Link to="/register" className="text-sky-300 hover:text-sky-200">
          Create an account
        </Link>
      </p>
      <div className="mt-8">
        <p className="text-sm font-medium text-slate-200">Demo accounts</p>
        <p className="mt-1 text-xs text-slate-400">Password for every demo account: {DEMO_PASSWORD}</p>
        <div className="mt-3 grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.role}
              type="button"
              disabled={pending}
              data-testid={`demo-${account.role}`}
              onClick={() => useDemo(account)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-left text-sm hover:bg-slate-900 disabled:opacity-60"
            >
              <span className="font-medium text-slate-100">{account.label}</span>
              <span className="mt-0.5 block text-slate-400">{account.email}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthScreen>
  )
}
