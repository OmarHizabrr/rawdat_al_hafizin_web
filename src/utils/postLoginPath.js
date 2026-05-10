import { normalizeRole } from '../config/roles.js'
import { getPostLoginLandingPath } from './permissionsResolve.js'
import { hasApplicationReviewSessionFlag } from './applicationReviewSession.js'

/** مسار الدخول بعد المصادقة؛ يأخذ في الاعتبار مراجعة طلب الالتحاق بعد خروج سابق */
export function resolvePostLoginPath(user) {
  const role = normalizeRole(user?.role)
  /**
   * لا نشترط هنا حالة قبول الطلب في كائن المستخدم: قد تصل متأخرة من Firestore في أول إطار بعد الدخول،
   * فيُوجَّه الطالب خطأً إلى /app حتى يحدّث الصفحة. العلم في الجلسة يكفي لأنه يُضبط عند الخروج فقط لمن يخدمه النوع.
   */
  if (role === 'student' && hasApplicationReviewSessionFlag()) {
    return '/app/application'
  }
  return getPostLoginLandingPath(user)
}
