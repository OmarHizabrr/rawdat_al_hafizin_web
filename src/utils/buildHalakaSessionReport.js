import { VOLUME_BY_ID } from '../data/volumes.js'
import {
  HALAKA_ATTENDANCE_STATUSES,
  HALAKA_MEMBER_ROLES,
  HALAKA_SESSION_TYPES,
  formatHalakaSessionDayLabel,
  formatTasmeeDuration,
  summarizeHalakaSessionAttendance,
} from './halakatStorage.js'
import { formatDateTimeMedium12Ar } from './formatDateTimeAr.js'
import {
  formatHalakaMemorizationRange,
  formatHalakaSessionHijriDateLabel,
  formatHalakaSessionWeekdayLabel,
  formatHalakaVolumeLabel,
  formatReportSessionDurationFromIso,
  reportHalakaStudentSessionStatusLabel,
} from './reportDisplayLabels.js'

function sessionTypeLabelAr(t, other) {
  if (t === HALAKA_SESSION_TYPES.MEMORIZATION) return 'حفظ'
  if (t === HALAKA_SESSION_TYPES.REVIEW) return 'مراجعة'
  if (t === HALAKA_SESSION_TYPES.CONSOLIDATION) return 'تثبيت'
  if (t === HALAKA_SESSION_TYPES.READING) return 'قراءة'
  return other?.trim() ? `أخرى: ${other}` : 'أخرى'
}

export function entryPagesCount(h) {
  const pages = Math.max(0, Number(h?.pagesCount) || 0)
  if (pages > 0) return pages
  const fp = Number(h?.fromPage)
  const tp = Number(h?.toPage)
  if (Number.isFinite(fp) && Number.isFinite(tp) && tp >= fp) return tp - fp + 1
  return 0
}

function formatRecordedAt(iso) {
  const t = Date.parse(String(iso || ''))
  return Number.isFinite(t) ? formatDateTimeMedium12Ar(new Date(t)) : '—'
}

/**
 * @param {{ halaka?: object, session?: object, attendanceRows?: object[] }} input
 */
