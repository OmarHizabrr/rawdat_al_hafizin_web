/** ملخص تنفيذي نصي للتقارير — فقرات ونقاط بارزة */

function formatRangeLabel(fromYmd, toYmd) {
  if (fromYmd && toYmd) return `من ${fromYmd} إلى ${toYmd} (تقويم أم القرى)`
  if (fromYmd) return `ابتداءً من ${fromYmd}`
  if (toYmd) return `حتى ${toYmd}`
  return 'كامل الفترة المتاحة (بدون تقييد زمني)'
}

function pluralAr(n, one, two, many) {
  const num = Number(n) || 0
  if (num === 0) return `لا ${many}`
  if (num === 1) return `${one} واحد`
  if (num === 2) return `${two}`
  if (num >= 3 && num <= 10) return `${num} ${many}`
  return `${num} ${one}`
}

/**
 * @param {object} reportData
 * @param {{ entityName?: string, reportTypeLabel?: string, fromYmd?: string, toYmd?: string }} context
 */
export function buildReportExecutiveSummary(reportData, context = {}) {
  if (!reportData) {
    return { rangeLabel: formatRangeLabel(context.fromYmd, context.toYmd), paragraphs: [], highlights: [] }
  }

  const entityName = String(context.entityName || '').trim() || 'الكيان المحدد'
  const typeLabel = String(context.reportTypeLabel || '').trim()
  const rangeLabel = formatRangeLabel(context.fromYmd, context.toYmd)
  const s = reportData.summary || {}
  const paragraphs = []
  const highlights = []

  if (reportData.kind === 'student') {
    const totalMemberships =
      (s.plans ?? 0) + (s.halakat ?? 0) + (s.activities ?? 0) + (s.exams ?? 0) + (s.dawrat ?? 0) + (s.remoteTasmee ?? 0)
    paragraphs.push(
      `يُقدّم هذا التقرير نظرة شاملة على نشاط الطالب «${entityName}» خلال ${rangeLabel}. يجمع بين الارتباطات التعليمية (خطط، حلقات، أنشطة، اختبارات، دورات، تسميع عن بُعد) وسجلات الأوراد والإشعارات ذات الصلة.`,
    )
    if (totalMemberships > 0) {
      paragraphs.push(
        `يُظهر الطالب ارتباطاً بـ ${totalMemberships} عنصراً تعليمياً موزّعة على ${s.plans ?? 0} خطة و${s.halakat ?? 0} حلقة و${s.activities ?? 0} نشاط و${s.exams ?? 0} اختبار و${s.dawrat ?? 0} دورة و${s.remoteTasmee ?? 0} جلسة تسميع عن بُعد.`,
      )
    }
    highlights.push(
      { label: 'إجمالي الارتباطات', value: totalMemberships },
      { label: 'سجلات الأوراد', value: s.awrad ?? 0 },
      { label: 'صفحات محفوظة', value: s.totalPages ?? 0 },
      { label: 'إشعارات', value: s.notifications ?? 0 },
    )
    if ((s.totalPages ?? 0) > 0 && (s.awrad ?? 0) > 0) {
      const avgPages = Math.round((s.totalPages / s.awrad) * 10) / 10
      highlights.push({ label: 'متوسط الصفحات لكل ورد', value: avgPages })
    }
  } else if (reportData.kind === 'teacher') {
    paragraphs.push(
      `يُلخّص هذا التقرير أداء المعلم «${entityName}» خلال ${rangeLabel}، ويشمل الحلقات والارتباطات والجلسات المسجّلة وتسجيلات حضور الطلاب.`,
    )
    if ((s.sessions ?? 0) > 0) {
      paragraphs.push(
        `سجّل المعلم ${pluralAr(s.sessions, 'جلسة', 'جلستان', 'جلسات')}، مع ${s.studentsRecorded ?? 0} طالب تم تسجيل حضورهم و${s.pagesRecorded ?? 0} صفحة محفوظة في سجلات الحضور.`,
      )
    }
    highlights.push(
      { label: 'حلقات', value: s.halakat ?? 0 },
      { label: 'جلسات مسجّلة', value: s.sessions ?? 0 },
      { label: 'طلاب مسجّلون', value: s.studentsRecorded ?? 0 },
      { label: 'صفحات في الحضور', value: s.pagesRecorded ?? 0 },
    )
  } else if (reportData.kind === 'plan') {
    paragraphs.push(
      `يعرض تقرير الخطة «${entityName}» إنجاز الأعضاء في الأوراد خلال ${rangeLabel}. يتضمّن تفاصيل الخطة وقائمة الأعضاء ونسب الإنجاز لكل عضو.`,
    )
    if ((s.members ?? 0) > 0) {
      paragraphs.push(
        `يشارك ${s.members ?? 0} عضواً في الخطة بمتوسط إنجاز ${s.avgProgress ?? 0}%، مع ${s.awradRecords ?? 0} سجل ورد و${s.pagesTotal ?? 0} صفحة محفوظة إجمالاً.`,
      )
    }
    highlights.push(
      { label: 'الأعضاء', value: s.members ?? 0 },
      { label: 'متوسط الإنجاز', value: `${s.avgProgress ?? 0}%` },
      { label: 'سجلات الأوراد', value: s.awradRecords ?? 0 },
      { label: 'إجمالي الصفحات', value: s.pagesTotal ?? 0 },
    )
  } else if (reportData.kind === 'halaka') {
    paragraphs.push(
      `يُوثّق تقرير الحلقة «${entityName}» نشاط الأعضاء والجلسات والحضور خلال ${rangeLabel}.`,
    )
    if ((s.sessions ?? 0) > 0 || (s.attendance ?? 0) > 0) {
      paragraphs.push(
        `أُقيمت ${s.sessions ?? 0} جلسة مع ${s.attendance ?? 0} تسجيل حضور، بإجمالي ${s.pagesTotal ?? 0} صفحة مسجّلة في جلسات الحلقة.`,
      )
    }
    highlights.push(
      { label: 'الأعضاء', value: s.members ?? 0 },
      { label: 'الجلسات', value: s.sessions ?? 0 },
      { label: 'تسجيلات الحضور', value: s.attendance ?? 0 },
      { label: 'الصفحات', value: s.pagesTotal ?? 0 },
    )
  } else if (reportData.kind === 'activity' || reportData.kind === 'dawra') {
    const kindAr = reportData.kind === 'activity' ? 'النشاط' : 'الدورة'
    paragraphs.push(
      `يُقيّم هذا التقرير مشاركة الأعضاء في ${kindAr} «${entityName}» خلال ${rangeLabel}، مع توضيح من سجّل إنجازاً ومن لم يُبلّغ بعد.`,
    )
    const total = s.members ?? 0
    const withC = s.withContribution ?? 0
    const withoutC = s.withoutContribution ?? 0
    if (total > 0) {
      const pct = Math.round((withC / total) * 100)
      paragraphs.push(`سجّل ${withC} من أصل ${total} عضواً إنجازاً (${pct}%)، بينما ${withoutC} لم يُبلّغوا بعد.`)
    }
    highlights.push(
      { label: 'الأعضاء', value: total },
      { label: 'سجّلوا إنجازاً', value: withC },
      { label: 'لم يسجّلوا', value: withoutC },
    )
  } else if (reportData.kind === 'exam') {
    paragraphs.push(
      `يُعرض تقرير الاختبار «${entityName}» حالة الإنجاز المُبلَغ من الأعضاء خلال ${rangeLabel}.`,
    )
    const total = s.members ?? 0
    const done = s.examsCompleted ?? 0
    const pending = s.examsPending ?? 0
    if (total > 0) {
      paragraphs.push(`أتمّ ${done} عضواً الاختبار، و${pending} لم يُتمّ التبليغ بعد من أصل ${total} عضو.`)
    }
    highlights.push(
      { label: 'الأعضاء', value: total },
      { label: 'أتمّوا الاختبار', value: done },
      { label: 'لم يُتمّ بعد', value: pending },
    )
  } else if (reportData.kind === 'remote_tasmee') {
    paragraphs.push(
      `يُلخّص تقرير التسميع عن بُعد «${entityName}» تفاصيل البث والأعضاء المشاركين خلال ${rangeLabel}.`,
    )
    highlights.push({ label: 'الأعضاء', value: s.members ?? 0 })
  } else {
    paragraphs.push(
      typeLabel
        ? `تقرير ${typeLabel} عن «${entityName}» خلال ${rangeLabel}.`
        : `تقرير عن «${entityName}» خلال ${rangeLabel}.`,
    )
    highlights.push({ label: 'الأعضاء', value: s.members ?? 0 })
  }

  return {
    rangeLabel,
    entityName,
    reportTypeLabel: typeLabel,
    paragraphs: paragraphs.filter(Boolean),
    highlights: highlights.filter((h) => h.label),
  }
}
