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
import DashboardPage from './pages/dashboard/DashboardPage.jsx'
import ItComplaintsPage from './pages/it/ComplaintsPage.jsx'
import TestsPage from './pages/it/TestsPage.jsx'
import HistoryPage from './pages/student/HistoryPage.jsx'
import SpeedTestPage from './pages/student/SpeedTestPage.jsx'
import StudentComplaintsPage from './pages/student/ComplaintsPage.jsx'
import OutagesPage from './pages/student/OutagesPage.jsx'
import UnauthorizedPage from './pages/UnauthorizedPage.jsx'

const ROLES = ['student', 'it', 'manager', 'admin']

function renderPage(item) {
  if (item.to === '/student/speed-test') return <SpeedTestPage />
  if (item.to === '/student/history') return <HistoryPage />
  if (item.to === '/student/complaints') return <StudentComplaintsPage />
  if (item.to === '/student/outages') return <OutagesPage />
  if (item.to === '/it/complaints') return <ItComplaintsPage />
  if (item.to === '/it/tests') return <TestsPage />
  if (item.to === '/it/dashboard') return <DashboardPage mode="it" />
  if (item.to === '/manager/dashboard' || item.to === '/admin/dashboard') return <DashboardPage mode="full" />
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
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
