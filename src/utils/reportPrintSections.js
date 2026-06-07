/** أقسام قابلة للطباعة من بيانات التقرير */

function mapRoleRows(rows, roleLabelAr) {
  return (rows || []).map((r) => ({ ...r, role: roleLabelAr(r.role) }))
}

export function collectPrintSectionsFromReport(reportData, helpers = {}) {
  if (!reportData) return []
  const { formatArDateTime, roleLabelAr, formatExamSelfReportSummary, showEntityOwner } = helpers
  const fmt = formatArDateTime || ((v) => String(v || '—'))
  const role = roleLabelAr || ((r) => r || '—')
  const examSummary = formatExamSelfReportSummary || (() => '—')
  const sections = []

  if (reportData.kind === 'student') {
    sections.push({
      title: 'الخطط',
      columns: [
        { key: 'name', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'visibility', label: 'الظهور' },
        { key: 'joinedAt', label: 'تاريخ الانضمام' },
      ],
      rows: mapRoleRows(reportData.studentRows?.plans, role),
    })
    sections.push({
      title: 'الحلقات',
      columns: [
        { key: 'name', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'visibility', label: 'الظهور' },
        { key: 'joinedAt', label: 'تاريخ الانضمام' },
      ],
      rows: mapRoleRows(reportData.studentRows?.halakat, role),
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
        { key: 'visibility', label: 'الظهور' },
        { key: 'examSelfReportSummary', label: 'الإنجاز المُبلَغ' },
      ],
      rows: (reportData.studentRows?.exams || []).map((r) => ({
        ...r,
        role: role(r.role),
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
        { key: 'provider', label: 'المزوّد' },
        { key: 'mediaType', label: 'النوع' },
      ],
      rows: mapRoleRows(reportData.studentRows?.remoteTasmee, role),
    })
    sections.push({
      title: 'الأوراد',
      columns: [
        { key: 'recordedAt', label: 'تاريخ الورد' },
        { key: 'pagesCount', label: 'عدد الصفحات' },
        { key: 'fromPage', label: 'من صفحة' },
        { key: 'toPage', label: 'إلى صفحة' },
      ],
      rows: (reportData.awrad || []).map((r) => ({
        recordedAt: fmt(r.recordedAt),
        pagesCount: r.pagesCount ?? 0,
        fromPage: r.fromPage ?? '—',
        toPage: r.toPage ?? '—',
      })),
    })
    sections.push({
      title: 'الإشعارات',
      columns: [
        { key: 'id', label: 'الرمز' },
        { key: 'title', label: 'العنوان' },
        { key: 'notificationType', label: 'النوع' },
        { key: 'createdAt', label: 'التاريخ' },
        { key: 'isRead', label: 'مقروء' },
      ],
      rows: (reportData.notifications || []).map((r) => ({
        id: r.id,
        title: r.title || '',
        notificationType: r.notificationType || '',
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
        { key: 'visibility', label: 'الظهور' },
      ],
      rows: mapRoleRows(reportData.teacherRows?.halakat, role),
    })
    sections.push({
      title: 'ارتباطات المعلم',
      columns: [
        { key: 'section', label: 'القسم' },
        { key: 'name', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'visibility', label: 'الظهور' },
        { key: 'learnerContribution', label: 'مساهمة / إنجاز' },
      ],
      rows: [
        ...(reportData.teacherRows?.plans || []).map((r) => ({
          section: 'الخطط',
          name: r.name,
          role: role(r.role),
          visibility: r.visibility || '',
          learnerContribution: '—',
        })),
        ...(reportData.teacherRows?.activities || []).map((r) => ({
          section: 'الأنشطة',
          name: r.name,
          role: role(r.role),
          visibility: r.visibility || '',
          learnerContribution: (r.memberContributionText || '').trim() || '—',
        })),
        ...(reportData.teacherRows?.exams || []).map((r) => ({
          section: 'الاختبارات',
          name: r.name,
          role: role(r.role),
          visibility: r.visibility || '',
          learnerContribution: examSummary(r),
        })),
        ...(reportData.teacherRows?.dawrat || []).map((r) => ({
          section: 'الدورات',
          name: r.name,
          role: role(r.role),
          visibility: r.visibility || '',
          learnerContribution: (r.memberContributionText || '').trim() || '—',
        })),
        ...(reportData.teacherRows?.remoteTasmee || []).map((r) => ({
          section: 'التسميع عن بعد',
          name: r.name,
          role: role(r.role),
          visibility: r.visibility || '',
          learnerContribution: '—',
        })),
      ],
    })
    sections.push({
      title: 'جلسات المعلم',
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
        status: s.status || '',
      })),
    })
    sections.push({
      title: 'سجلات الحضور',
      columns: [
        { key: 'userName', label: 'المستخدم' },
        { key: 'attendanceStatus', label: 'الحضور' },
        { key: 'pagesCount', label: 'الصفحات' },
        { key: 'updatedAt', label: 'آخر تحديث' },
      ],
      rows: (reportData.attendanceRecorded || []).map((a) => ({
        userName: a.userName || a.userId || '',
        attendanceStatus: a.attendanceStatus || '',
        pagesCount: a.pagesCount ?? 0,
        updatedAt: fmt(a.updatedAt),
      })),
    })
    sections.push({
      title: 'ملخص حسب الطالب',
      columns: [
        { key: 'userName', label: 'المستخدم' },
        { key: 'recordsCount', label: 'عدد التسجيلات' },
        { key: 'pagesTotal', label: 'إجمالي الصفحات' },
        { key: 'latestUpdatedAt', label: 'آخر تحديث' },
      ],
      rows: (reportData.attendanceByStudent || []).map((r) => ({
        userName: r.userName || r.userId || '',
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
    columns: [
      { key: 'name', label: 'الاسم' },
      { key: 'visibility', label: 'الظهور' },
      ...(showEntityOwner ? [{ key: 'ownerUid', label: 'المالك' }] : []),
      { key: 'createdAt', label: 'الإنشاء' },
      { key: 'updatedAt', label: 'آخر تحديث' },
      { key: 'startAt', label: 'البداية' },
      { key: 'endAt', label: 'النهاية' },
      { key: 'location', label: 'الموقع/الرابط' },
      { key: 'provider', label: 'المزود' },
      { key: 'mediaType', label: 'النوع' },
    ],
    rows: [
      {
        ...details,
        createdAt: fmt(details.createdAt),
        updatedAt: fmt(details.updatedAt),
        startAt: fmt(details.startAt),
        endAt: fmt(details.endAt),
      },
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
      displayName: m.displayName || m.userId,
      role: role(m.role),
      email: m.email || '',
      learnerNote:
        reportData.kind === 'exam'
          ? examSummary(m)
          : (m.memberContributionText || '').trim() || '—',
    })),
  })

  if (reportData.kind === 'plan' && reportData.memberDetails?.length) {
    sections.push({
      title: 'إنجاز الأعضاء في الخطة',
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
        role: role(r.role),
        latestAwradAt: fmt(r.latestAwradAt),
      })),
    })
  }

  if (reportData.kind === 'halaka' && reportData.memberDetails?.length) {
    sections.push({
      title: 'تفاصيل أعضاء الحلقة',
      columns: [
        { key: 'displayName', label: 'الاسم' },
        { key: 'role', label: 'الدور' },
        { key: 'plansCount', label: 'خطط' },
        { key: 'awradCount', label: 'أوراد' },
        { key: 'pagesInAwrad', label: 'صفحات' },
        { key: 'attendanceRecordsInHalaka', label: 'حضور الحلقة' },
        { key: 'latestAttendanceAt', label: 'آخر حضور' },
      ],
      rows: reportData.memberDetails.map((r) => ({
        ...r,
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
        status: s.status || '',
      })),
    })
    sections.push({
      title: 'حضور الحلقة',
      columns: [
        { key: 'userId', label: 'المستخدم' },
        { key: 'sessionId', label: 'الجلسة' },
        { key: 'attendanceStatus', label: 'الحضور' },
        { key: 'pagesCount', label: 'الصفحات' },
        { key: 'updatedAt', label: 'التحديث' },
      ],
      rows: (reportData.attendanceRows || []).map((a) => ({
        userId: a.userId || '',
        sessionId: a.sessionId || '',
        attendanceStatus: a.attendanceStatus || '',
        pagesCount: a.pagesCount ?? 0,
        updatedAt: fmt(a.updatedAt),
      })),
    })
  }

  return sections.filter((s) => s.rows?.length)
}
