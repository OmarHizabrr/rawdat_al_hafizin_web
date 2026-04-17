import { THEME_VAR_DEFAULTS } from '../data/brandingPresets.js'
import { Button, TextField } from '../ui/index.js'

function normalizeHex6(v) {
  const s = String(v ?? '').trim()
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    const x = s.slice(1)
    return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`.toLowerCase()
  }
  return ''
}

function hexForPicker(value, fallback) {
  return normalizeHex6(value) || normalizeHex6(fallback) || '#888888'
}

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.name
 * @param {string} props.value
 * @param {(name: string, next: string) => void} props.onChange
 * @param {'light' | 'dark'} props.mode
 * @param {boolean} [props.useColorPicker]
 */
export function BrandingColorRow({ label, name, value, onChange, mode, useColorPicker = true }) {
  const fallbackProgram = THEME_VAR_DEFAULTS[name]?.[mode === 'dark' ? 'dark' : 'light'] ?? ''

  if (!useColorPicker) {
    return (
      <div className="rh-admin-branding__color-field">
        <span className="rh-admin-branding__color-field-label">{label}</span>
        <p className="rh-admin-branding__color-field-micro">
          هذا اللون شفاف — اكتب بصيغة rgba أو rgb، أو استخدم «القيمة المقترحة».
        </p>
        <div className="rh-admin-branding__color-field-row rh-admin-branding__color-field-row--stack">
          <TextField
            label="القيمة"
            value={value || ''}
            onChange={(e) => onChange(name, e.target.value)}
            placeholder="مثال: rgba(27, 67, 50, 0.1)"
          />
          <div className="rh-admin-branding__color-field-actions">
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(name, '')}>
              مسح
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => onChange(name, fallbackProgram)}>
              القيمة المقترحة
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const pickerHex = hexForPicker(value, fallbackProgram)

  return (
    <div className="rh-admin-branding__color-field">
      <span className="rh-admin-branding__color-field-label">{label}</span>
      <div className="rh-admin-branding__color-field-row">
        <input
          type="color"
          className="rh-admin-branding__color-native"
          value={pickerHex}
          onChange={(e) => onChange(name, e.target.value)}
          title="اختر لوناً"
          aria-label={label}
        />
        <TextField
          label="كود اللون"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder="#RRGGBB"
          hint="يمكنك لصق rgba أيضاً؛ عندها يُعطّل المربّع أعلاه تلقائياً حتى تعدّل النص."
        />
        <div className="rh-admin-branding__color-field-actions">
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(name, '')}>
            مسح
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange(name, normalizeHex6(fallbackProgram) || fallbackProgram)}>
            الافتراضي
          </Button>
        </div>
      </div>
    </div>
  )
}
