export const EXAM_SELF_REPORT_OPTIONS = [
  { value: 'registered', label: 'سجّل في المجموعة' },
  { value: 'preparing', label: 'يُجهّز للاختبار' },
  { value: 'completed', label: 'أتمّ الاختبار' },
]

export const EXAM_SELF_REPORT_ORDER = ['registered', 'preparing', 'completed']

export function examSelfReportStatusLabel(value) {
  const hit = EXAM_SELF_REPORT_OPTIONS.find((o) => o.value === value)
  return hit?.label || 'لم يُحدّد بعد'
}

export function examSelfReportStepIndex(value) {
  const v = String(value || '').trim()
  const idx = EXAM_SELF_REPORT_ORDER.indexOf(v)
  return idx >= 0 ? idx : -1
}
