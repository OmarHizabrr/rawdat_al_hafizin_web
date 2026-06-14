/** أقسام قابلة للطباعة من بيانات التقرير */

import {
  entityDetailsColumnsForKind,
  formatEntityDetailsForReport,
  reportAttendanceStatusLabel,
  reportMediaTypeLabel,
  reportNotificationTypeLabel,
  reportPersonLabel,
  reportProviderLabel,
  reportSessionStatusLabel,
  reportVisibilityLabel,
} from './reportDisplayLabels.js'

function mapRoleRows(rows, roleLabelAr, fmt) {
  return (rows || []).map((r) => ({
    name: r.name || '—',
    role: roleLabelAr(r.role),
    visibilityLabel: reportVisibilityLabel(r.visibility),
    joinedAt: fmt ? fmt(r.joinedAt) : r.joinedAt || '—',
  }))
}

export function collectPrintSectionsFromReport(reportData, helpers = {}) {
  if (!reportData) return []
  const { formatArDateTime, roleLabelAr, formatExamSelfReportSummary, showEntityOwner } = helpers
  const fmt = formatArDateTime || ((v) => String(v || '—'))
  const role = roleLabelAr || ((r) => r || '—')
  const examSummary = formatExamSelfReportSummary || (() => '—')
  const sections = []

  if (reportData.kind === 'student') {
    if (reportData.planProgress?.length) {
      sections.push({
        title: 'إنجاز الخطط (تفصيلي)',
        columns: [
          { key: 'name', label: 'الخطة' },
          { key: 'volumesSummary', label: 'المجلدات' },
          { key: 'role', label: 'الدور' },
          { key: 'progressPercent', label: 'نسبة الإنجاز %' },
          { key: 'achievedPages', label: 'أنجز (ص)' },
          { key: 'remainingPages', label: 'بقي (ص)' },
          { key: 'targetPages', label: 'الهدف (ص)' },
          { key: 'dailyPages', label: 'الورد اليومي' },
          { key: 'awradInPeriodCount', label: 'أوراد الفترة' },
          { key: 'pagesInPeriod', label: 'صفحات الفترة' },
          { key: 'latestAwradAt', label: 'آخر ورد' },
        ],
        rows: reportData.planProgress.map((r) => ({
          ...r,
          role: role(r.role),
          latestAwradAt: fmt(r.latestAwradAt),
        })),
      })
    }
    if (reportData.halakaAttendance?.length) {
      sections.push({
        title: 'حضور وتسميع الحلقات',
        columns: [
          { key: 'halakaName', label: 'الحلقة' },
          { key: 'sessionTitle', label: 'الجلسة' },
          { key: 'sessionStartedAt', label: 'بداية الجلسة' },
          { key: 'attendanceStatusLabel', label: 'الحضور' },
          { key: 'pagesCount', label: 'الصفحات' },
          { key: 'fromPage', label: 'من' },
          { key: 'toPage', label: 'إلى' },
          { key: 'recordedAt', label: 'تاريخ التسجيل' },
          { key: 'recordedByName', label: 'سجّله' },
        ],
        rows: reportData.halakaAttendance.map((r) => ({
          halakaName: r.halakaName || '—',
          sessionTitle: r.sessionTitle || '—',
          sessionStartedAt: fmt(r.sessionStartedAt),
          attendanceStatusLabel: reportAttendanceStatusLabel(r.attendanceStatus),
          pagesCount: r.pagesCount ?? 0,
          fromPage: r.fromPage ?? '—',
          toPage: r.toPage ?? '—',
          recordedAt: fmt(r.recordedAt),
          recordedByName: r.recordedByName || '—',
        })),
      })
    }
    sections.push({
      title: 'الخطط',
      columns: [
        { key: 'name', label: 'الاسم' },
        { key: 'volumesSummary', label: 'المجلدات' },
        { key: 'role', label: 'الدور' },
        { key: 'visibilityLabel', label: 'الظهور' },
        { key: 'dailyPages', label: 'ورد يومي' },
        { key: 'totalTargetPages', label: 'هدف (ص)' },
        { key: 'joinedAt', label: 'تاريخ الانضمام' },
      ],
      rows: (reportData.studentRows?.plans || []).map((r) => ({
        name: r.name || '—',
        volumesSummary: r.volumesSummary || '—',
        role: role(r.role),
        visibilityLabel: reportVisibilityLabel(r.visibility),
        dailyPages: r.dailyPages ?? '—',
        totalTargetPages: r.totalTargetPages ?? '—',
        joinedAt: fmt(r.joinedAt),
      })),
    })
    sections.push({
      title: 'الحلقات',
      columns: [
        { key: 'name', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'visibilityLabel', label: 'الظهور' },
        { key: 'location', label: 'الموقع' },
        { key: 'joinedAt', label: 'تاريخ الانضمام' },
      ],
      rows: (reportData.studentRows?.halakat || []).map((r) => ({
        name: r.name || '—',
        role: role(r.role),
        visibilityLabel: reportVisibilityLabel(r.visibility),
        location: r.location || '—',
        joinedAt: fmt(r.joinedAt),
      })),
    })
    sections.push({
      title: 'الأنشطة',
      columns: [
        { key: 'name', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'startAt', label: 'البداية' },
        { key: 'endAt', label: 'النهاية' },
        { key: 'memberContributionText', label: 'مساهمة الطالب' },
      ],
      rows: (reportData.studentRows?.activities || []).map((r) => ({
        ...r,
        role: role(r.role),
        startAt: fmt(r.startAt),
        endAt: fmt(r.endAt),
        memberContributionText: (r.memberContributionText || '').trim() || '—',
      })),
    })
    sections.push({
      title: 'الاختبارات',
      columns: [
        { key: 'name', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'visibilityLabel', label: 'الظهور' },
        { key: 'examSelfReportSummary', label: 'الإنجاز المُبلَغ' },
      ],
      rows: (reportData.studentRows?.exams || []).map((r) => ({
        name: r.name || '—',
        role: role(r.role),
        visibilityLabel: reportVisibilityLabel(r.visibility),
        examSelfReportSummary: examSummary(r),
      })),
    })
    sections.push({
      title: 'الدورات',
      columns: [
        { key: 'name', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'courseStart', label: 'بداية الدورة' },
        { key: 'courseEnd', label: 'نهاية الدورة' },
        { key: 'memberContributionText', label: 'مساهمة العضو' },
      ],
      rows: (reportData.studentRows?.dawrat || []).map((r) => ({
        ...r,
        role: role(r.role),
        courseStart: fmt(r.courseStart),
        courseEnd: fmt(r.courseEnd),
        memberContributionText: (r.memberContributionText || '').trim() || '—',
      })),
    })
    sections.push({
      title: 'التسميع عن بعد',
      columns: [
        { key: 'name', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'providerLabel', label: 'المزوّد' },
        { key: 'mediaTypeLabel', label: 'النوع' },
      ],
      rows: (reportData.studentRows?.remoteTasmee || []).map((r) => ({
        name: r.name || '—',
        role: role(r.role),
        providerLabel: reportProviderLabel(r.provider),
        mediaTypeLabel: reportMediaTypeLabel(r.mediaType),
      })),
    })
    sections.push({
      title: 'الأوراد',
      columns: [
        { key: 'planName', label: 'الخطة' },
        { key: 'planVolumesSummary', label: 'المجلدات' },
        { key: 'recordedAt', label: 'تاريخ الورد' },
        { key: 'pagesCount', label: 'عدد الصفحات' },
        { key: 'fromPage', label: 'من صفحة' },
        { key: 'toPage', label: 'إلى صفحة' },
      ],
      rows: (reportData.awrad || []).map((r) => ({
        planName: r.planName || '—',
        planVolumesSummary: r.planVolumesSummary || '—',
        recordedAt: fmt(r.recordedAt),
        pagesCount: r.pagesCount ?? 0,
        fromPage: r.fromPage ?? '—',
        toPage: r.toPage ?? '—',
      })),
    })
    sections.push({
      title: 'الإشعارات',
      columns: [
        { key: 'title', label: 'العنوان' },
        { key: 'notificationTypeLabel', label: 'النوع' },
        { key: 'createdAt', label: 'التاريخ' },
        { key: 'isRead', label: 'مقروء' },
      ],
      rows: (reportData.notifications || []).map((r) => ({
        title: r.title || '—',
        notificationTypeLabel: reportNotificationTypeLabel(r.notificationType),
        createdAt: fmt(r.createdAt),
        isRead: r.isRead ? 'نعم' : 'لا',
      })),
    })
    return sections.filter((s) => s.rows?.length)
  }

  if (reportData.kind === 'teacher') {
    sections.push({
      title: 'حلقات المعلم',
      columns: [
        { key: 'name', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'visibilityLabel', label: 'الظهور' },
      ],
      rows: (reportData.teacherRows?.halakat || []).map((r) => ({
        name: r.name || '—',
        role: role(r.role),
        visibilityLabel: reportVisibilityLabel(r.visibility),
      })),
    })
    sections.push({
      title: 'ارتباطات المعلم',
      columns: [
        { key: 'section', label: 'القسم' },
        { key: 'name', label: 'الاسم' },
        { key: 'volumesSummary', label: 'المجلدات' },
        { key: 'role', label: 'الدور' },
        { key: 'visibilityLabel', label: 'الظهور' },
        { key: 'learnerContribution', label: 'مساهمة / إنجاز' },
      ],
      rows: [
        ...(reportData.teacherRows?.plans || []).map((r) => ({
          section: 'الخطط',
          name: r.name,
          volumesSummary: r.volumesSummary || '—',
          role: role(r.role),
          visibilityLabel: reportVisibilityLabel(r.visibility),
          learnerContribution: '—',
        })),
        ...(reportData.teacherRows?.activities || []).map((r) => ({
          section: 'الأنشطة',
          name: r.name,
          volumesSummary: '—',
          role: role(r.role),
          visibilityLabel: reportVisibilityLabel(r.visibility),
          learnerContribution: (r.memberContributionText || '').trim() || '—',
        })),
        ...(reportData.teacherRows?.exams || []).map((r) => ({
          section: 'الاختبارات',
          name: r.name,
          volumesSummary: '—',
          role: role(r.role),
          visibilityLabel: reportVisibilityLabel(r.visibility),
          learnerContribution: examSummary(r),
        })),
        ...(reportData.teacherRows?.dawrat || []).map((r) => ({
          section: 'الدورات',
          name: r.name,
          volumesSummary: '—',
          role: role(r.role),
          visibilityLabel: reportVisibilityLabel(r.visibility),
          learnerContribution: (r.memberContributionText || '').trim() || '—',
        })),
        ...(reportData.teacherRows?.remoteTasmee || []).map((r) => ({
          section: 'التسميع عن بعد',
          name: r.name,
          volumesSummary: '—',
          role: role(r.role),
          visibilityLabel: reportVisibilityLabel(r.visibility),
          learnerContribution: '—',
        })),
      ],
    })
    sections.push({
      title: 'جلسات المعلم',
      columns: [
        { key: 'halakaName', label: 'الحلقة' },
        { key: 'title', label: 'العنوان' },
        { key: 'startedAt', label: 'البداية' },
        { key: 'endedAt', label: 'النهاية' },
        { key: 'status', label: 'الحالة' },
      ],
      rows: (reportData.sessions || []).map((s) => ({
        halakaName: s.halakaName || '—',
        title: s.title || '',
        startedAt: fmt(s.startedAt),
        endedAt: fmt(s.endedAt),
        status: reportSessionStatusLabel(s.status),
      })),
    })
    sections.push({
      title: 'سجلات الحضور',
      columns: [
        { key: 'halakaName', label: 'الحلقة' },
        { key: 'userName', label: 'الطالب' },
        { key: 'attendanceStatusLabel', label: 'الحضور' },
        { key: 'pagesCount', label: 'الصفحات' },
        { key: 'updatedAt', label: 'آخر تحديث' },
      ],
      rows: (reportData.attendanceRecorded || []).map((a) => ({
        halakaName: a.halakaName || '—',
        userName: reportPersonLabel(a.userName, a.userId),
        attendanceStatusLabel: reportAttendanceStatusLabel(a.attendanceStatus),
        pagesCount: a.pagesCount ?? 0,
        updatedAt: fmt(a.updatedAt),
      })),
    })
    sections.push({
      title: 'ملخص حسب الطالب',
      columns: [
        { key: 'userName', label: 'الطالب' },
        { key: 'recordsCount', label: 'عدد التسجيلات' },
        { key: 'pagesTotal', label: 'إجمالي الصفحات' },
        { key: 'latestUpdatedAt', label: 'آخر تحديث' },
      ],
      rows: (reportData.attendanceByStudent || []).map((r) => ({
        userName: reportPersonLabel(r.userName, r.userId),
        recordsCount: r.recordsCount ?? 0,
        pagesTotal: r.pagesTotal ?? 0,
        latestUpdatedAt: fmt(r.latestUpdatedAt),
      })),
    })
    return sections.filter((s) => s.rows?.length)
  }

  const details = reportData.entityDetails || {}
  sections.push({
    title: 'تفاصيل الكيان',
    columns: entityDetailsColumnsForKind(reportData.kind, showEntityOwner),
    rows: [
      formatEntityDetailsForReport(details, reportData.kind, {
        ownerName: showEntityOwner ? details.ownerName || '—' : '',
        formatDate: fmt,
      }),
    ],
  })

  const memberNoteLabel =
    reportData.kind === 'exam'
      ? 'الإنجاز المُبلَغ'
      : reportData.kind === 'activity'
        ? 'مساهمة الطالب'
        : reportData.kind === 'dawra'
          ? 'مساهمة العضو'
          : 'ملاحظة'

  sections.push({
    title: 'الأعضاء',
    columns: [
      { key: 'displayName', label: 'الاسم' },
      { key: 'role', label: 'الدور' },
      { key: 'email', label: 'البريد' },
      ...(reportData.kind === 'activity' || reportData.kind === 'exam' || reportData.kind === 'dawra'
        ? [{ key: 'learnerNote', label: memberNoteLabel }]
        : []),
    ],
    rows: (reportData.members || []).map((m) => ({
      displayName: reportPersonLabel(m.displayName, m.userId),
      role: role(m.role),
      email: m.email || '',
      learnerNote:
        reportData.kind === 'exam'
          ? examSummary(m)
          : (m.memberContributionText || '').trim() || '—',
    })),
  })

  if (reportData.kind === 'plan' && reportData.memberDetails?.length) {
    const planVolumes =
      reportData.entityDetails?.volumesSummary && reportData.entityDetails.volumesSummary !== '—'
        ? reportData.entityDetails.volumesSummary
        : ''
    sections.push({
      title: planVolumes ? `إنجاز الأعضاء في الخطة — المجلدات: ${planVolumes}` : 'إنجاز الأعضاء في الخطة',
      columns: [
        { key: 'displayName', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'progressPercent', label: 'نسبة الإنجاز %' },
        { key: 'achievedPages', label: 'أنجز (ص)' },
        { key: 'remainingPages', label: 'بقي (ص)' },
        { key: 'awradCount', label: 'عدد الأوراد' },
        { key: 'pagesInAwrad', label: 'صفحات الأوراد' },
        { key: 'latestAwradAt', label: 'آخر ورد' },
      ],
      rows: reportData.memberDetails.map((r) => ({
        ...r,
        displayName: reportPersonLabel(r.displayName, r.userId),
        role: role(r.role),
        latestAwradAt: fmt(r.latestAwradAt),
      })),
    })
  }

  if (reportData.kind === 'activity' && reportData.memberDetails?.length) {
    sections.push({
      title: 'إنجاز الأعضاء في النشاط',
      columns: [
        { key: 'displayName', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'hasContributionLabel', label: 'سجّل إنجازاً؟' },
        { key: 'contribution', label: 'المساهمة' },
        { key: 'contributionUpdatedAt', label: 'آخر تحديث' },
      ],
      rows: reportData.memberDetails.map((r) => ({
        ...r,
        displayName: reportPersonLabel(r.displayName, r.userId),
        role: role(r.role),
        hasContributionLabel: r.hasContribution ? 'نعم' : 'لا',
        contributionUpdatedAt: fmt(r.contributionUpdatedAt),
      })),
    })
  }

  if (reportData.kind === 'exam' && reportData.memberDetails?.length) {
    sections.push({
      title: 'إنجاز الأعضاء في الاختبار',
      columns: [
        { key: 'displayName', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'examStatusLabel', label: 'الحالة' },
        { key: 'examNotes', label: 'ملاحظات' },
        { key: 'examUpdatedAt', label: 'آخر تحديث' },
      ],
      rows: reportData.memberDetails.map((r) => ({
        ...r,
        displayName: reportPersonLabel(r.displayName, r.userId),
        role: role(r.role),
        examStatusLabel: examSummary(r),
        examNotes: (r.examSelfReportNotes || '').trim() || '—',
        examUpdatedAt: fmt(r.examSelfReportUpdatedAt),
      })),
    })
  }

  if (reportData.kind === 'dawra' && reportData.memberDetails?.length) {
    sections.push({
      title: 'إنجاز الأعضاء في الدورة',
      columns: [
        { key: 'displayName', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'hasContributionLabel', label: 'سجّل إنجازاً؟' },
        { key: 'contribution', label: 'المساهمة' },
        { key: 'contributionUpdatedAt', label: 'آخر تحديث' },
      ],
      rows: reportData.memberDetails.map((r) => ({
        ...r,
        displayName: reportPersonLabel(r.displayName, r.userId),
        role: role(r.role),
        hasContributionLabel: r.hasContribution ? 'نعم' : 'لا',
        contributionUpdatedAt: fmt(r.contributionUpdatedAt),
      })),
    })
  }

  if (reportData.kind === 'remote_tasmee' && reportData.memberDetails?.length) {
    sections.push({
      title: 'تفاصيل أعضاء البث',
      columns: [
        { key: 'displayName', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'email', label: 'البريد' },
        { key: 'joinedAt', label: 'تاريخ الانضمام' },
      ],
      rows: reportData.memberDetails.map((r) => ({
        ...r,
        displayName: reportPersonLabel(r.displayName, r.userId),
        role: role(r.role),
        joinedAt: fmt(r.joinedAt),
      })),
    })
  }

  if (reportData.kind === 'halaka' && reportData.memberDetails?.length) {
    sections.push({
      title: 'تفاصيل أعضاء الحلقة',
      columns: [
        { key: 'displayName', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'plansVolumesSummary', label: 'مجلدات خططه' },
        { key: 'plansCount', label: 'خطط' },
        { key: 'awradCount', label: 'أوراد' },
        { key: 'pagesInAwrad', label: 'صفحات' },
        { key: 'attendanceRecordsInHalaka', label: 'حضور الحلقة' },
        { key: 'latestAttendanceAt', label: 'آخر حضور' },
      ],
      rows: reportData.memberDetails.map((r) => ({
        ...r,
        displayName: reportPersonLabel(r.displayName, r.userId),
        role: role(r.role),
        latestAwradAt: fmt(r.latestAwradAt),
        latestAttendanceAt: fmt(r.latestAttendanceAt),
      })),
    })
    sections.push({
      title: 'جلسات الحلقة',
      columns: [
        { key: 'title', label: 'العنوان' },
        { key: 'startedAt', label: 'البداية' },
        { key: 'endedAt', label: 'النهاية' },
        { key: 'status', label: 'الحالة' },
      ],
      rows: (reportData.sessions || []).map((s) => ({
        title: s.title || '',
        startedAt: fmt(s.startedAt),
        endedAt: fmt(s.endedAt),
        status: reportSessionStatusLabel(s.status),
      })),
    })
    sections.push({
      title: 'حضور الحلقة',
      columns: [
        { key: 'userName', label: 'العضو' },
        { key: 'sessionTitle', label: 'الجلسة' },
        { key: 'attendanceStatusLabel', label: 'الحضور' },
        { key: 'pagesCount', label: 'الصفحات' },
        { key: 'fromPage', label: 'من' },
        { key: 'toPage', label: 'إلى' },
        { key: 'updatedAt', label: 'التحديث' },
      ],
      rows: (reportData.attendanceRows || []).map((a) => ({
        userName: reportPersonLabel(a.userName, a.userId),
        sessionTitle: a.sessionTitle || 'جلسة',
        attendanceStatusLabel: reportAttendanceStatusLabel(a.attendanceStatus),
        pagesCount: a.pagesCount ?? 0,
        fromPage: a.fromPage ?? '—',
        toPage: a.toPage ?? '—',
        updatedAt: fmt(a.updatedAt),
      })),
    })
  }

  return sections.filter((s) => s.rows?.length)
}

