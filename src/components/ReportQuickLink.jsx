import { FileText } from 'lucide-react'
import { useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { REPORT_KIND_PERMISSION, reportViewPath } from '../config/reportKinds.js'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { HapticLink } from '../ui/HapticLink.jsx'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const PAGE_ID = PERMISSION_PAGE_IDS.reports

/**
 * رابط سريع لتقرير شامل (خطة، طالب، حلقة…).
 */
export function ReportQuickLink({
  kind,
  entityId,
  label = 'تقرير شامل',
  className = 'ui-btn ui-btn--ghost ui-btn--sm',
  title,
  iconOnly = false,
}) {
  const { user } = useAuth()
  const { search } = useLocation()
  const { can } = usePermissions()

  const appLink = useCallback(
    (path) => withImpersonationQuery(path, getImpersonateUid(user, search)),
    [user, search],
  )

  const id = String(entityId || '').trim()
  const perm = REPORT_KIND_PERMISSION[kind]
  if (!id || !perm || !can(PAGE_ID, perm)) return null

  return (
    <HapticLink
      to={appLink(reportViewPath({ kind, entityId: id }))}
      className={['rh-report-quick-link', className].filter(Boolean).join(' ')}
      title={title || label}
    >
      <RhIcon as={FileText} size={iconOnly ? 18 : 16} strokeWidth={RH_ICON_STROKE} />
      {iconOnly ? null : label}
    </HapticLink>
  )
}
