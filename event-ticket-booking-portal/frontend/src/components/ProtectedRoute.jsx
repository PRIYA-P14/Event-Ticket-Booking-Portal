import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { rolePath } from '../context/routeUtils'

function ProtectedRoute({ roles }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <main className="auth-state">Checking your session...</main>
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={rolePath(user.role)} replace />

  return <Outlet />
}

export { ProtectedRoute }
