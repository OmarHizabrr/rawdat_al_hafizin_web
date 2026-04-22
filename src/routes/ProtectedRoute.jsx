import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { normalizeRole } from '../config/roles.js'
import { PROFILE_REQUEST_STATUS } from '../services/profileRequestService.js'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="rh-auth-loading" role="status" aria-live="polite">
        <div className="rh-spinner" />
        <p>جاري التحميل…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.isActive === false) {
    return <Navigate to="/login?suspended=1" replace />
  }

  const role = normalizeRole(user.role)
  const status = String(user.profileRequestStatus || '').trim()
  const isStudent = role === 'student'
  const onApplicationPage = location.pathname === '/app/application'
  const approved = status === PROFILE_REQUEST_STATUS.APPROVED

  if (isStudent && !approved && !onApplicationPage) {
    return <Navigate to="/app/application" replace state={{ from: location }} />
  }

  if (isStudent && approved && onApplicationPage) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}
