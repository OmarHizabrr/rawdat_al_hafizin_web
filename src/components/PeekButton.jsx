import { Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

/**
 * زر موحّد (أيقونة العين).
 * إذا وُجد `to` يُصيَّر كرابط للتنقل؛ وإلا زر بـ `onClick`.
 */
export function PeekButton({ to, onClick, title = 'معاينة', className = '', disabled = false }) {
  const cls = ['rh-peek-btn', className].filter(Boolean).join(' ')

  if (to) {
    return (
      <Link
        to={to}
        className={cls}
        title={title}
        aria-label={title}
        onClick={onClick}
      >
        <RhIcon as={Eye} size={18} strokeWidth={RH_ICON_STROKE} />
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <RhIcon as={Eye} size={18} strokeWidth={RH_ICON_STROKE} />
    </button>
  )
}
