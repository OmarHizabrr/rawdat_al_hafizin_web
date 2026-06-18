import { VOLUME_BY_ID } from '../data/volumes.js'
import { HALAKA_ATTENDANCE_STATUSES, formatTasmeeDuration } from './halakatStorage.js'
import { remoteTasmeeMediaLabelAr, remoteTasmeeProviderLabelAr } from './remoteTasmeeStorage.js'

function joinArabicWithWa(parts) {
  const list = (parts || []).filter(Boolean)
  if (!list.length) return '—'
  if (list.length === 1) return list[0]
  return list.reduce((acc, part, index) => (index === 0 ? part : `${acc} و${part}`))
}

/** توحيد شكل مجلدات الخطة من التخزين (مصفوفة معرفات، كائنات جزئية، …) */
export function normalizePlanVolumes(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') {
          const id = item.trim()
          if (!id) return null
          const vol = VOLUME_BY_ID[id]
          return vol
            ? { id, label: vol.label, pagesTarget: vol.pages, pagesMax: vol.pages }
            : { id, label: id, pagesTarget: 0, pagesMax: 0 }
        }
        if (!item || typeof item !== 'object') return null
        const id = String(item.id || item.volumeId || '').trim()
        const vol = id ? VOLUME_BY_ID[id] : null
        const label = String(item.label || vol?.label || id || '').trim()
        if (!label && !id) return null
        const pagesTarget = Math.max(
          0,
          Number(item.pagesTarget ?? item.pages ?? item.pagesMax ?? vol?.pages) || 0,
        )
        return {
          id: id || label,
          label: label || id,
          pagesTarget,
          pagesMax: Math.max(0, Number(item.pagesMax ?? vol?.pages ?? pagesTarget) || pagesTarget),
        }
      })
      .filter(Boolean)
  }
  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([key, val]) => {
        const id = String(key || '').trim()
        if (!id) return null
        if (val && typeof val === 'object') {
          return normalizePlanVolumes([{ id, ...val }])[0] || null
        }
        const vol = VOLUME_BY_ID[id]
        const pages = Math.max(0, Number(val) || 0)
        return vol
          ? { id, label: vol.label, pagesTarget: pages || vol.pages, pagesMax: vol.pages }
          : { id, label: id, pagesTarget: pages, pagesMax: pages }
      })
      .filter(Boolean)
  }
  return []
}

/** ملخص مجلدات الخطة كما تظهر في صفحة الخطط — المجلد الأول والثاني … */
export function formatPlanVolumesForReport(volumes) {
  const list = normalizePlanVolumes(volumes)
  if (!list.length) return '—'
  const parts = list.map((v) => {
    const id = String(v?.id || '').trim()
    const label = String(v?.label || VOLUME_BY_ID[id]?.label || id || '').trim() || '—'
    const pages = Math.max(0, Number(v?.pagesTarget) || 0)
    return pages > 0 ? `${label}: ${pages} صفحة` : label
  })
  return joinArabicWithWa(parts)
}

/** ملخص مجلدات خطط العضو (للتقارير الشاملة) */
export function formatMemberPlansVolumesForReport(plans) {
  const list = Array.isArray(plans) ? plans : []
  if (!list.length) return '—'
  return list
    .map((p) => {
      const name = String(p?.name || p?.id || '').trim() || 'خطة'
      const vols = formatPlanVolumesForReport(p?.volumes)
      return vols === '—' ? name : `${name}: ${vols}`
    })
    .join(' | ')
}

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

export function formatTasmeeDurationOrDash(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  return s > 0 ? formatTasmeeDuration(s) : '—'
}

export { formatTasmeeDuration }

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
    cols.push({ key: 'volumesSummary', label: 'المجلدات' })
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
    row.volumesSummary = formatPlanVolumesForReport(details?.volumes)
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
