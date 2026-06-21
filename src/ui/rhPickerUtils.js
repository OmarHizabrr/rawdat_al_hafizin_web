import { hijriYmdToLocalNoonDate, localHijriYmd } from '../utils/hijriDates.js'

/** @param {string} ymd هجري YYYY-MM-DD */
export function parseYmdToLocalNoon(ymd) {
  return hijriYmdToLocalNoonDate(ymd)
}

/** @param {Date} d */
export function formatYmd(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  return localHijriYmd(d)
}

/** @param {string} hhmm */
export function hhmmToTodayDate(hhmm) {
  if (hhmm instanceof Date && !Number.isNaN(hhmm.getTime())) return hhmm
  const raw = typeof hhmm === 'string' ? hhmm.trim() : ''
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw || '12:00')
  const d = new Date()
  if (!m) {
    d.setHours(12, 0, 0, 0)
    return d
  }
  d.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return d
}

/** @param {Date} d */
export function dateToHHmm(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
