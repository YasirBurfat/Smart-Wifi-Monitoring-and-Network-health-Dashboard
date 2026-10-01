import {
  Activity,
  AlertTriangle,
  Gauge,
  History,
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
  { slug: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { slug: 'analytics', label: 'Analytics', icon: LineChart },
  { slug: 'locations', label: 'Locations', icon: MapPin },
  { slug: 'insights', label: 'AI Insights', icon: Sparkles },
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
    { to: '/student/speed-test', label: 'Speed Test', icon: Gauge },
    { to: '/student/history', label: 'History', icon: History },
    { to: '/student/complaints', label: 'Complaints', icon: MessageSquareWarning },
    { to: '/student/outages', label: 'Outages', icon: AlertTriangle },
  ],
  it: [
    { to: '/it/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/it/complaints', label: 'Complaints', icon: MessageSquareWarning },
    { to: '/it/tests', label: 'Tests', icon: Activity },
    { to: '/it/outages', label: 'Outages', icon: AlertTriangle },
  ],
  manager: withPrefix('/manager', managerLinks),
  admin: [
    ...withPrefix('/admin', managerLinks),
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
    { to: '/admin/logs', label: 'Logs', icon: ScrollText },
  ],
}

export const ROLE_HOME = {
  student: '/student/speed-test',
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
