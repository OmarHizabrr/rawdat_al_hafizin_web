import { normalizeRole } from '../config/roles.js'
import { PROFILE_REQUEST_STATUS } from '../services/profileRequestService.js'
import { getPostLoginLandingPath } from './permissionsResolve.js'
import { hasApplicationReviewSessionFlag } from './applicationReviewSession.js'

/** مسار الدخول بعد المصادقة؛ يأخذ في الاعتبار مراجعة طلب الالتحاق بعد خروج سابق */
export function resolvePostLoginPath(user) {
  const role = normalizeRole(user?.role)
  const approved = String(user?.profileRequestStatus || '').trim() === PROFILE_REQUEST_STATUS.APPROVED
  if (role === 'student' && approved && hasApplicationReviewSessionFlag()) {
    return '/app/application'
  }
  return getPostLoginLandingPath(user)
}
