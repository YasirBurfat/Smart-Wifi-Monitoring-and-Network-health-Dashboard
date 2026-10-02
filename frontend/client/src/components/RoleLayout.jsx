import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { getApiErrorMessage } from '../api/errors.js'
import { fetchLocations } from '../api/locations.js'
import { MENUS, ROLE_LABELS } from '../navigation.js'
import { useAuth } from '../context/AuthContext.jsx'
import NotificationBell from './NotificationBell.jsx'
import OutageBanner from './OutageBanner.jsx'
import { BlockSkeleton } from './Skeleton.jsx'
import Wordmark from './Wordmark.jsx'

const LOCATION_KEY = 'campusnet.selectedLocation'

function Sidebar({ role, onNavigate, showClose, onClose }) {
  const menu = MENUS[role] || []

  return (
    <div className="flex h-full w-72 flex-col border-r border-[rgba(56,189,248,0.18)] bg-[#02060d] lg:w-64">
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="min-w-0 flex-1">
          <Wordmark />
          <p className="mt-2 text-[10px] uppercase leading-relaxed tracking-[0.12em] text-[#94a3b8]">
            SEE THE SIGNAL. FIND THE PROBLEM. FIX THE NETWORK.
          </p>
        </div>
        {showClose ? (
          <button
            type="button"
            className="ml-auto rounded-lg p-2 text-[#cbd5e1] hover:bg-white/5"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3" data-testid="sidebar">
        {menu.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? 'border-[#22d3ee] bg-[#22d3ee]/10 text-[#a5f3fc]'
                    : 'border-transparent text-[#cbd5e1] hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon aria-hidden="true" size={18} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-[rgba(56,189,248,0.18)] px-4 py-4">
        <p className="text-sm text-white">Mehran University, Jamshoro</p>
        <p className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[#94a3b8]">
          <span className="h-2 w-2 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399]" aria-hidden="true" />
          System Online
        </p>
      </div>
    </div>
  )
}

function LocationSwitcher() {
  const [locations, setLocations] = useState([])
  const [locationId, setLocationId] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setStatus('loading')
    fetchLocations()
      .then((list) => {
        if (!active) return
        setLocations(list)
        setLocationId((current) => {
          if (current && list.some((location) => location.id === current)) return current
          const stored = window.localStorage.getItem(LOCATION_KEY) || ''
          const match = list.find((location) => location.id === stored)
          return match?.id || list[0]?.id || ''
        })
        setError('')
        setStatus(list.length ? 'ready' : 'empty')
      })
      .catch((err) => {
        if (!active) return
        setError(getApiErrorMessage(err, 'Could not load locations.'))
        setStatus('error')
      })

    function onSync() {
      const stored = window.localStorage.getItem(LOCATION_KEY) || ''
      if (!stored) return
      setLocationId((current) => (current === stored ? current : stored))
    }

    window.addEventListener('campus-location', onSync)
    return () => {
      active = false
      window.removeEventListener('campus-location', onSync)
    }
  }, [attempt])

  function choose(id) {
    setLocationId(id)
    window.localStorage.setItem(LOCATION_KEY, id)
    window.dispatchEvent(new Event('campus-location'))
  }

  return (
    <label className="np-location flex min-w-0 items-center gap-2">
      <span className="sr-only">Location</span>
      {status === 'loading' ? <BlockSkeleton className="h-9 w-40" /> : null}
      {status === 'empty' ? <span className="np-empty px-3 py-1.5">No locations</span> : null}
      {status === 'error' ? (
        <button
          type="button"
          className="rounded-full border border-rose-500/40 px-3 py-1.5 text-left text-sm text-rose-200"
          onClick={() => setAttempt((value) => value + 1)}
        >
          {error} Retry
        </button>
      ) : null}
      {status === 'ready' ? (
        <select
          aria-label="Location"
          data-testid="shell-location"
          className="w-full min-w-0 rounded-full border border-[rgba(56,189,248,0.18)] bg-[#0c1829] px-3 py-1.5 text-sm text-white lg:w-52"
          value={locationId}
          onChange={(event) => choose(event.target.value)}
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      ) : null}
    </label>
  )
}

export default function RoleLayout({ role }) {
  const { user, apiWarning, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (document.title.includes('CampusNet')) {
      document.title = document.title.replace('CampusNet', 'NetPulse Campus')
    }
  }, [location.pathname])

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen text-[#cbd5e1]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden lg:block">
        <Sidebar role={role} />
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-50 h-full">
            <Sidebar role={role} showClose onClose={() => setOpen(false)} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[rgba(56,189,248,0.18)] bg-[#050910]/90 px-4 py-3 backdrop-blur lg:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-[#cbd5e1] hover:bg-white/5 lg:hidden"
            aria-label="Open menu"
            data-testid="open-menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Wordmark compact />
          <p className="inline-flex items-center gap-2 rounded-full border border-[#34d399]/30 bg-[#34d399]/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#cbd5e1]">
            <span className="h-2 w-2 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399]" aria-hidden="true" />
            Campus Network
            <span className="text-[#34d399]">Live</span>
          </p>
          <LocationSwitcher />
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <div
              className="flex max-w-[14rem] items-center gap-2 rounded-full border border-[rgba(56,189,248,0.18)] bg-[#0c1829] py-1 pr-1 pl-3"
              title={user?.email || ''}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-white">{user?.name || user?.email || 'Account'}</span>
                <span className="block text-[11px] uppercase tracking-[0.14em] text-[#94a3b8]">{ROLE_LABELS[role] || role}</span>
              </span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full p-2 text-[#cbd5e1] hover:bg-white/5"
                aria-label="Sign out"
              >
                <LogOut aria-hidden="true" size={16} />
              </button>
            </div>
          </div>
        </header>
        {apiWarning ? (
          <p className="border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200" role="status">
            {apiWarning}
          </p>
        ) : null}
        <OutageBanner />
        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
        <footer className="border-t border-[rgba(56,189,248,0.18)] px-4 py-4 text-center text-[11px] uppercase tracking-[0.18em] text-[#94a3b8]">
          SMART CONNECTIVITY, BETTER CAMPUS.
        </footer>
      </div>
    </div>
  )
}
