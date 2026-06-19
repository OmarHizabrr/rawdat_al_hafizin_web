/** تنسيق التاريخ والوقت بالعربية — نظام 12 ساعة مع صباحاً / مساءً */

export const AR_AM = 'صباحاً'
export const AR_PM = 'مساءً'
export const AR_LOCALE = 'ar-SA'

/** @param {unknown} value */
export function coerceToDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value.toDate === 'function') {
    const d = value.toDate()
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null
  }
  if (typeof value.toMillis === 'function') {
    return coerceToDate(new Date(value.toMillis()))
  }
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

/** وقت فقط: 6:30 مساءً */
export function formatTime12Ar(value) {
  const d = coerceToDate(value)
  if (!d) return ''
  let h = d.getHours()
  const m = d.getMinutes()
  const period = h < 12 ? AR_AM : AR_PM
  h %= 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, '0')} ${period}`
}

/** من سلسلة تخزين HH:mm (24 ساعة) إلى عرض 12 ساعة */
export function formatHHmm12Ar(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return ''
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return String(hhmm)
  const d = new Date()
  d.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return formatTime12Ar(d)
}

/** تاريخ فقط */
export function formatDateAr(value, dateStyle = 'medium') {
  const d = coerceToDate(value)
  if (!d) return ''
  return d.toLocaleDateString(AR_LOCALE, { dateStyle })
}

/** تاريخ متوسط + وقت 12 ساعة */
export function formatDateTimeMedium12Ar(value) {
  const d = coerceToDate(value)
  if (!d) return ''
  const datePart = d.toLocaleDateString(AR_LOCALE, { dateStyle: 'medium' })
  return `${datePart} ${formatTime12Ar(d)}`
}

/** تاريخ قصير + وقت 12 ساعة */
export function formatDateTimeShort12Ar(value) {
  const d = coerceToDate(value)
  if (!d) return ''
  const datePart = d.toLocaleDateString(AR_LOCALE, { dateStyle: 'short' })
  return `${datePart} ${formatTime12Ar(d)}`
}

/** للتقارير والجداول — يعيد «—» عند الغياب */
export function formatArDateTime(value) {
  const d = coerceToDate(value)
  if (!d) return '—'
  return formatDateTimeMedium12Ar(d)
}

/** إشعارات وبطاقات مختصرة */
export function formatWhen12Ar(value) {
  const d = coerceToDate(value)
  if (!d) return ''
  const datePart = d.toLocaleDateString(AR_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return `${datePart} ${formatTime12Ar(d)}`
}

/** الطابع الزمني الحالي للطباعة */
export function formatNowMedium12Ar() {
  return formatDateTimeMedium12Ar(new Date())
}
