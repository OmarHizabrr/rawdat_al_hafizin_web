import { Eye } from 'lucide-react'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'
import { HapticLink } from '../ui/HapticLink.jsx'
import { rhHapticLight } from '../utils/haptics.js'

/**
 * زر موحّد (أيقونة العين).
 * إذا وُجد `to` يُصيَّر كرابط للتنقل؛ وإلا زر بـ `onClick`.
 */
export function PeekButton({ to, onClick, title = 'معاينة', className = '', disabled = false }) {
  const cls = ['rh-peek-btn', className].filter(Boolean).join(' ')

  if (to) {
    return (
      <HapticLink
        to={to}
        className={cls}
        title={title}
        aria-label={title}
        onClick={onClick}
      >
        <RhIcon as={Eye} size={18} strokeWidth={RH_ICON_STROKE} />
      </HapticLink>
    )
  }

  return (
    <button
      type="button"
      className={cls}
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch' && !window.matchMedia('(pointer: coarse)').matches) return
        rhHapticLight()
      }}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <RhIcon as={Eye} size={18} strokeWidth={RH_ICON_STROKE} />
    </button>
  )
}
