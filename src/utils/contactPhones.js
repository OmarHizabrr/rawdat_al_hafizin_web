import { firestoreApi } from '../services/firestoreApi.js'

/** بادئة دولية للعرض وروابط sms/wa */
export function dialStringFromPhone(phone) {
  let s = String(phone ?? '').trim().replace(/[\s\-().٫]/g, '')
  if (!s) return ''
  if (s.startsWith('00')) s = `+${s.slice(2)}`
  const digitsOnly = s.replace(/\D/g, '')
  if (!digitsOnly) return ''
  if (s.startsWith('+')) return `+${digitsOnly}`
  if (digitsOnly.startsWith('0') && digitsOnly.length >= 9) {
    return `+966${digitsOnly.slice(1)}`
  }
  return `+${digitsOnly}`
}

export function waMeDigits(phone) {
  const d = dialStringFromPhone(phone)
  return d.replace(/\D/g, '')
}

export function whatsappSendUrl(phone, text = '') {
  const n = waMeDigits(phone)
  if (!n) return ''
  const base = `https://wa.me/${n}`
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}

export function smsHref(phone, body = '') {
  const d = dialStringFromPhone(phone)
  if (!d) return ''
  const enc = encodeURIComponent(d)
  if (body) return `sms:${d}?body=${encodeURIComponent(body)}`
  return `sms:${d}`
}

/**
 * @param {unknown} input
 * @returns {Array<{ id: string, label: string, phone: string }>}
 */
export function normalizeContactPhones(input) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const row of input) {
    const phone = String(row?.phone ?? '').trim()
    if (!phone) continue
    const label = String(row?.label ?? '').trim()
    const id = String(row?.id ?? '').trim() || firestoreApi.getNewId('cphone')
    out.push({ id, label, phone })
  }
  return out
}
