import { useEffect, useState } from 'react'
import { fetchUsers, updateUser } from '../../api/users.js'
import { getApiErrorMessage } from '../../api/errors.js'
import { fieldClass } from '../../components/formStyles.js'
import RequestError from '../../components/RequestError.jsx'
import { ROLE_LABELS } from '../../navigation.js'
import { WidgetSkeleton } from '../../components/Skeleton.jsx'

const ROLES = ['student', 'it', 'manager', 'admin']
const STATUSES = ['active', 'inactive']

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [drafts, setDrafts] = useState({})
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [rowErrors, setRowErrors] = useState({})
  const [pendingId, setPendingId] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    document.title = 'CampusNet · Users'
  }, [])

  useEffect(() => {
    let active = true
    fetchUsers()
      .then((list) => {
        if (!active) return
        setUsers(list)
        setState('ready')
      })
      .catch((err) => {
        if (!active) return
        setError(getApiErrorMessage(err, 'Could not load users.'))
        setState('error')
      })
    return () => {
      active = false
    }
  }, [attempt])

  function draftFor(user) {
    return drafts[user.id] || {
      role: user.role,
      accountStatus: user.accountStatus === 'disabled' ? 'inactive' : user.accountStatus || 'active',
    }
  }

  function setDraft(id, patch) {
    setDrafts((current) => {
      const user = users.find((item) => item.id === id)
      return {
        ...current,
        [id]: { ...draftFor(user), ...current[id], ...patch },
      }
    })
  }

  async function onSave(user) {
    const draft = draftFor(user)
    const nextRowError = {}
    if (!ROLES.includes(draft.role)) nextRowError.role = 'Choose a role.'
    if (!STATUSES.includes(draft.accountStatus)) nextRowError.accountStatus = 'Choose active or inactive.'
    if (Object.keys(nextRowError).length) {
      setRowErrors((current) => ({ ...current, [user.id]: nextRowError }))
      setError('')
      return
    }
    setRowErrors((current) => ({ ...current, [user.id]: {} }))
    setPendingId(user.id)
    setError('')
    try {
      const saved = await updateUser(user.id, {
        role: draft.role,
        accountStatus: draft.accountStatus,
      })
      setUsers((current) => current.map((item) => (item.id === saved.id ? saved : item)))
      setDrafts((current) => {
        const next = { ...current }
        delete next[user.id]
        return next
      })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update the user.'))
    } finally {
      setPendingId('')
    }
  }

  return (
    <section className="max-w-5xl">
      <h2 className="text-2xl font-semibold">Users</h2>
      <p className="mt-2 text-slate-400">Change a role or set an account active or inactive.</p>
      {state === 'loading' ? <WidgetSkeleton label="Loading users…" className="mt-6 h-48" /> : null}
      {state === 'error' ? <RequestError message={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {error && state === 'ready' ? <p className="mt-4 text-sm text-rose-200" role="alert">{error}</p> : null}
      {state === 'ready' && users.length === 0 ? <p className="np-empty mt-6">No users yet.</p> : null}
      {state === 'ready' && users.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-left text-sm" data-testid="users-table">
            <thead className="bg-slate-900/80 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Save</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const draft = draftFor(user)
                const rowError = rowErrors[user.id] || {}
                return (
                  <tr key={user.id} className="border-t border-slate-800" data-testid="user-row">
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3 text-slate-300">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        className={fieldClass}
                        data-testid="user-role"
                        value={draft.role}
                        onChange={(event) => setDraft(user.id, { role: event.target.value })}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                        ))}
                      </select>
                      {rowError.role ? <p className="mt-1 text-sm text-rose-200" role="alert">{rowError.role}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={fieldClass}
                        data-testid="user-status"
                        value={draft.accountStatus}
                        onChange={(event) => setDraft(user.id, { accountStatus: event.target.value })}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      {rowError.accountStatus ? <p className="mt-1 text-sm text-rose-200" role="alert">{rowError.accountStatus}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        data-testid="save-user"
                        disabled={pendingId === user.id}
                        onClick={() => onSave(user)}
                        className="rounded-lg bg-sky-400 px-3 py-1.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
                      >
                        {pendingId === user.id ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
