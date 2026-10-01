import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Wifi, X } from 'lucide-react'
import { MENUS, ROLE_LABELS } from '../navigation.js'
import { useAuth } from '../context/AuthContext.jsx'
import OutageBanner from './OutageBanner.jsx'

function Sidebar({ role, onNavigate, showClose, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const menu = MENUS[role] || []

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full w-72 flex-col border-r border-slate-800 bg-slate-950 md:w-64">
      <div className="flex items-center gap-3 px-4 py-4">
        <Wifi aria-hidden="true" className="text-sky-400" size={22} />
        <div className="min-w-0">
          <p className="font-semibold tracking-tight">CampusNet</p>
          <p className="text-xs text-slate-400">{ROLE_LABELS[role] || role}</p>
        </div>
        {showClose ? (
          <button
            type="button"
            className="ml-auto rounded-lg p-2 text-slate-300 hover:bg-slate-800"
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
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-sky-400/15 text-sky-200'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon aria-hidden="true" size={18} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <p className="truncate text-sm font-medium">{user?.name || user?.email}</p>
        <p className="truncate text-xs text-slate-400">{user?.email}</p>
        {user?.accountStatus ? (
          <p className="mt-1 text-xs text-slate-500">Account {user.accountStatus}</p>
        ) : null}
        <button
          type="button"
          onClick={signOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          <LogOut aria-hidden="true" size={16} />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function RoleLayout({ role }) {
  const { apiWarning } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 md:flex">
      <aside className="sticky top-0 hidden h-screen md:block">
        <Sidebar role={role} />
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
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
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-3 md:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-200 hover:bg-slate-800 md:hidden"
            aria-label="Open menu"
            data-testid="open-menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <p className="text-sm font-medium text-slate-300">{ROLE_LABELS[role]}</p>
        </header>
        {apiWarning ? (
          <p className="border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200" role="status">
            {apiWarning}
          </p>
        ) : null}
        <OutageBanner />
        <main className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
