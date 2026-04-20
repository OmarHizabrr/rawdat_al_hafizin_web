/**
 * تواريخ التطبيق كنص YYYY-MM-DD حسب تقويم أم القرى (هجري).
 * أي قيمة ميلادية قديمة (سنة 1900–2199) تُحوَّل تلقائياً عند التطبيع.
 */

import {
  CalendarDate,
  IslamicUmalquraCalendar,
  fromDateToLocal,
  getLocalTimeZone,
  parseDate,
  toCalendar,
  toCalendarDate,
} from '@internationalized/date'

const HIJRI = new IslamicUmalquraCalendar()

/** @param {import('@internationalized/date').CalendarDate} cd */
export function formatHijriYmd(cd) {
  return `${String(cd.year).padStart(4, '0')}-${String(cd.month).padStart(2, '0')}-${String(cd.day).padStart(2, '0')}`
}

/** @returns {import('@internationalized/date').CalendarDate | null} */
export function parseHijriYmdString(s) {
  if (!s || typeof s !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  try {
    return new CalendarDate(HIJRI, y, mo, d)
  } catch {
    return null
  }
}

/** اليوم الحالي محلياً (هجري أم القرى) كنص YYYY-MM-DD */
export function localHijriYmd(date = new Date()) {
  const zl = fromDateToLocal(date)
  const gd = toCalendarDate(zl)
  const hd = toCalendar(gd, HIJRI)
  return formatHijriYmd(hd)
}

/**
 * يحوّل نص يوم (هجري صالح أو ميلادي مخزَّن قديماً) إلى منتصف النهار المحلي لاستخدام getDay() وDatePicker.
 * @returns {Date | null}
 */
export function hijriYmdToLocalNoonDate(ymd) {
  const h = parseHijriYmdString(ymd)
  if (!h) return null
  const d = h.toDate(getLocalTimeZone())
  d.setHours(12, 0, 0, 0)
  return d
}

/** ميلادي YYYY-MM-DD → هجري YYYY-MM-DD */
export function gregorianYmdStringToHijriYmd(ymdStr) {
  if (!ymdStr || typeof ymdStr !== 'string') return ''
  const g = parseDate(ymdStr.slice(0, 10))
  const h = toCalendar(g, HIJRI)
  return formatHijriYmd(h)
}

/**
 * تطبيع حقل يوم من التخزين: الميلادي القديم يُحوَّل هجرياً؛ والهجري الصالح يُعاد كما هو.
 * @param {unknown} v
 */
export function normalizeStoredCalendarDay(v) {
  if (v == null) return ''
  const str = String(v).trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return ''
  const y = Number(str.slice(0, 4))
  if (y >= 1900 && y <= 2199) return gregorianYmdStringToHijriYmd(str)
  return parseHijriYmdString(str) ? str : ''
}

/** @param {string} ymdStr */
export function nextHijriYmd(ymdStr) {
  const h = parseHijriYmdString(ymdStr)
  if (!h) return ymdStr
  return formatHijriYmd(h.add({ days: 1 }))
}

/** @param {string} ymdStr */
export function prevHijriYmd(ymdStr) {
  const h = parseHijriYmdString(ymdStr)
  if (!h) return ymdStr
  return formatHijriYmd(h.subtract({ days: 1 }))
}

/** طابع ISO من يوم هجري (منتصف النهار المحلي) */
export function isoFromHijriYmd(ymd) {
  if (!ymd || typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return new Date().toISOString()
  }
  const d = hijriYmdToLocalNoonDate(ymd.trim())
  if (!d || Number.isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}

/** @param {Record<string, unknown>} plan */
export function normalizePlanCalendarDays(plan) {
  if (!plan || typeof plan !== 'object') return plan
  const next = { ...plan }
  if (next.dateStart) next.dateStart = normalizeStoredCalendarDay(next.dateStart)
  if (next.dateEnd) next.dateEnd = normalizeStoredCalendarDay(next.dateEnd)
  return next
}

/** @param {Record<string, unknown>} dawra */
export function normalizeDawraCalendarDays(dawra) {
  if (!dawra || typeof dawra !== 'object') return dawra
  const next = { ...dawra }
  for (const k of ['registrationStart', 'registrationEnd', 'courseStart', 'courseEnd']) {
    if (next[k]) next[k] = normalizeStoredCalendarDay(next[k])
  }
  return next
}

/** دمج يوم هجري مع وقت محلي HH:mm */
export function combineHijriYmdAndHHmm(hijriYmd, hhmm) {
  const ymd = (hijriYmd && String(hijriYmd).trim()) || localHijriYmd()
  let base = hijriYmdToLocalNoonDate(ymd)
  if (!base || Number.isNaN(base.getTime())) base = hijriYmdToLocalNoonDate(localHijriYmd()) || new Date()
  const raw = (hhmm || '12:00').trim()
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw)
  if (!m) {
    base.setHours(12, 0, 0, 0)
    return base
  }
  base.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return base
}

export { HIJRI }
