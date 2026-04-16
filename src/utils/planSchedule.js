/** عدد الأيام ضمن الفترة (شامل) مع تصفية أيام الأسبوع إن وُجدت */
export function countDaysInRange(startStr, endStr, weekdayFilter) {
  if (!startStr || !endStr) return 0
  const start = parseLocalDate(startStr)
  const end = parseLocalDate(endStr)
  if (!start || !end || end < start) return 0

  const useFilter = Array.isArray(weekdayFilter) && weekdayFilter.length > 0 && weekdayFilter.length < 7
  const allow = useFilter ? new Set(weekdayFilter) : null

  let n = 0
  const d = new Date(start)
  while (d <= end) {
    const wd = d.getDay()
    if (!allow || allow.has(wd)) n++
    d.setDate(d.getDate() + 1)
  }
  return n
}

function parseLocalDate(ymd) {
  const [y, m, day] = ymd.split('-').map(Number)
  if (!y || !m || !day) return null
  return new Date(y, m - 1, day, 12, 0, 0)
}

export function sessionsNeeded(totalPages, dailyPages) {
  if (!totalPages || totalPages <= 0) return 0
  if (!dailyPages || dailyPages <= 0) return Infinity
  return Math.ceil(totalPages / dailyPages)
}
