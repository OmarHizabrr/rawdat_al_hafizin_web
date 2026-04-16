/**
 * أيقونات موحّدة عبر المشروع (Lucide).
 * strokeWidth ثابت ليتناسب مع خطوط Noto والواجهة الحالية.
 */
export const RH_ICON_STROKE = 1.65

export function RhIcon({ as: Icon, size = 20, className = '', strokeWidth = RH_ICON_STROKE, ...props }) {
  if (!Icon) return null
  return <Icon size={size} strokeWidth={strokeWidth} className={['rh-lucide', className].filter(Boolean).join(' ')} {...props} />
}