export function buildHalakaSessionReportData({ halaka, session, attendanceRows = [] }) {
  const sessionDayYmd = String(session?.sessionDayYmd || '').trim()
  const students = attendanceRows.filter((r) => r.role === HALAKA_MEMBER_ROLES.STUDENT)
  const activeStudents = students.filter((r) => !r.excludedFromSession)

  const memberRows = attendanceRows.map((r) => ({ userId: r.userId, role: r.role }))
  const attRows = attendanceRows.map((r) => ({
    userId: r.userId,
    attendanceStatus: r.attendanceStatus,
    excludedFromSession: r.excludedFromSession,
  }))
  const attSummary = summarizeHalakaSessionAttendance(memberRows, attRows)

  let totalEntries = 0
  let totalPages = 0
  let studentsWithEntries = 0
  let totalTasmeeSeconds = 0
  const volumeMap = new Map()
  const entriesChronological = []

  for (const row of activeStudents) {
    const history = Array.isArray(row.entryHistory) ? row.entryHistory : []
    const rowPages = history.reduce((sum, h) => sum + entryPagesCount(h), 0)
    totalTasmeeSeconds += Math.max(0, Number(row.tasmeeSeconds) || 0)
    if (history.length > 0) studentsWithEntries += 1
    totalEntries += history.length
    totalPages += rowPages

    for (const h of history) {
      const volId = String(h.memorizationVolumeId || '').trim()
      const pages = entryPagesCount(h)
      if (volId) {
        const cur = volumeMap.get(volId) || { pages: 0, entries: 0, students: new Set() }
        cur.pages += pages
        cur.entries += 1
        cur.students.add(row.userId)
        volumeMap.set(volId, cur)
      }
      entriesChronological.push({
        id: h.id,
        userId: row.userId,
        displayName: row.displayName || row.userId,
        attendanceStatus: row.attendanceStatus,
        memorizationVolumeId: volId,
        volumeLabel: formatHalakaVolumeLabel(volId),
        rangeLabel: formatHalakaMemorizationRange(h.fromPage, h.toPage, h.pagesCount),
        fromPage: h.fromPage,
        toPage: h.toPage,
        pagesCount: pages,
        notes: String(h.notes || '').trim(),
        recordedAt: h.recordedAt,
        recordedAtLabel: formatRecordedAt(h.recordedAt),
      })
    }
  }

  entriesChronological.sort(
    (a, b) => Date.parse(String(b.recordedAt || '')) - Date.parse(String(a.recordedAt || '')),
  )

  const volumeStats = [...volumeMap.entries()]
    .map(([volId, stats]) => ({
      volId,
      label: VOLUME_BY_ID[volId]?.label || formatHalakaVolumeLabel(volId),
      pages: stats.pages,
      entries: stats.entries,
      studentsCount: stats.students.size,
      percent: totalPages > 0 ? Math.round((stats.pages / totalPages) * 100) : 0,
    }))
    .sort((a, b) => b.pages - a.pages || a.label.localeCompare(b.label, 'ar'))

  const studentReports = activeStudents
    .map((row) => {
      const history = Array.isArray(row.entryHistory) ? row.entryHistory : []
      const pagesTotal = history.reduce((sum, h) => sum + entryPagesCount(h), 0)
      return {
        userId: row.userId,
        displayName: row.displayName || row.userId,
        attendanceStatus: row.attendanceStatus,
        attendanceLabel: reportHalakaStudentSessionStatusLabel(row),
        entriesCount: history.length,
        pagesTotal,
        tasmeeLabel: formatTasmeeDuration(Math.max(0, Number(row.tasmeeSeconds) || 0)),
        entries: [...history]
          .map((h) => ({
            id: h.id,
            volumeLabel: formatHalakaVolumeLabel(h.memorizationVolumeId),
            rangeLabel: formatHalakaMemorizationRange(h.fromPage, h.toPage, h.pagesCount),
            pagesCount: entryPagesCount(h),
            notes: String(h.notes || '').trim(),
            recordedAtLabel: formatRecordedAt(h.recordedAt),
          }))
          .reverse(),
      }
    })
    .sort((a, b) => b.pagesTotal - a.pagesTotal || b.entriesCount - a.entriesCount || a.displayName.localeCompare(b.displayName, 'ar'))

  const studentsWithoutEntries = Math.max(0, activeStudents.length - studentsWithEntries)
  const recordPercent =
    activeStudents.length > 0 ? Math.round((studentsWithEntries / activeStudents.length) * 100) : 0
  const avgPages =
    studentsWithEntries > 0 ? (totalPages / studentsWithEntries).toFixed(1) : '0'

  const sessionTasmeeSeconds = Math.max(0, Number(session?.tasmeeTotalSeconds) || 0)

  const title = session?.title?.trim() || 'تقرير جلسة الحلقة'
  const halakaName = halaka?.name || halaka?.title || 'الحلقة'

  const meta = [
    { label: 'الحلقة', value: halakaName },
    { label: 'عنوان الجلسة', value: session?.title?.trim() || '—' },
    { label: 'يوم الجلسة', value: sessionDayYmd ? formatHalakaSessionDayLabel(sessionDayYmd) : '—' },
    { label: 'اليوم', value: formatHalakaSessionWeekdayLabel(sessionDayYmd) },
    { label: 'التاريخ الهجري', value: formatHalakaSessionHijriDateLabel(sessionDayYmd) },
    {
      label: 'نوع الجلسة',
      value: sessionTypeLabelAr(session?.sessionType, session?.sessionTypeOtherLabel),
    },
    { label: 'بداية الجلسة', value: formatRecordedAt(session?.startedAt) },
    { label: 'نهاية الجلسة', value: formatRecordedAt(session?.endedAt) },
    {
      label: 'مدة الجلسة',
      value: formatReportSessionDurationFromIso(session?.startedAt, session?.endedAt),
    },
    { label: 'وقت تسميع الجلسة', value: formatTasmeeDuration(sessionTasmeeSeconds) },
  ]

  const kpis = [
    { label: 'طلاب الحلقة', value: attSummary.studentCount || activeStudents.length },
    { label: 'حاضر', value: attSummary.present },
    { label: 'غائب', value: attSummary.absent },
    { label: 'بعذر', value: attSummary.excused },
    { label: 'متأخر', value: attSummary.late },
    { label: 'مستثنى', value: attSummary.excluded },
    { label: 'سجّلوا حفظاً', value: `${studentsWithEntries} (${recordPercent}%)` },
    { label: 'بدون تسجيل', value: studentsWithoutEntries },
    { label: 'دفعات الحفظ', value: totalEntries },
    { label: 'إجمالي الصفحات', value: totalPages },
    { label: 'متوسط الصفحات/طالب', value: avgPages },
    { label: 'وقت تسميع الطلاب', value: formatTasmeeDuration(totalTasmeeSeconds) },
  ]

  const executiveSummary = {
    paragraphs: [
      `جلسة «${session?.title?.trim() || 'بدون عنوان'}» في حلقة «${halakaName}» — ${sessionDayYmd ? formatHalakaSessionDayLabel(sessionDayYmd) : 'تاريخ غير محدد'}.`,
      totalEntries > 0
        ? `تم تسجيل ${totalEntries} دفعة حفظ بإجمالي ${totalPages} صفحة لـ ${studentsWithEntries} من ${activeStudents.length} طالب (${recordPercent}%).`
        : `لم يُسجَّل حفظ في هذه الجلسة بعد${activeStudents.length ? ` من بين ${activeStudents.length} طالب` : ''}.`,
      volumeStats.length
        ? `أكثر المجلدات حفظاً: ${volumeStats
            .slice(0, 3)
            .map((v) => `${v.label} (${v.pages} ص)`)
            .join('، ')}.`
        : '',
    ].filter(Boolean),
    highlights: [
      { label: 'الحضور', value: `${attSummary.present} حاضر · ${attSummary.absent} غائب` },
      { label: 'دفعات الحفظ', value: totalEntries },
      { label: 'الصفحات', value: totalPages },
      { label: 'تسميع الجلسة', value: formatTasmeeDuration(sessionTasmeeSeconds) },
    ],
  }

  const printSections = [
    {
      title: 'سجل تسجيلات الحفظ (تفصيلي)',
      pageOrientation: 'landscape',
      columns: [
        { key: 'displayName', label: 'الطالب' },
        { key: 'attendanceLabel', label: 'الحضور' },
        { key: 'volumeLabel', label: 'المجلد' },
        { key: 'rangeLabel', label: 'النطاق' },
        { key: 'pagesCount', label: 'الصفحات' },
        { key: 'recordedAtLabel', label: 'وقت التسجيل' },
        { key: 'notes', label: 'ملاحظات' },
      ],
      rows: entriesChronological.map((e) => ({
        displayName: e.displayName,
        attendanceLabel: reportHalakaStudentSessionStatusLabel({
          attendanceStatus: e.attendanceStatus,
          excludedFromSession: false,
        }),
        volumeLabel: e.volumeLabel,
        rangeLabel: e.rangeLabel,
        pagesCount: e.pagesCount || '—',
        recordedAtLabel: e.recordedAtLabel,
        notes: e.notes || '—',
      })),
    },
    {
      title: 'ملخص حسب الطالب',
      columns: [
        { key: 'displayName', label: 'الطالب' },
        { key: 'attendanceLabel', label: 'الحضور' },
        { key: 'entriesCount', label: 'عدد الدفعات' },
        { key: 'pagesTotal', label: 'إجمالي الصفحات' },
        { key: 'tasmeeLabel', label: 'وقت التسميع' },
        { key: 'entriesSummary', label: 'تفاصيل الدفعات' },
      ],
      rows: studentReports.map((s) => ({
        displayName: s.displayName,
        attendanceLabel: s.attendanceLabel,
        entriesCount: s.entriesCount,
        pagesTotal: s.pagesTotal,
        tasmeeLabel: s.tasmeeLabel,
        entriesSummary:
          s.entries.length > 0
            ? s.entries
                .map((e) => `${e.volumeLabel} ${e.rangeLabel}${e.notes ? ` (${e.notes})` : ''}`)
                .join(' | ')
            : '—',
      })),
    },
    {
      title: 'ملخص حسب المجلد',
      columns: [
        { key: 'label', label: 'المجلد' },
        { key: 'entries', label: 'عدد الدفعات' },
        { key: 'pages', label: 'الصفحات' },
        { key: 'studentsCount', label: 'عدد الطلاب' },
        { key: 'percent', label: 'النسبة %' },
      ],
      rows: volumeStats.map((v) => ({
        label: v.label,
        entries: v.entries,
        pages: v.pages,
        studentsCount: v.studentsCount,
        percent: `${v.percent}%`,
      })),
    },
  ]

  const absentStudents = studentReports.filter(
    (s) =>
      s.entriesCount === 0 &&
      (s.attendanceStatus === HALAKA_ATTENDANCE_STATUSES.ABSENT ||
        s.attendanceStatus === HALAKA_ATTENDANCE_STATUSES.EXCUSED),
  )

  return {
    title,
    halakaName,
    meta,
    kpis,
    executiveSummary,
    volumeStats,
    studentReports,
    entriesChronological,
    absentStudents,
    stats: {
      totalEntries,
      totalPages,
      studentsWithEntries,
      studentsWithoutEntries,
      recordPercent,
      activeStudents: activeStudents.length,
      attSummary,
    },
    printSections,
  }
}
