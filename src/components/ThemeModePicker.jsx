import { useTheme } from '../theme/useTheme.js'

const OPTIONS = [
  { value: 'system', label: 'حسب النظام', hint: 'يتبع إعدادات جهازك' },
  { value: 'light', label: 'فاتح', hint: 'خلفية فاتحة دائماً' },
  { value: 'dark', label: 'داكن', hint: 'مريح للعين في الإضاءة المنخفضة' },
]

export function ThemeModePicker() {
  const { preference, setPreference } = useTheme()

  return (
    <div className="rh-segment" role="radiogroup" aria-label="مظهر التطبيق">
      {OPTIONS.map((opt) => {
        const selected = preference === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={['rh-segment__btn', selected ? 'rh-segment__btn--active' : ''].filter(Boolean).join(' ')}
            onClick={() => setPreference(opt.value)}
          >
            <span className="rh-segment__label">{opt.label}</span>
            <span className="rh-segment__hint">{opt.hint}</span>
          </button>
        )
      })}
    </div>
  )
}
