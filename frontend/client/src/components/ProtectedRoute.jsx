import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import LoadingScreen from './LoadingScreen.jsx'

export default function ProtectedRoute({ roles }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/403" replace />
  return <Outlet />
}
