import { findTodayHomeworkLog } from '../services/homeworkLogService.js'

function isDelayedTask(task) {
  if (!task || task.step === 'done') return false
  const label = String(task.dueLabel || '')
  return (
    label.includes('تعويض') ||
    label.includes('متأخر') ||
    label === 'مطلوب' ||
    label === 'اليوم — تعويض'
  )
}

/**
 * ملخص واجبات اليوم للعرض على الرئيسية.
 */
export function computeDailyHomeworkSummary({
  categories = [],
  homeworkLogs = [],
  tasks = [],
  todayYmd,
}) {
  const catTotal = categories.length
  let catCompleted = 0
  let catFailed = 0
  let catPending = 0

  for (const cat of categories) {
    const log = findTodayHomeworkLog(homeworkLogs, cat.value, todayYmd)
    if (log?.completed === true) catCompleted += 1
    else if (log?.completed === false) catFailed += 1
    else catPending += 1
  }

  const taskTotal = tasks.length
  const taskDone = tasks.filter((t) => t.step === 'done').length
  const taskDelayed = tasks.filter(isDelayedTask).length

  const totalToday = catTotal + taskTotal
  const completed = catCompleted + taskDone
  const notDone = totalToday - completed
  const delayed = catFailed + taskDelayed + catPending

  const completionPercent =
    totalToday > 0 ? Math.round((completed / totalToday) * 100) : 100
  const delayPercent = totalToday > 0 ? Math.round((delayed / totalToday) * 100) : 0

  return {
    totalToday,
    completed,
    notDone,
    delayed,
    open: notDone,
    completionPercent,
    delayPercent,
    catTotal,
    taskTotal,
    catPending,
  }
}
