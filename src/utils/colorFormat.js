export function normalizeHex6(value) {
  const s = String(value ?? '').trim()
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    const x = s.slice(1)
    return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`.toLowerCase()
  }
  return ''
}

export function hexToRgb(hex) {
  const h = normalizeHex6(hex)
  if (!h) return null
  const n = parseInt(h.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex(r, g, b) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(Number(n) || 0)))
  const rr = clamp(r).toString(16).padStart(2, '0')
  const gg = clamp(g).toString(16).padStart(2, '0')
  const bb = clamp(b).toString(16).padStart(2, '0')
  return `#${rr}${gg}${bb}`
}

export function parseRgba(value) {
  const s = String(value ?? '').trim()
  const m = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i)
  if (!m) return null
  const r = Math.min(255, Number(m[1]))
  const g = Math.min(255, Number(m[2]))
  const b = Math.min(255, Number(m[3]))
  const a = m[4] !== undefined ? Math.max(0, Math.min(1, Number(m[4]))) : 1
  return { r, g, b, a }
}

export function rgbaString(r, g, b, a) {
  const alpha = Math.max(0, Math.min(1, Number(a) || 0))
  const rr = Math.max(0, Math.min(255, Math.round(Number(r) || 0)))
  const gg = Math.max(0, Math.min(255, Math.round(Number(g) || 0)))
  const bb = Math.max(0, Math.min(255, Math.round(Number(b) || 0)))
  const aStr = alpha === 1 ? '1' : String(Math.round(alpha * 100) / 100)
  return `rgba(${rr}, ${gg}, ${bb}, ${aStr})`
}

export function rgbaFromHexAlpha(hex, alpha) {
  const rgb = hexToRgb(hex)
  if (!rgb) return ''
  return rgbaString(rgb.r, rgb.g, rgb.b, alpha)
}

export function hexForColorInput(value, fallback = '#888888') {
  const parsed = parseRgba(value)
  if (parsed) return rgbToHex(parsed.r, parsed.g, parsed.b)
  return normalizeHex6(value) || normalizeHex6(fallback) || '#888888'
}

export function alphaPercentFromValue(value, fallbackAlpha = 0.2) {
  const parsed = parseRgba(value)
  if (parsed) return Math.round(parsed.a * 100)
  return Math.round(fallbackAlpha * 100)
}

export function isRgbaLikeValue(value) {
  return /^rgba?\(/i.test(String(value ?? '').trim())
}
