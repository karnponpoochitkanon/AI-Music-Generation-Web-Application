import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.jsx'

export default function PublicOnlyRoute() {
  const { authReady, isAuthenticated, user } = useAuth()
  const location = useLocation()
  const redirectTo = user?.profileComplete
    ? location.state?.from?.pathname || '/'
    : '/onboarding'

  if (!authReady) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
