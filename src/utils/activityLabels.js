/** تسميات أنواع الأنشطة وأشكالها والجمهور — مصدر واحد لصفحة الأنشطة واستكشافها. */

export const ACTIVITY_KIND_OPTIONS = [
  { value: 'lecture', label: 'محاضرة' },
  { value: 'workshop', label: 'ورشة عمل' },
  { value: 'competition', label: 'مسابقة' },
  { value: 'trip', label: 'رحلة / زيارة' },
  { value: 'ceremony', label: 'حفل / تكريم' },
  { value: 'sports', label: 'نشاط رياضي' },
  { value: 'charity', label: 'عمل تطوعي / خيري' },
  { value: 'review', label: 'مراجعة / لقاء دراسي' },
  { value: 'other', label: 'أخرى' },
]

export const ACTIVITY_AUDIENCE_OPTIONS = [
  { value: 'students', label: 'طلاب' },
  { value: 'teachers', label: 'معلمون' },
  { value: 'staff', label: 'منسوبو المؤسسة' },
  { value: 'families', label: 'عائلات' },
  { value: 'public', label: 'عام' },
]

const FORMAT_SHORT = {
  onsite: 'حضوري',
  online: 'عن بُعد',
  hybrid: 'مختلط',
}

const FORMAT_LONG = {
  onsite: 'حضوري',
  online: 'عن بُعد',
  hybrid: 'مختلط (حضوري وعن بُعد)',
}

/** @param {'short' | 'long'} [variant] */
export function activityFormatLabel(value, variant = 'long') {
  const m = variant === 'short' ? FORMAT_SHORT : FORMAT_LONG
  const v = String(value || '').trim()
  return m[v] || v || '—'
}

export function activityKindLabel(value) {
  const v = String(value || '').trim()
  return ACTIVITY_KIND_OPTIONS.find((o) => o.value === v)?.label || v || '—'
}

export function activityAudienceLabel(value) {
  const v = String(value || '').trim()
  return ACTIVITY_AUDIENCE_OPTIONS.find((o) => o.value === v)?.label || v || '—'
}

/** يدعم سلسلة ISO أو كائن Timestamp من Firestore */
export function formatActivityDateTimeAr(value) {
  if (value == null || value === '') return ''
  let d
  if (typeof value.toDate === 'function') {
    d = value.toDate()
  } else if (typeof value.toMillis === 'function') {
    d = new Date(value.toMillis())
  } else {
    d = new Date(String(value))
  }
  if (!d || Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
}

/** سطر مختصر لحقول الإنشاء/التحديث في البطاقات */
export function formatActivityFirestoreMetaAr(value) {
  if (value == null || value === '') return '—'
  let d
  if (typeof value.toDate === 'function') {
    d = value.toDate()
  } else if (typeof value.toMillis === 'function') {
    d = new Date(value.toMillis())
  } else {
    d = new Date(String(value))
  }
  if (!d || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })
}

export function activityMemberCountBadge(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  if (n === 0) return 'لا أعضاء بعد'
  if (n === 1) return 'عضو واحد'
  return `${n} أعضاء`
}
