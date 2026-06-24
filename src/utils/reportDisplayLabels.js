import { VOLUME_BY_ID } from '../data/volumes.js'
import { HALAKA_ATTENDANCE_STATUSES, formatTasmeeDuration } from './halakatStorage.js'
import { halakaSessionDisplay, halakaSessionDurationAr } from './datePeriodAr.js'
import { hijriYmdToLocalNoonDate } from './hijriDates.js'
import { remoteTasmeeMediaLabelAr, remoteTasmeeProviderLabelAr } from './remoteTasmeeStorage.js'

const HIJRI_WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

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
  if (s === 'not_recorded') return 'لم يُسجَّل'
  if (s === 'excluded') return 'مستثنى من الجلسة'
  return s || '—'
}

/** مفاتيح حالات الحضور للتنسيق في الجداول */
export function normalizeHalakaAttendanceStatusKey(status, { excluded = false, notRecorded = false } = {}) {
  if (notRecorded) return 'not_recorded'
  if (excluded) return 'excluded'
  const s = String(status || '').trim() || HALAKA_ATTENDANCE_STATUSES.PRESENT
  if (Object.values(HALAKA_ATTENDANCE_STATUSES).includes(s)) return s
  return HALAKA_ATTENDANCE_STATUSES.OTHER
}

export const HALAKA_ATTENDANCE_STATUS_LEGEND =
  'حاضر · غائب · متأخر · غياب بعذر · مستأذن · مستثنى · لم يُسجَّل'

export function formatHalakaAttendanceDisplay(row) {
  const notRecorded = !row || row.attendanceStatus === 'not_recorded'
  return {
    attendanceStatusKey: normalizeHalakaAttendanceStatusKey(row?.attendanceStatus, {
      excluded: Boolean(row?.excludedFromSession),
      notRecorded,
    }),
    attendanceStatusLabel: reportHalakaStudentSessionStatusLabel(row),
  }
}

export function formatHalakaVolumeLabel(volumeId) {
  const id = String(volumeId || '').trim()
  if (!id) return '—'
  return VOLUME_BY_ID[id]?.label || id
}

export function formatHalakaMemorizationRange(fromPage, toPage, pagesCount) {
  const fp = Number(fromPage)
  const tp = Number(toPage)
  if (Number.isFinite(fp) && Number.isFinite(tp) && tp >= fp) {
    return `${fp}–${tp} (${tp - fp + 1} صفحة)`
  }
  const pages = Math.max(0, Number(pagesCount) || 0)
  return pages > 0 ? `${pages} صفحة` : '—'
}

/** ملخص دفعات الحفظ في جلسة واحدة (للتقارير) */
export function formatHalakaEntryHistoryForReport(entryHistory) {
  const entries = Array.isArray(entryHistory) ? entryHistory.filter(Boolean) : []
  if (!entries.length) return '—'
  return entries
    .map((entry) => {
      const vol = formatHalakaVolumeLabel(entry.memorizationVolumeId)
      const range = formatHalakaMemorizationRange(entry.fromPage, entry.toPage, entry.pagesCount)
      const notes = String(entry.notes || '').trim()
      const parts = [vol !== '—' ? vol : '', range !== '—' ? range : ''].filter(Boolean)
      const base = parts.length ? parts.join(' — ') : '—'
      return notes ? `${base} (${notes})` : base
    })
    .join(' | ')
}

export function reportHalakaStudentSessionStatusLabel(row) {
  if (!row || row.attendanceStatus === 'not_recorded') return 'لم يُسجَّل'
  if (row.excludedFromSession) return 'مستثنى من الجلسة'
  const status =
    String(row.attendanceStatus || '').trim() || HALAKA_ATTENDANCE_STATUSES.PRESENT
  return reportAttendanceStatusLabel(status)
}

export function formatHalakaWeekdaysLabel(weekdays) {
  const arr = Array.isArray(weekdays) ? weekdays : []
  if (!arr.length || arr.length >= 7) return 'كل الأيام'
  return [...arr]
    .sort((a, b) => a - b)
    .map((d) => HIJRI_WEEKDAY_NAMES[d] || d)
    .join('، ')
}

export function formatHalakaSessionWeekdayLabel(sessionDayYmd) {
  const ymd = String(sessionDayYmd || '').trim()
  if (!ymd) return '—'
  const d = hijriYmdToLocalNoonDate(ymd)
  if (!d || Number.isNaN(d.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { weekday: 'long' }).format(d)
  } catch {
    return '—'
  }
}

export function formatHalakaSessionHijriDateLabel(sessionDayYmd) {
  const ymd = String(sessionDayYmd || '').trim()
  if (!ymd) return '—'
  const d = hijriYmdToLocalNoonDate(ymd)
  if (!d || Number.isNaN(d.getTime())) return ymd
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return ymd
  }
}

export function formatReportSessionDurationFromIso(startedAt, endedAt) {
  const a = new Date(String(startedAt || ''))
  const b = new Date(String(endedAt || ''))
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '—'
  return halakaSessionDurationAr(a, b)
}

function parseMemorizationPages(fromPage, toPage, pagesCount) {
  const fp = Number(fromPage)
  const tp = Number(toPage)
  const pages = Math.max(0, Number(pagesCount) || 0)
  if (Number.isFinite(fp) && Number.isFinite(tp) && tp >= fp) {
    return { fromPage: fp, toPage: tp, pagesCount: pages > 0 ? pages : tp - fp + 1 }
  }
  if (pages > 0) return { fromPage: null, toPage: null, pagesCount: pages }
  return { fromPage: null, toPage: null, pagesCount: 0 }
}

