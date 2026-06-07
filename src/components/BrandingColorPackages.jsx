import { Check } from 'lucide-react'

import { BRANDING_COLOR_PRESETS, getPresetDisplaySwatches } from '../data/brandingPresets.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const PRESET_TAGLINES = {
  original: 'الألوان الأصلية للموقع',
  ocean: 'أزرق هادئ ومحترف',
  plum: 'بنفسجي راقٍ',
  warm: 'دافئ وترابي',
}

/**
 * اختيار حزمة ألوان جاهزة (فاتح + داكن معاً).
 */
export function BrandingColorPackages({ selectedId, onSelect, previewMode = 'light' }) {
  return (
    <div className="rh-color-packages" role="listbox" aria-label="حزم الألوان">
      {BRANDING_COLOR_PRESETS.map((preset) => {
        const swatches = getPresetDisplaySwatches(preset, previewMode)
        const active = selectedId === preset.id
        return (
          <button
            key={preset.id}
            type="button"
            role="option"
            aria-selected={active}
            className={['rh-color-packages__card', active ? 'rh-color-packages__card--active' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(preset.id)}
          >
            <div className="rh-color-packages__swatches" aria-hidden>
              {swatches.map((color, index) => (
                <span key={index} className="rh-color-packages__swatch" style={{ background: color }} />
              ))}
            </div>
            <div className="rh-color-packages__text">
              <strong className="rh-color-packages__name">{preset.name}</strong>
              {PRESET_TAGLINES[preset.id] ? (
                <span className="rh-color-packages__tagline">{PRESET_TAGLINES[preset.id]}</span>
              ) : null}
            </div>
            {active ? (
              <span className="rh-color-packages__check" aria-hidden>
                <RhIcon as={Check} size={18} strokeWidth={RH_ICON_STROKE} />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
