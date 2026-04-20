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
  if (body) return `sms:${d}?body=${encodeURIComponent(body)}`
  return `sms:${d}`
}

/**
 * يحوّل إدخال المستخدم (اسم مستخدم أو رقم) لصيغة مسار t.me
 * @param {string} raw مثل @user أو user أو 9665… أو +966…
 */
export function normalizeTelegramHandle(raw) {
  let s = String(raw ?? '').trim()
  if (!s) return ''
  s = s.replace(/^@+/, '').trim()
  if (!s) return ''
  if (/^\+?[\d\s\-().٫]+$/.test(s)) {
    const digits = s.replace(/\D/g, '')
    if (digits.length < 8) return ''
    return `+${digits}`
  }
  const user = s.replace(/[^a-zA-Z0-9_]/g, '')
  return user.length >= 3 ? user : ''
}

/** رابط فتح محادثة تيليجرام مع نص مبدئي (حسب دعم العميل) */
export function telegramSendUrl(rawHandle, text = '') {
  const h = normalizeTelegramHandle(rawHandle)
  if (!h) return ''
  const path = h.startsWith('+') ? h : h
  const base = `https://t.me/${path}`
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}

/**
 * @param {unknown} input
 * @returns {Array<{ id: string, label: string, phone: string, telegram: string }>}
 */
export function normalizeContactPhones(input) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const row of input) {
    const phone = String(row?.phone ?? '').trim()
    const telegram = String(row?.telegram ?? '').trim()
    if (!phone && !telegram) continue
    const label = String(row?.label ?? '').trim()
    const id = String(row?.id ?? '').trim() || firestoreApi.getNewId('cphone')
    out.push({ id, label, phone, telegram })
  }
  return out
}