/** مؤشرات مختصرة تُعرض أعلى مستند الطباعة */
export function collectPrintKpisFromReport(reportData, labels = {}) {
  if (!reportData?.summary) return []
  const s = reportData.summary
  const L = {
    plans: labels.plans || 'الخطط',
    halakat: labels.halakat || 'الحلقات',
    activities: labels.activities || 'الأنشطة',
    exams: labels.exams || 'الاختبارات',
    awrad: labels.awrad || 'الأوراد',
    pages: labels.pages || 'الصفحات',
    members: labels.members || 'الأعضاء',
    sessions: labels.sessions || 'الجلسات',
    attendance: labels.attendance || 'الحضور',
    avgProgress: labels.avgProgress || 'متوسط الإنجاز',
    awradRecords: labels.awradRecords || 'سجلات الأوراد',
    studentsRecorded: labels.studentsRecorded || 'طلاب مسجّلون',
    pagesRecorded: labels.pagesRecorded || 'صفحات مسجّلة',
  }

  if (reportData.kind === 'student') {
    return [
      { label: L.plans, value: s.plans ?? 0 },
      { label: 'متوسط إنجاز الخطط', value: `${s.avgPlanProgress ?? 0}%` },
      { label: L.halakat, value: s.halakat ?? 0 },
      { label: 'حضور حلقات (فترة)', value: s.halakaAttendanceRecords ?? 0 },
      { label: L.awrad, value: s.awrad ?? 0 },
      { label: L.pages, value: s.totalPages ?? 0 },
      { label: 'صفحات في الحلقات', value: s.halakaPagesRecorded ?? 0 },
      { label: L.activities, value: s.activities ?? 0 },
      { label: L.exams, value: s.exams ?? 0 },
    ]
  }

  if (reportData.kind === 'teacher') {
    return [
      { label: L.halakat, value: s.halakat ?? 0 },
      { label: L.plans, value: s.plans ?? 0 },
      { label: L.activities, value: s.activities ?? 0 },
      { label: L.exams, value: s.exams ?? 0 },
      { label: labels.dawrat || 'الدورات', value: s.dawrat ?? 0 },
      { label: labels.remoteTasmee || 'التسميع عن بُعد', value: s.remoteTasmee ?? 0 },
      { label: L.sessions, value: s.sessions ?? 0 },
      { label: L.studentsRecorded, value: s.studentsRecorded ?? 0 },
      { label: L.pagesRecorded, value: s.pagesRecorded ?? 0 },
    ]
  }

  if (reportData.kind === 'plan') {
    return [
      { label: L.members, value: s.members ?? 0 },
      { label: L.avgProgress, value: `${s.avgProgress ?? 0}%` },
      { label: L.pages, value: s.pagesTotal ?? 0 },
      { label: L.awradRecords, value: s.awradRecords ?? 0 },
    ]
  }

  if (reportData.kind === 'halaka') {
    return [
      { label: L.members, value: s.members ?? 0 },
      { label: L.sessions, value: s.sessions ?? 0 },
      { label: L.attendance, value: s.attendance ?? 0 },
      { label: L.pages, value: s.pagesTotal ?? 0 },
    ]
  }

  if (reportData.kind === 'activity' || reportData.kind === 'dawra') {
    return [
      { label: L.members, value: s.members ?? 0 },
      { label: 'سجّلوا إنجازاً', value: s.withContribution ?? 0 },
      { label: 'لم يسجّلوا', value: s.withoutContribution ?? 0 },
    ]
  }

  if (reportData.kind === 'exam') {
    return [
      { label: L.members, value: s.members ?? 0 },
      { label: 'أتمّوا الاختبار', value: s.examsCompleted ?? 0 },
      { label: 'لم يُتمّ بعد', value: s.examsPending ?? 0 },
    ]
  }

  return [{ label: L.members, value: s.members ?? 0 }]
}
