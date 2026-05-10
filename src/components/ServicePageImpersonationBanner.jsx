import { HapticLink } from '../ui/HapticLink.jsx'
import { isAdmin } from '../config/roles.js'

/**
 * يظهر للمشرف عند فتح الصفحة مع ?uid= لتوضيح أن النموذج يُعدّ نيابةً عن مستخدم آخر.
 * @param {{ actor: { uid?: string } | null | undefined, impersonateUid: string, hidePlansLink?: boolean }} props
 */
export function ServicePageImpersonationBanner({ actor, impersonateUid, hidePlansLink = false }) {
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
        <HapticLink to="/app/admin/users">المستخدمون</HapticLink>
        {' · '}
        <HapticLink to={`/app?uid=${encodeURIComponent(uid)}`}>رئيسيته</HapticLink>
        {!hidePlansLink ? (
          <>
            {' · '}
            <HapticLink to={`/app/plans?uid=${encodeURIComponent(uid)}`}>خططه</HapticLink>
          </>
        ) : null}
      </p>
    </div>
  )
}
