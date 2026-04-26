import { parseHijriYmdString } from './hijriDates.js'

/** فرق أيام بين تاريخين هجريين YYYY-MM-DD (أم القرى)، شامل البداية والنهاية */
export function daysInclusiveYmd(startYmd, endYmd) {
  if (!startYmd || !endYmd || typeof startYmd !== 'string' || typeof endYmd !== 'string') return null
  const a = parseHijriYmdString(startYmd)
  const b = parseHijriYmdString(endYmd)
  if (!a || !b) return null
  if (a.compare(b) > 0) return null
  let n = 1
  let cur = a
  let guard = 0
  while (cur.compare(b) < 0 && guard < 4000) {
    cur = cur.add({ days: 1 })
    n += 1
    guard += 1
  }
  return n
}

/** مدة جلسة من وقتي HH:mm في نفس اليوم */
export function sessionDurationLabelAr(startHHmm, endHHmm) {
  if (!startHHmm || !endHHmm || typeof startHHmm !== 'string' || typeof endHHmm !== 'string') {
    return '—'
  }
  const m1 = /^(\d{1,2}):(\d{2})$/.exec(startHHmm.trim())
  const m2 = /^(\d{1,2}):(\d{2})$/.exec(endHHmm.trim())
  if (!m1 || !m2) return '—'
  const t1 = Number(m1[1]) * 60 + Number(m1[2])
  const t2 = Number(m2[1]) * 60 + Number(m2[2])
  let diff = t2 - t1
  if (diff <= 0) return 'تأكد أن وقت النهاية بعد البداية'
  if (diff > 12 * 60) return 'مدة مفتوحة (تتجاوز نصف يوم)'
  const h = Math.floor(diff / 60)
  const mm = diff % 60
  if (h && mm) return `${h} ساعة و${mm} دقيقة`
  if (h) return `${h} ساعة`
  return `${mm} دقيقة`
}

/** أكثر من 12 ساعة = نصف يوم: تُعرض المدة كـ «مفتوحة» في واجهة الحلقات */
const MS_HALF_DAY = 12 * 60 * 60 * 1000

/**
 * مدة الحلقة للعرض: إن تجاوزت نصف يوم تُوصف بأنها مفتوحة.
 * @param {Date} startDate
 * @param {Date} endDate
 */
export function halakaSessionDurationAr(startDate, endDate) {
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) return '—'
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '—'
  const ms = endDate.getTime() - startDate.getTime()
  if (ms <= 0) return 'تأكد أن نهاية الحلقة بعد بدايتها'
  if (ms > MS_HALF_DAY) return 'مدة مفتوحة (تتجاوز نصف يوم)'
  return durationBetweenDatesAr(startDate, endDate)
}

/** فرق دقيقتين بين تاريخين كاملين */
export function durationBetweenDatesAr(startDate, endDate) {
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) return '—'
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '—'
  const ms = endDate.getTime() - startDate.getTime()
  if (ms <= 0) return 'تأكد أن نهاية الحلقة بعد بدايتها'
  const mins = Math.round(ms / 60000)
  const h = Math.floor(mins / 60)
  const mm = mins % 60
  const days = Math.floor(h / 24)
  const hr = h % 24
  if (days > 0) {
    if (hr && mm) return `${days} يوم و${hr} ساعة و${mm} دقيقة`
    if (hr) return `${days} يوم و${hr} ساعة`
    if (mm) return `${days} يوم و${mm} دقيقة`
    return `${days} يوماً`
  }
  if (h && mm) return `${h} ساعة و${mm} دقيقة`
  if (h) return `${h} ساعة`
  return `${mm} دقيقة`
}

const dtFmt = /** @type {const} */ ({
  dateStyle: 'medium',
  timeStyle: 'short',
})

/**
 * عرض مواعيد الحلقة للبطاقات والاستكشاف (يدعم التخزين الجديد بتاريخ+وقت ISO والقديم بوقت فقط).
 * @param {Record<string, unknown>} h
 */
export function halakaSessionDisplay(h) {
  const isoStart = h?.sessionStartAt
  const isoEnd = h?.sessionEndAt
  if (isoStart && isoEnd) {
    const a = new Date(String(isoStart))
    const b = new Date(String(isoEnd))
    if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) {
      return {
        mode: 'datetime',
        startLabel: a.toLocaleString('ar-SA', dtFmt),
        endLabel: b.toLocaleString('ar-SA', dtFmt),
        durationLabel: halakaSessionDurationAr(a, b),
      }
    }
  }
  const st = h?.startTime
  const et = h?.endTime
  if (st || et) {
    return {
      mode: 'time',
      startLabel: st ? String(st) : '—',
      endLabel: et ? String(et) : '—',
      durationLabel: sessionDurationLabelAr(String(st || '00:00'), String(et || '00:00')),
    }
  }
  return null
}

/** افتراضي لحلقة جديدة: اليوم 18:00 → 20:00 */
export function defaultHalakaSessionDates() {
  const s = new Date()
  s.setSeconds(0, 0)
  s.setHours(18, 0, 0, 0)
  const e = new Date()
  e.setSeconds(0, 0)
  e.setHours(20, 0, 0, 0)
  return { sessionStart: s, sessionEnd: e }
}
