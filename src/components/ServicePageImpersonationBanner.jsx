import { Link } from 'react-router-dom'
import { isAdmin } from '../config/roles.js'

/**
 * يظهر للمشرف عند فتح الصفحة مع ?uid= لتوضيح أن النموذج يُعدّ نيابةً عن مستخدم آخر.
 * @param {{ actor: { uid?: string } | null | undefined, impersonateUid: string }} props
 */
export function ServicePageImpersonationBanner({ actor, impersonateUid }) {
  const uid = (impersonateUid || '').trim()
  if (!actor?.uid || !uid || !isAdmin(actor) || uid === actor.uid) return null

  return (
    <div className="rh-service-page__impersonation-banner" role="status">
      <p className="rh-service-page__impersonation-p">
        أنت تعمل <strong>نيابةً عن هذا المستخدم</strong> — المعرف:{' '}
        <code className="rh-service-page__impersonation-code" dir="ltr">
          {uid}
        </code>
        . سيتم إرفاق ذلك في نص الرسالة عند الإرسال.
      </p>
      <p className="rh-service-page__impersonation-links">
        <Link to="/app/admin/users">المستخدمون</Link>
        {' · '}
        <Link to={`/app?uid=${encodeURIComponent(uid)}`}>رئيسيته</Link>
        {' · '}
        <Link to={`/app/plans?uid=${encodeURIComponent(uid)}`}>خططه</Link>
      </p>
    </div>
  )
}
