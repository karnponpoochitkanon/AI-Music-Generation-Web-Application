import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.jsx'

export default function ProtectedRoute() {
  const { authReady, isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!user?.profileComplete) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />
  }

  return <Outlet />
}
