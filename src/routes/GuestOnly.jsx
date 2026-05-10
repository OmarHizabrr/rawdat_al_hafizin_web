import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { resolvePostLoginPath } from '../utils/postLoginPath.js'

export function GuestOnly() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="rh-auth-loading" role="status" aria-live="polite">
        <div className="rh-spinner" />
        <p>جاري التحميل…</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to={resolvePostLoginPath(user)} replace />
  }

  return <Outlet />
}
