import { HALAKA_ATTENDANCE_STATUSES } from './halakatStorage.js'
import { remoteTasmeeMediaLabelAr, remoteTasmeeProviderLabelAr } from './remoteTasmeeStorage.js'

export function reportVisibilityLabel(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'public') return 'عام'
  if (v === 'private') return 'خاص'
  return value ? String(value) : '—'
}

export function reportSessionStatusLabel(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'closed') return 'مغلقة'
  if (v === 'open') return 'مفتوحة'
  return value ? String(value) : '—'
}

export function reportAttendanceStatusLabel(status) {
  const s = String(status || '').trim()
  if (s === HALAKA_ATTENDANCE_STATUSES.PRESENT) return 'حاضر'
  if (s === HALAKA_ATTENDANCE_STATUSES.ABSENT) return 'غائب'
  if (s === HALAKA_ATTENDANCE_STATUSES.EXCUSED) return 'غياب بعذر'
  if (s === HALAKA_ATTENDANCE_STATUSES.PERMITTED) return 'مستأذن'
  if (s === HALAKA_ATTENDANCE_STATUSES.LATE) return 'متأخر'
  if (s === HALAKA_ATTENDANCE_STATUSES.OTHER) return 'أخرى'
  return s || '—'
}

const NOTIFICATION_TYPE_LABELS = {
  application_submitted: 'طلب التحاق',
  application_approved: 'قبول التحاق',
  application_rejected: 'رفض التحاق',
  general: 'إشعار عام',
  reminder: 'تذكير',
  announcement: 'إعلان',
}

export function reportNotificationTypeLabel(value) {
  const key = String(value || '').trim().toLowerCase()
  return NOTIFICATION_TYPE_LABELS[key] || (value ? String(value) : '—')
}

export function reportProviderLabel(value) {
  const v = String(value || '').trim()
  if (!v) return '—'
  try {
    return remoteTasmeeProviderLabelAr(v) || v
  } catch {
    return v
  }
}

export function reportMediaTypeLabel(value) {
  const v = String(value || '').trim()
  if (!v) return '—'
  try {
    return remoteTasmeeMediaLabelAr(v) || v
  } catch {
    return v
  }
}

/** يعرض الاسم فقط — لا يُظهر معرف المستخدم البرمجي */
export function reportPersonLabel(displayName, userId) {
  const name = String(displayName || '').trim()
  const uid = String(userId || '').trim()
  if (name && name !== uid) return name
  if (name) return name
  return '—'
}

export function entityDetailsColumnsForKind(kind, showOwner) {
  const cols = [
    { key: 'name', label: 'الاسم' },
    { key: 'visibilityLabel', label: 'الظهور' },
  ]
  if (showOwner) cols.push({ key: 'ownerName', label: 'المسؤول' })
  if (kind === 'plan') {
    cols.push({ key: 'dailyPages', label: 'الورد اليومي (ص)' })
    cols.push({ key: 'totalTargetPages', label: 'إجمالي الهدف (ص)' })
  }
  if (kind === 'activity' || kind === 'exam' || kind === 'dawra') {
    cols.push({ key: 'startAt', label: 'البداية' })
    cols.push({ key: 'endAt', label: 'النهاية' })
    cols.push({ key: 'location', label: 'الموقع' })
  }
  if (kind === 'halaka') {
    cols.push({ key: 'location', label: 'الموقع' })
  }
  if (kind === 'remote_tasmee') {
    cols.push({ key: 'providerLabel', label: 'المزوّد' })
    cols.push({ key: 'mediaTypeLabel', label: 'نوع البث' })
    cols.push({ key: 'meetingUrl', label: 'رابط الاجتماع' })
  }
  cols.push({ key: 'createdAt', label: 'تاريخ الإنشاء' })
  cols.push({ key: 'updatedAt', label: 'آخر تحديث' })
  return cols
}

export function formatEntityDetailsForReport(details, kind, { ownerName = '', formatDate } = {}) {
  const fmt = formatDate || ((v) => (v ? String(v) : '—'))
  const row = {
    name: details?.name || '—',
    visibilityLabel: reportVisibilityLabel(details?.visibility),
    createdAt: fmt(details?.createdAt),
    updatedAt: fmt(details?.updatedAt),
  }
  if (ownerName) row.ownerName = ownerName
  if (kind === 'plan') {
    row.dailyPages = details?.dailyPages ?? '—'
    row.totalTargetPages = details?.totalTargetPages ?? '—'
  }
  if (kind === 'activity' || kind === 'exam' || kind === 'dawra') {
    row.startAt = fmt(details?.startAt)
    row.endAt = fmt(details?.endAt)
    row.location = details?.location || '—'
  }
  if (kind === 'halaka') {
    row.location = details?.location || '—'
  }
  if (kind === 'remote_tasmee') {
    row.providerLabel = reportProviderLabel(details?.provider)
    row.mediaTypeLabel = reportMediaTypeLabel(details?.mediaType)
    row.meetingUrl = details?.location || '—'
  }
  return row
}
