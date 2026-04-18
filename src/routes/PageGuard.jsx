import { Navigate, useLocation } from 'react-router-dom'
import { getPermissionPageIdFromPath } from '../config/permissionRegistry.js'
import { usePermissions } from '../context/usePermissions.js'

/**
 * يحمي مساراً واحداً حسب سجل الصلاحيات. مرّر pageId صراحةً أو اتركه ليُستنتج من المسار.
 */
export function PageGuard({ pageId: pageIdProp, children }) {
  const location = useLocation()
  const { ready, canAccessPage, firstAccessiblePath } = usePermissions()

  const pageId = pageIdProp ?? getPermissionPageIdFromPath(location.pathname)

  if (!ready) {
    return (
      <div className="rh-auth-loading" role="status" aria-live="polite">
        <div className="rh-spinner" />
        <p>جاري تحميل الصلاحيات…</p>
      </div>
    )
  }

  if (pageId && !canAccessPage(pageId)) {
    const to = firstAccessiblePath()
    return <Navigate to={to} replace state={{ from: location, denied: pageId }} />
  }

  return children
}
