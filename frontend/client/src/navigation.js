import {
  Activity,
  AlertTriangle,
  Gauge,
  History,
  House,
  LayoutDashboard,
  LineChart,
  MapPin,
  MessageSquareWarning,
  ScrollText,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'

export const ROLE_LABELS = {
  student: 'Student',
  it: 'IT',
  manager: 'Manager',
  admin: 'Admin',
}

export const ROLE_PREFIX = {
  student: '/student',
  it: '/it',
  manager: '/manager',
  admin: '/admin',
}

const managerLinks = [
  { slug: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { slug: 'locations', label: 'Network', icon: MapPin },
  { slug: 'analytics', label: 'Analytics', icon: LineChart },
  { slug: 'insights', label: 'AI', icon: Sparkles },
]

function withPrefix(prefix, links) {
  return links.map((link) => ({
    to: `${prefix}/${link.slug}`,
    label: link.label,
    icon: link.icon,
  }))
}

export const MENUS = {
  student: [
    { to: '/student/home', label: 'Home', icon: House },
    { to: '/student/speed-test', label: 'Test Wi-Fi', icon: Gauge },
    { to: '/student/complaints', label: 'Report', icon: MessageSquareWarning },
    { to: '/student/history', label: 'History', icon: History },
    { to: '/student/outages', label: 'Outages', icon: AlertTriangle },
  ],
  it: [
    { to: '/it/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/it/tests', label: 'Network', icon: Activity },
    { to: '/it/complaints', label: 'Incidents', icon: MessageSquareWarning },
    { to: '/it/outages', label: 'Outages', icon: AlertTriangle },
    { to: '/it/analytics', label: 'Analytics', icon: LineChart },
    { to: '/it/insights', label: 'AI', icon: Sparkles },
  ],
  manager: withPrefix('/manager', managerLinks),
  admin: [
    ...withPrefix('/admin', managerLinks),
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
    { to: '/admin/logs', label: 'Activity Log', icon: ScrollText },
  ],
}

export const ROLE_HOME = {
  student: '/student/home',
  it: '/it/dashboard',
  manager: '/manager/dashboard',
  admin: '/admin/dashboard',
}

export function homeForRole(role) {
  return ROLE_HOME[role] || '/login'
}

export function canOpenPath(role, path) {
  const prefix = ROLE_PREFIX[role]
  return typeof path === 'string' && (path === prefix || path.startsWith(`${prefix}/`))
}
