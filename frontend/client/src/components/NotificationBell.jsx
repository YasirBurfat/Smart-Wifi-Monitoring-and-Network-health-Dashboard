import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { getApiErrorMessage } from '../api/errors.js'
import { fetchNotifications, markAllNotificationsRead } from '../api/notifications.js'
import RequestError from './RequestError.jsx'
import { BlockSkeleton } from './Skeleton.jsx'

function formatWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  function load() {
    setState('loading')
    setError('')
    return fetchNotifications()
      .then((result) => {
        setItems(result.notifications)
        setUnread(result.unread)
        setState('ready')
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'Could not load notifications.'))
        setState('error')
      })
  }

  useEffect(() => {
    let active = true
    fetchNotifications()
      .then((result) => {
        if (!active) return
        setItems(result.notifications)
        setUnread(result.unread)
        setState('ready')
      })
      .catch((err) => {
        if (!active) return
        setError(getApiErrorMessage(err, 'Could not load notifications.'))
        setState('error')
      })
    return () => {
      active = false
    }
  }, [])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      await load()
      if (unread > 0) {
        try {
          await markAllNotificationsRead()
          setUnread(0)
          setItems((current) => current.map((item) => ({ ...item, read: true })))
        } catch {
          // The list still shows the documents if marking them read fails.
        }
      }
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative rounded-lg p-2 text-slate-200 hover:bg-slate-800"
        aria-label="Notifications"
        data-testid="notification-bell"
        onClick={toggle}
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 rounded-full bg-sky-400 px-1 text-[10px] font-semibold text-slate-950">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-xl" data-testid="notification-panel">
          <p className="text-sm font-medium">Notifications</p>
          {state === 'loading' ? <BlockSkeleton className="mt-3 h-16" /> : null}
          {state === 'error' ? <RequestError message={error} onRetry={load} /> : null}
          {state === 'ready' && items.length === 0 ? <p className="np-empty mt-3">No notifications.</p> : null}
          {state === 'ready' && items.length > 0 ? (
            <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="rounded-xl border border-slate-800 px-3 py-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.body}</p>
                  {formatWhen(item.createdAt) ? <p className="mt-1 text-[11px] text-slate-500">{formatWhen(item.createdAt)}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
