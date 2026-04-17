import { Navigate, Outlet } from 'react-router-dom'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'

export function AdminRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="rh-auth-loading" role="status" aria-live="polite">
        <div className="rh-spinner" />
        <p>جاري التحميل…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin(user)) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}
