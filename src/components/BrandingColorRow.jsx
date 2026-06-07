import { RotateCcw, X } from 'lucide-react'
import { AdminAdvancedPanel } from './admin/AdminAdvancedPanel.jsx'
import { THEME_VAR_DEFAULTS } from '../data/brandingPresets.js'
import {
  alphaPercentFromValue,
  hexForColorInput,
  isRgbaLikeValue,
  normalizeHex6,
  rgbaFromHexAlpha,
} from '../utils/colorFormat.js'
import { Button, TextField } from '../ui/index.js'

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.name
 * @param {string} props.value
 * @param {(name: string, next: string) => void} props.onChange
 * @param {'light' | 'dark'} props.mode
 * @param {boolean} [props.useColorPicker]
 * @param {'hex' | 'alpha'} [props.pickerMode]
 */
export function BrandingColorRow({ label, name, value, onChange, mode, useColorPicker = true, pickerMode = 'hex' }) {
  const fallbackProgram = THEME_VAR_DEFAULTS[name]?.[mode === 'dark' ? 'dark' : 'light'] ?? ''
  const useAlphaPicker =
    pickerMode === 'alpha' || useColorPicker === false || isRgbaLikeValue(value) || isRgbaLikeValue(fallbackProgram)

  if (useAlphaPicker) {
    const pickerHex = hexForColorInput(value, fallbackProgram)
    const alphaPct = alphaPercentFromValue(value, alphaPercentFromValue(fallbackProgram, 20) / 100)
    const previewColor = rgbaFromHexAlpha(pickerHex, alphaPct / 100) || value || fallbackProgram

    return (
      <div className="rh-admin-branding__color-field rh-admin-branding__color-field--alpha">
        <span className="rh-admin-branding__color-field-label">{label}</span>
        <p className="rh-admin-branding__color-field-micro">اختر اللون ثم اضبط الشفافية بحركة بسيطة.</p>
        <div className="rh-admin-branding__alpha-picker">
          <div className="rh-admin-branding__alpha-picker-top">
            <input
              type="color"
              className="rh-admin-branding__color-native"
              value={pickerHex}
              onChange={(e) => onChange(name, rgbaFromHexAlpha(e.target.value, alphaPct / 100))}
              title="اختر اللون"
              aria-label={`لون ${label}`}
            />
            <div className="rh-admin-branding__alpha-preview" aria-hidden>
              <span className="rh-admin-branding__alpha-preview-fill" style={{ background: previewColor }} />
            </div>
            <div className="rh-admin-branding__alpha-slider-wrap">
              <label className="rh-admin-branding__alpha-slider-label" htmlFor={`${name}-alpha`}>
                الشفافية
                <strong>{alphaPct}%</strong>
              </label>
              <input
                id={`${name}-alpha`}
                type="range"
                className="rh-admin-branding__alpha-slider"
                min={0}
                max={100}
                step={1}
                value={alphaPct}
                onChange={(e) => onChange(name, rgbaFromHexAlpha(pickerHex, Number(e.target.value) / 100))}
              />
            </div>
          </div>
          <div className="rh-admin-branding__color-field-actions">
            <Button type="button" size="sm" variant="ghost" icon={X} onClick={() => onChange(name, '')}>
              مسح (الافتراضي)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={RotateCcw}
              onClick={() => onChange(name, fallbackProgram)}
            >
              استعادة المقترح
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const pickerHex = hexForColorInput(value, fallbackProgram)

  return (
    <div className="rh-admin-branding__color-field">
      <span className="rh-admin-branding__color-field-label">{label}</span>
      <p className="rh-admin-branding__color-field-micro">اضغط المربّع الملون لاختيار اللون.</p>
      <div className="rh-admin-branding__color-field-row">
        <input
          type="color"
          className="rh-admin-branding__color-native"
          value={pickerHex}
          onChange={(e) => onChange(name, e.target.value)}
          title="اختر لوناً"
          aria-label={label}
        />
        <div className="rh-admin-branding__alpha-preview" aria-hidden>
          <span className="rh-admin-branding__alpha-preview-fill" style={{ background: value || pickerHex }} />
        </div>
        <div className="rh-admin-branding__color-field-actions">
          <Button type="button" size="sm" variant="ghost" icon={X} onClick={() => onChange(name, '')}>
            مسح
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={RotateCcw}
            onClick={() => onChange(name, normalizeHex6(fallbackProgram) || fallbackProgram)}
          >
            الافتراضي
          </Button>
        </div>
      </div>
      <AdminAdvancedPanel summary="تعديل كود اللون يدوياً (اختياري)">
        <TextField
          label="كود اللون"
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder="#RRGGBB"
          dir="ltr"
        />
      </AdminAdvancedPanel>
    </div>
  )
}
