import { formatPlanVolumesForReport } from './reportDisplayLabels.js'
import { getHomeWirdDayStatus, getHomeWirdDashboardInsight } from './homeWirdStatus.js'
import { computePlanProgress } from './planProgress.js'
import { examSelfReportStepIndex } from './examSelfReportLabels.js'
import {
  describeHalakaAttendance,
  halakaAttendanceDueLabel,
  halakaAttendanceToTaskStep,
  HALAKA_TASKS_LIMIT,
} from './halakaAttendanceTask.js'

const TASK_STEP_IDS = ['pending', 'in_progress', 'review', 'done']

function examStatusToTaskStep(status) {
  const idx = examSelfReportStepIndex(status)
  if (idx < 0) return 'pending'
  if (idx === 0) return 'pending'
  if (idx === 1) return 'in_progress'
  return 'done'
}

function planWirdToTaskStep(plan, awrad) {
  const status = getHomeWirdDayStatus(plan, awrad)
  if (!status.appliesToday) {
    const insight = getHomeWirdDashboardInsight(plan, awrad, status)
    if (insight.owedPages > 0) return 'in_progress'
    return null
  }
  if (status.isComplete) return 'done'
  const insight = getHomeWirdDashboardInsight(plan, awrad, status)
  if (insight.todayLogged > 0) return 'in_progress'
  if (insight.owedPages > 0) return 'in_progress'
  return 'pending'
}

function dueLabelForPlanWird(plan, awrad) {
  const status = getHomeWirdDayStatus(plan, awrad)
  const insight = getHomeWirdDashboardInsight(plan, awrad, status)
  if (status.isComplete) return 'مكتمل اليوم'
  if (!status.appliesToday) return insight.owedPages > 0 ? 'تعويض' : 'يوم راحة'
  if (insight.owedPages > 0) return 'اليوم — تعويض'
  return 'اليوم'
}

/**
 * يبني قائمة الواجبات من بيانات الطالب الفعلية.
 */
export function buildStudentTasks(workspace = {}) {
  const plans = workspace.plans || []
  const awrad = workspace.awrad || []
  const halakat = workspace.halakat || []
  const halakaSnapshots = workspace.halakaSnapshots || []
  const exams = workspace.exams || []
  const activities = workspace.activities || []
  const dawrat = workspace.dawrat || []
  const tasks = []

  for (const plan of plans) {
    const step = planWirdToTaskStep(plan, awrad)
    if (!step) continue
    const progress = computePlanProgress(plan, awrad)
    const volumesSummary = formatPlanVolumesForReport(plan.volumes)
    const insight = getHomeWirdDashboardInsight(plan, awrad, getHomeWirdDayStatus(plan, awrad))
    const daily = Math.max(1, Number(plan.dailyPages) || 1)

    tasks.push({
      id: `plan-wird:${plan.id}`,
      source: 'plan',
      sourceId: plan.id,
      title: `ورد اليوم — ${plan.name || 'خطة'}`,
      description: [
        volumesSummary !== '—' ? `المجلدات: ${volumesSummary}` : '',
        `الورد اليومي ${daily} صفحة — الإنجاز ${Math.round(progress?.progressPercent || 0)}%`,
        insight.headline || '',
      ]
        .filter(Boolean)
        .join(' · '),
      step,
      dueLabel: dueLabelForPlanWird(plan, awrad),
      category: 'حفظ',
      to: '/app/awrad',
      priority: step === 'done' ? 3 : step === 'in_progress' ? 1 : 2,
    })
  }

  const snapshotByHalakaId = new Map(halakaSnapshots.map((s) => [s.halakaId, s]))

  for (const h of halakat.slice(0, HALAKA_TASKS_LIMIT)) {
    const snap = snapshotByHalakaId.get(h.id)
    const session = snap?.session || null
    const attendance = snap?.attendance || null
    const step = halakaAttendanceToTaskStep(session, attendance)
    if (step === 'done' && session?.status !== 'open') continue

    const attendanceNote = describeHalakaAttendance(session, attendance)
    tasks.push({
      id: `halaka:${h.id}`,
      source: 'halaka',
      sourceId: h.id,
      sessionId: session?.id || '',
      title: `حضور الحلقة — ${h.name || 'حلقة'}`,
      description: [
        h.location ? `الموقع: ${h.location}` : '',
        attendanceNote,
      ]
        .filter(Boolean)
        .join(' · '),
      step,
      dueLabel: halakaAttendanceDueLabel(session, attendance),
      category: 'حلقة',
      to: session?.id ? `/app/halakat/${h.id}/sessions/${session.id}` : `/app/halakat/${h.id}/sessions`,
      priority: step === 'pending' ? 2 : step === 'in_progress' ? 3 : 5,
    })
  }

  for (const exam of exams) {
    const st = String(exam.examSelfReportStatus || '').trim()
    const step = examStatusToTaskStep(st)
    if (step === 'done') continue
    tasks.push({
      id: `exam:${exam.id}`,
      source: 'exam',
      sourceId: exam.id,
      title: `اختبار — ${exam.name || 'مجموعة'}`,
      description: st
        ? `الحالة المُبلَغة: ${st === 'preparing' ? 'يُجهّز للاختبار' : 'سجّل في المجموعة'}`
        : 'حدّد حالة إنجازك في مجموعة الاختبار.',
      step,
      dueLabel: step === 'in_progress' ? 'قريباً' : 'مطلوب',
      category: 'اختبار',
      to: `/app/exams?exam=${exam.id}`,
      priority: step === 'in_progress' ? 2 : 3,
    })
  }

  for (const activity of activities) {
    const contribution = String(activity.memberContributionText || '').trim()
    if (contribution) continue
    tasks.push({
      id: `activity:${activity.id}`,
      source: 'activity',
      sourceId: activity.id,
      title: `مساهمة نشاط — ${activity.name || 'نشاط'}`,
      description: 'سجّل إنجازك أو ملخص مشاركتك في النشاط.',
      step: 'pending',
      dueLabel: 'مطلوب',
      category: 'نشاط',
      to: `/app/activities?activity=${activity.id}`,
      priority: 3,
    })
  }

  for (const dawra of dawrat) {
    const contribution = String(dawra.memberContributionText || '').trim()
    if (contribution) continue
    tasks.push({
      id: `dawra:${dawra.id}`,
      source: 'dawra',
      sourceId: dawra.id,
      title: `مساهمة دورة — ${dawra.name || 'دورة'}`,
      description: 'سجّل إنجازك أو ملخص مشاركتك في الدورة.',
      step: 'pending',
      dueLabel: 'مطلوب',
      category: 'دورة',
      to: `/app/dawrat?dawra=${dawra.id}`,
      priority: 3,
    })
  }

  const stepOrder = Object.fromEntries(TASK_STEP_IDS.map((id, i) => [id, i]))
  return tasks.sort((a, b) => {
    const pa = a.priority ?? 9
    const pb = b.priority ?? 9
    if (pa !== pb) return pa - pb
    return (stepOrder[a.step] ?? 9) - (stepOrder[b.step] ?? 9)
  })
}