/** سطور الحفظ/التسميع لطالب في جلسة — دفعة لكل سجل في entryHistory */
export function listHalakaMemorizationLines(attendanceRow) {
  if (!attendanceRow) return []
  const entries = Array.isArray(attendanceRow.entryHistory)
    ? attendanceRow.entryHistory.filter((e) => e && (e.memorizationVolumeId || e.fromPage != null || e.toPage != null))
    : []
  if (entries.length) {
    return entries.map((entry, index) => {
      const pages = parseMemorizationPages(entry.fromPage, entry.toPage, entry.pagesCount)
      return {
        batchLabel: entries.length > 1 ? `${index + 1}/${entries.length}` : '',
        memorizationVolumeLabel: formatHalakaVolumeLabel(
          entry.memorizationVolumeId || attendanceRow.memorizationVolumeId,
        ),
        fromPage: pages.fromPage,
        toPage: pages.toPage,
        pagesCount: pages.pagesCount,
        notes: String(entry.notes || '').trim(),
      }
    })
  }
  const pages = parseMemorizationPages(
    attendanceRow.fromPage,
    attendanceRow.toPage,
    attendanceRow.pagesCount,
  )
  const vol = formatHalakaVolumeLabel(attendanceRow.memorizationVolumeId)
  const hasMem =
    vol !== '—' || pages.pagesCount > 0 || pages.fromPage != null || pages.toPage != null
  if (!hasMem) return []
  return [
    {
      batchLabel: '',
      memorizationVolumeLabel: vol,
      fromPage: pages.fromPage,
      toPage: pages.toPage,
      pagesCount: pages.pagesCount,
      notes: String(attendanceRow.notes || '').trim(),
    },
  ]
}

export const HALAKA_SESSION_STUDENT_TABLE_COLUMNS = [
  { key: 'sessionTitle', label: 'الجلسة' },
  { key: 'sessionWeekdayLabel', label: 'اليوم' },
  { key: 'sessionDateLabel', label: 'التاريخ' },
  { key: 'sessionStartedAt', label: 'البداية' },
  { key: 'sessionEndedAt', label: 'النهاية' },
  { key: 'sessionDurationLabel', label: 'المدة' },
  { key: 'sessionTasmeeLabel', label: 'تسميع الجلسة' },
  { key: 'userName', label: 'الطالب' },
  { key: 'attendanceStatusLabel', label: 'حالة الحضور' },
  { key: 'batchLabel', label: 'الدفعة' },
  { key: 'memorizationVolumeLabel', label: 'المجلد' },
  { key: 'fromPage', label: 'من صفحة' },
  { key: 'toPage', label: 'إلى صفحة' },
  { key: 'pagesCount', label: 'عدد الصفحات' },
  { key: 'tasmeeLabel', label: 'تسميع الطالب' },
  { key: 'notes', label: 'الملاحظات' },
]

export function formatHalakaSessionStudentRowsForDisplay(rows, { formatDateTime } = {}) {
  const fmt = formatDateTime || ((v) => (v ? String(v) : '—'))
  const dash = (v) => (v == null || v === '' ? '—' : String(v))
  return (rows || []).map((r) => {
    const attendance = formatHalakaAttendanceDisplay(r)
    return {
      sessionTitle: r.sessionTitle || '—',
      sessionWeekdayLabel: r.sessionWeekdayLabel || '—',
      sessionDateLabel: r.sessionDateLabel || '—',
      sessionStartedAt: fmt(r.sessionStartedAt),
      sessionEndedAt: fmt(r.sessionEndedAt),
      sessionDurationLabel: r.sessionDurationLabel || '—',
      sessionTasmeeLabel: r.sessionTasmeeLabel || '—',
      userName: reportPersonLabel(r.userName, r.userId),
      ...attendance,
      batchLabel: dash(r.batchLabel),
      memorizationVolumeLabel: r.memorizationVolumeLabel || '—',
      fromPage: dash(r.fromPage),
      toPage: dash(r.toPage),
      pagesCount: r.pagesCount > 0 ? r.pagesCount : '—',
      tasmeeLabel: r.tasmeeLabel || '—',
      notes: r.notes || '—',
    }
  })
}

export function buildHalakaReportHeaderItems(reportData) {
  const d = reportData?.entityDetails || {}
  const e = reportData?.entity || {}
  const schedule = halakaSessionDisplay({ ...e, ...d })
  const items = [
    { label: 'اسم الحلقة', value: d.name || e.name || '—' },
    { label: 'الرمز', value: d.id || e.id || '—' },
    { label: 'المكان', value: d.location || '—' },
    { label: 'النوع', value: d.genderLabel || '—' },
    { label: 'الظهور', value: reportVisibilityLabel(d.visibility) },
  ]
  if (d.description) items.push({ label: 'الوصف', value: d.description })
  if (schedule) {
    items.push({ label: 'موعد الحلقة', value: `${schedule.startLabel} — ${schedule.endLabel}` })
    items.push({ label: 'مدة الموعد', value: schedule.durationLabel || '—' })
  }
  if (d.tasmeeWeekdaysLabel) items.push({ label: 'أيام التسميع', value: d.tasmeeWeekdaysLabel })
  if (d.reviewWeekdaysLabel) items.push({ label: 'أيام المراجعة', value: d.reviewWeekdaysLabel })
  if (d.ownerName) items.push({ label: 'المسؤول', value: d.ownerName })
  const summary = reportData?.summary
  if (summary) {
    items.push({ label: 'عدد الأعضاء', value: summary.members ?? 0 })
    items.push({ label: 'عدد الجلسات', value: summary.sessions ?? 0 })
    items.push({ label: 'سجلات الحضور', value: summary.attendance ?? 0 })
  }
  items.push({ label: 'حالات الحضور في الجدول', value: HALAKA_ATTENDANCE_STATUS_LEGEND })
  return items
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
