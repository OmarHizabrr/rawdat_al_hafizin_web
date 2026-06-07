import { firestoreApi } from './firestoreApi.js'
import { buildStudentReport } from './reportsService.js'
import { computePlanProgress } from '../utils/planProgress.js'
import { examSelfReportStatusLabel, examSelfReportStepIndex } from '../utils/examSelfReportLabels.js'
import { getCumulativePagesOwedThrough, getHomeWirdDayStatus } from '../utils/homeWirdStatus.js'
import { localYmd } from '../utils/planDailyQuota.js'

function planRoleLabelAr(role) {
  const r = String(role || '').trim().toLowerCase()
  if (r === 'owner') return 'مالك'
  if (r === 'supervisor') return 'مشرف'
  if (r === 'teacher') return 'معلم'
  if (r === 'student') return 'طالب'
  return role || '—'
}

/**
 * تقرير إنجاز الطالب: ما أنجز وما تبقّى في الخطط والأنشطة والاختبارات.
 * @param {string} uid
 */
export async function buildStudentProgressReport(uid) {
  const studentUid = String(uid || '').trim()
  if (!studentUid) return null

  const profile = (await firestoreApi.getData(firestoreApi.getUserDoc(studentUid))) || {}
  const student = {
    uid: studentUid,
    displayName: String(profile.displayName || profile.name || studentUid).trim() || studentUid,
    email: String(profile.email || '').trim(),
    photoURL: String(profile.photoURL || '').trim(),
  }

  const base = await buildStudentReport(student, {})
  if (!base) return null

  const awrad = base.awrad || []
  const todayYmd = localYmd()

  const plans = (base.modules?.plans || []).map((plan) => {
    const progress = computePlanProgress(plan, awrad) || {
      achievedPages: 0,
      targetPages: Number(plan.totalTargetPages) || 0,
      remainingPages: Number(plan.totalTargetPages) || 0,
      progressPercent: 0,
      reachedPage: 0,
      nextFromPage: 1,
      minDaily: Math.max(1, Number(plan.dailyPages) || 1),
    }
    const dayStatus = getHomeWirdDayStatus(plan, awrad)
    const pagesOwed = getCumulativePagesOwedThrough(plan, awrad, todayYmd)
    return {
      id: plan.id,
      name: plan.name || plan.id,
      role: plan.planRole || '',
      roleLabel: planRoleLabelAr(plan.planRole),
      dailyPages: Math.max(1, Number(plan.dailyPages) || 1),
      ...progress,
      pagesOwed,
      todayComplete: dayStatus.isComplete,
      todayApplies: dayStatus.appliesToday,
      todayVariant: dayStatus.variant,
    }
  })

  const activities = (base.modules?.activities || []).map((activity) => {
    const contribution = String(activity.memberContributionText || '').trim()
    return {
      id: activity.id,
      name: activity.name || activity.id,
      role: activity.activityRole || '',
      roleLabel: planRoleLabelAr(activity.activityRole),
      startAt: activity.startAt || '',
      endAt: activity.endAt || '',
      contribution,
      hasContribution: Boolean(contribution),
      contributionUpdatedAt: activity.memberContributionUpdatedAt || '',
    }
  })

  const exams = (base.modules?.exams || []).map((exam) => {
    const status = String(exam.examSelfReportStatus || '').trim()
    const notes = String(exam.examSelfReportNotes || '').trim()
    return {
      id: exam.id,
      name: exam.name || exam.id,
      role: exam.examRole || '',
      roleLabel: planRoleLabelAr(exam.examRole),
      status,
      statusLabel: examSelfReportStatusLabel(status),
      statusStep: examSelfReportStepIndex(status),
      notes,
      isComplete: status === 'completed',
      updatedAt: exam.examSelfReportUpdatedAt || '',
    }
  })

  const plansWithTarget = plans.filter((p) => p.targetPages > 0)
  const avgPlanPercent =
    plansWithTarget.length > 0
      ? plansWithTarget.reduce((sum, p) => sum + (p.progressPercent || 0), 0) / plansWithTarget.length
      : 0

  return {
    student,
    plans,
    activities,
    exams,
    summary: {
      plansCount: plans.length,
      plansAvgPercent: Math.round(avgPlanPercent),
      plansPagesDone: plans.reduce((sum, p) => sum + (p.achievedPages || 0), 0),
      plansPagesRemaining: plans.reduce((sum, p) => sum + (p.remainingPages || 0), 0),
      plansPagesTarget: plans.reduce((sum, p) => sum + (p.targetPages || 0), 0),
      activitiesCount: activities.length,
      activitiesWithContribution: activities.filter((a) => a.hasContribution).length,
      activitiesPending: activities.filter((a) => !a.hasContribution).length,
      examsCount: exams.length,
      examsCompleted: exams.filter((e) => e.isComplete).length,
      examsPending: exams.filter((e) => !e.isComplete).length,
      totalAwradPages: base.summary?.totalPages || 0,
    },
  }
}

/** ملخصات متعددة لقائمة الأعضاء */
export async function fetchStudentProgressSummaries(uids = []) {
  const unique = [...new Set((uids || []).map((id) => String(id || '').trim()).filter(Boolean))]
  if (!unique.length) return {}

  const entries = await Promise.all(
    unique.map(async (uid) => {
      try {
        const report = await buildStudentProgressReport(uid)
        return [uid, report?.summary || null]
      } catch {
        return [uid, null]
      }
    }),
  )

  const out = {}
  for (const [uid, summary] of entries) {
    if (summary) out[uid] = summary
  }
  return out
}
