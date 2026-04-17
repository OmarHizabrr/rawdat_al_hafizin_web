import { Eye } from 'lucide-react'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

/** زر موحّد (أيقونة العين) لمعاينة تفاصيل خطة / مستخدم */
export function PeekButton({ onClick, title = 'معاينة', className = '', disabled = false }) {
  return (
    <button
      type="button"
      className={['rh-peek-btn', className].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <RhIcon as={Eye} size={18} strokeWidth={RH_ICON_STROKE} />
    </button>
  )
}
