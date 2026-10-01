import { Navigate, Outlet } from 'react-router-dom'
import { homeForRole } from '../navigation.js'
import { useAuth } from '../context/AuthContext.jsx'
import LoadingScreen from './LoadingScreen.jsx'

export default function GuestRoute() {
  const { user, ready } = useAuth()
  if (!ready) return <LoadingScreen />
  if (user) return <Navigate to={homeForRole(user.role)} replace />
  return <Outlet />
}
