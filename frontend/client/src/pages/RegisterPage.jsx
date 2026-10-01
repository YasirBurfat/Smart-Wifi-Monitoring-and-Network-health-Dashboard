import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthScreen from '../components/AuthScreen.jsx'
import TextField from '../components/TextField.jsx'
import { registerRequest } from '../api/auth.js'
import { getApiErrorMessage } from '../api/errors.js'
import { useAuth } from '../context/AuthContext.jsx'
import { homeForRole } from '../navigation.js'
import { isValidUser } from '../api/storage.js'

export default function RegisterPage() {
  const { establishSession } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    if (!name.trim() || !email.trim() || !password) {
      setError('Enter your name, email, and password.')
      return
    }

    setError('')
    setPending(true)
    try {
      const data = await registerRequest({
        name: name.trim(),
        email: email.trim(),
        password,
      })
      if (data?.token && isValidUser(data.user)) {
        const user = establishSession(data.token, data.user)
        navigate(homeForRole(user.role), { replace: true })
        return
      }
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not create the account.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthScreen title="Create account">
      <h2 className="text-2xl font-semibold">Create account</h2>
      <p className="mt-2 text-sm text-slate-400">New accounts are students.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <p className="text-sm text-slate-400">Role: Student</p>
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
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-sky-300 hover:text-sky-200">
          Sign in
        </Link>
      </p>
    </AuthScreen>
  )
}
