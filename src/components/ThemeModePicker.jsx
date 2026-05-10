import { Monitor, Moon, Sun } from 'lucide-react'
import { rhHapticLight } from '../utils/haptics.js'
import { useTheme } from '../theme/useTheme.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const OPTIONS = [
  { value: 'system', label: 'حسب النظام', hint: 'يتبع إعدادات جهازك', Icon: Monitor },
  { value: 'light', label: 'فاتح', hint: 'خلفية فاتحة دائماً', Icon: Sun },
  { value: 'dark', label: 'داكن', hint: 'مريح للعين في الإضاءة المنخفضة', Icon: Moon },
]

export function ThemeModePicker() {
  const { preference, setPreference } = useTheme()

  return (
    <div className="rh-segment" role="radiogroup" aria-label="مظهر التطبيق">
      {OPTIONS.map((opt) => {
        const selected = preference === opt.value
        const Icon = opt.Icon
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={['rh-segment__btn', selected ? 'rh-segment__btn--active' : ''].filter(Boolean).join(' ')}
            onClick={() => {
              rhHapticLight()
              setPreference(opt.value)
            }}
          >
            <span className="rh-segment__lead">
              <RhIcon as={Icon} size={20} strokeWidth={RH_ICON_STROKE} aria-hidden />
              <span className="rh-segment__label">{opt.label}</span>
            </span>
            <span className="rh-segment__hint">{opt.hint}</span>
          </button>
        )
      })}
    </div>
  )
}
