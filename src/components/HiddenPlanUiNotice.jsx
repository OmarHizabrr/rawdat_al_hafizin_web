import { HapticLink } from '../ui/HapticLink.jsx'

/**
 * تنبيه يُعرض عند فتح مسارات الخطط رغم تفعيل إخفاء اختصارات الخطة من الرئيسية والقائمة.
 * @param {{ variant?: 'self' | 'adminViewing', className?: string }} props
 */
export function HiddenPlanUiNotice({ variant = 'self', className = '' }) {
  if (variant === 'adminViewing') {
    return (
      <p
        className={['rh-plans__admin-banner', className].filter(Boolean).join(' ')}
        role="status"
      >
        هذا المستخدم أخفى اختصارات الخطط من واجهته؛ يمكنك متابعة إدارته هنا كمشرف.
      </p>
    )
  }
  return (
    <p className={['rh-plans__admin-banner', className].filter(Boolean).join(' ')} role="status">
      أوقفت عرض الخطط من القائمة الجانبية والرئيسية. ما زال بإمكانك إدارة خططك من هذه الصفحة أو من الأوراد.
      لإعادة إظهار الاختصارات في الواجهة، انتقل إلى{' '}
      <HapticLink to="/app/settings">الإعدادات</HapticLink>
      إن سمح نوع صلاحياتك.
    </p>
  )
}
