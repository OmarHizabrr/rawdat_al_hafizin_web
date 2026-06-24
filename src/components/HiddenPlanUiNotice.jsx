import { HapticLink } from '../ui/HapticLink.jsx'

/**
 * تنبيه يُعرض عند فتح مسارات الخطط رغم إيقاف عرض لوحة الخطة على الرئيسية فقط.
 * @param {{ variant?: 'self' | 'adminViewing', className?: string }} props
 */
export function HiddenPlanUiNotice({ variant = 'self', className = '' }) {
  if (variant === 'adminViewing') {
    return (
      <p
        className={['rh-plans__status-notice', className].filter(Boolean).join(' ')}
        role="status"
      >
        هذا المستخدم أوقف عرض لوحة الخطة على الرئيسية؛ يمكنك متابعة إدارته هنا كمشرف.
      </p>
    )
  }
  return (
    <p className={['rh-plans__status-notice', className].filter(Boolean).join(' ')} role="status">
      أوقفت عرض لوحة الخطة على الرئيسية. ما زال بإمكانك إدارة خططك من هذه الصفحة أو من «الخطط» في القائمة.
      لإعادة اللوحة على الرئيسية، انتقل إلى{' '}
      <HapticLink to="/app/settings">الإعدادات</HapticLink>
      إن سمح نوع صلاحياتك.
    </p>
  )
}
