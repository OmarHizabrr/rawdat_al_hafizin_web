import { formatHijriYmd, hijriYmdToLocalNoonDate, parseHijriYmdString } from './hijriDates.js'

/** عدد الأيام ضمن الفترة الهجرية (شامل) مع تصفية أيام الأسبوع المحلية إن وُجدت */
export function countDaysInRange(startStr, endStr, weekdayFilter) {
  if (!startStr || !endStr) return 0
  const start = parseHijriYmdString(startStr)
  const end = parseHijriYmdString(endStr)
  if (!start || !end || start.compare(end) > 0) return 0

  const useFilter = Array.isArray(weekdayFilter) && weekdayFilter.length > 0 && weekdayFilter.length < 7
  const allow = useFilter ? new Set(weekdayFilter) : null

  let n = 0
  let cur = start
  let guard = 0
  while (cur.compare(end) <= 0 && guard < 4000) {
    const noon = hijriYmdToLocalNoonDate(formatHijriYmd(cur))
    const wd = noon && !Number.isNaN(noon.getTime()) ? noon.getDay() : 0
    if (!allow || allow.has(wd)) n++
    cur = cur.add({ days: 1 })
    guard += 1
  }
  return n
}

export function sessionsNeeded(totalPages, dailyPages) {
  if (!totalPages || totalPages <= 0) return 0
  if (!dailyPages || dailyPages <= 0) return Infinity
  return Math.ceil(totalPages / dailyPages)
}

/** ورد يومي مقترح لملء فترة بعدد أيام جدولة معلوم (تقريب لأعلى) */
export function dailyPagesForScheduleDays(totalPages, daysInPeriod) {
  if (!totalPages || totalPages <= 0) return 1
  if (!daysInPeriod || daysInPeriod <= 0) return null
  return Math.max(1, Math.ceil(totalPages / daysInPeriod))
}
