/** @param {string} ymd */
export function parseYmdToLocalNoon(ymd) {
  if (!ymd || typeof ymd !== 'string') return null
  const d = new Date(`${ymd.trim()}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** @param {Date} d */
export function formatYmd(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** @param {string} hhmm */
export function hhmmToTodayDate(hhmm) {
  const raw = (hhmm || '12:00').trim()
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw)
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
