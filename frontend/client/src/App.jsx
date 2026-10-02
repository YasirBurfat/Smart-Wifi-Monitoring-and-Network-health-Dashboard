import { Navigate, Route, Routes } from 'react-router-dom'
import GuestRoute from './components/GuestRoute.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import PlaceholderPage from './components/PlaceholderPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RoleLayout from './components/RoleLayout.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { MENUS, ROLE_HOME, ROLE_PREFIX } from './navigation.js'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LocationsPage from './pages/admin/LocationsPage.jsx'
import LogsPage from './pages/admin/LogsPage.jsx'
import SettingsPage from './pages/admin/SettingsPage.jsx'
import UsersPage from './pages/admin/UsersPage.jsx'
import AnalyticsPage from './pages/analytics/AnalyticsPage.jsx'
import DashboardPage from './pages/dashboard/DashboardPage.jsx'
import InsightsPage from './pages/insights/InsightsPage.jsx'
import ItComplaintsPage from './pages/it/ComplaintsPage.jsx'
import ItOutagesPage from './pages/it/OutagesPage.jsx'
import TestsPage from './pages/it/TestsPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import HistoryPage from './pages/student/HistoryPage.jsx'
import HomePage from './pages/student/HomePage.jsx'
import SpeedTestPage from './pages/student/SpeedTestPage.jsx'
import StudentComplaintsPage from './pages/student/ComplaintsPage.jsx'
import OutagesPage from './pages/student/OutagesPage.jsx'
import UnauthorizedPage from './pages/UnauthorizedPage.jsx'

const ROLES = ['student', 'it', 'manager', 'admin']

function renderPage(item) {
  if (item.to === '/student/home') return <HomePage />
  if (item.to === '/student/speed-test') return <SpeedTestPage />
  if (item.to === '/student/history') return <HistoryPage />
  if (item.to === '/student/complaints') return <StudentComplaintsPage />
  if (item.to === '/student/outages') return <OutagesPage />
  if (item.to === '/it/complaints') return <ItComplaintsPage />
  if (item.to === '/it/tests') return <TestsPage />
  if (item.to === '/it/outages') return <ItOutagesPage />
  if (item.to === '/it/dashboard') return <DashboardPage mode="it" />
  if (item.to === '/manager/dashboard' || item.to === '/admin/dashboard') return <DashboardPage mode="full" />
  if (item.to.endsWith('/analytics')) return <AnalyticsPage />
  if (item.to.endsWith('/insights')) return <InsightsPage />
  if (item.to.endsWith('/locations')) return <LocationsPage canWrite={item.to.startsWith('/admin')} />
  if (item.to === '/admin/users') return <UsersPage />
  if (item.to === '/admin/settings') return <SettingsPage />
  if (item.to === '/admin/logs') return <LogsPage />
  return <PlaceholderPage title={item.label} />
}

function HomeRedirect() {
  const { user, ready } = useAuth()
  if (!ready) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/403" element={<UnauthorizedPage />} />
      {ROLES.map((role) => (
        <Route key={role} element={<ProtectedRoute roles={[role]} />}>
          <Route element={<RoleLayout role={role} />}>
            <Route path={ROLE_PREFIX[role]} element={<Navigate to={ROLE_HOME[role]} replace />} />
            {MENUS[role].map((item) => (
              <Route key={item.to} path={item.to} element={renderPage(item)} />
            ))}
          </Route>
        </Route>
      ))}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
