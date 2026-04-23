import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.jsx'

export default function OnboardingRoute() {
  const { authReady, isAuthenticated, user } = useAuth()

  if (!authReady) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.profileComplete) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
