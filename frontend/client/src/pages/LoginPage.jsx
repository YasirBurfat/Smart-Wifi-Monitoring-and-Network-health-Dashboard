import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthScreen from '../components/AuthScreen.jsx'
import TextField from '../components/TextField.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getApiErrorMessage } from '../api/errors.js'
import { canOpenPath, homeForRole } from '../navigation.js'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
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
    const next = {}
    if (!email.trim()) next.email = 'Enter your email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email.'
    if (!password) next.password = 'Enter your password.'
    setFieldErrors(next)
    if (Object.keys(next).length) {
      setError('')
      return
    }
    signIn(email, password)
  }

  return (
    <AuthScreen title="Sign in">
      <h2 className="text-2xl font-semibold">Sign in</h2>
      <p className="mt-2 text-sm text-[#cbd5e1]">Use your campus account to open NetPulse Campus.</p>
      {location.state?.registered ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200" role="status">
          Account created. Sign in with your email.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-4" autoComplete="off">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          required
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
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
    </AuthScreen>
  )
}
