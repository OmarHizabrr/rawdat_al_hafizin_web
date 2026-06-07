/**
 * رابط صفحة تقرير إنجاز الطالب (مع ?uid= للمعاينة نيابة).
 */
export function studentProgressLink(uid) {
  if (!uid) return '/app/student-progress'
  return `/app/student-progress?uid=${encodeURIComponent(uid)}`
}
