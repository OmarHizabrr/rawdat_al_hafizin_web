import { withImpersonationQuery } from './impersonation.js'

/** رابط الصفحة المناسبة لكل واجب */
export function buildTaskHref(task, impersonateUid = '') {
  if (!task) return ''
  let path = task.to || ''
  if (task.source === 'plan' && task.sourceId) {
    path = `/app/awrad?plan=${encodeURIComponent(task.sourceId)}`
  } else if (task.source === 'exam' && task.sourceId) {
    path = `/app/exams?exam=${encodeURIComponent(task.sourceId)}`
  } else if (task.source === 'activity' && task.sourceId) {
    path = `/app/activities?activity=${encodeURIComponent(task.sourceId)}`
  } else if (task.source === 'dawra' && task.sourceId) {
    path = `/app/dawrat?dawra=${encodeURIComponent(task.sourceId)}`
  } else if (task.source === 'halaka' && task.sourceId && task.sessionId) {
    path = `/app/halakat/${task.sourceId}/sessions/${task.sessionId}`
  } else if (task.source === 'halaka' && task.sourceId) {
    path = `/app/halakat/${task.sourceId}/sessions`
  }
  return path ? withImpersonationQuery(path, impersonateUid) : ''
}

/** رابط صفحة الواجبات مع تحديد واجب */
export function buildTasksPageHref(task, impersonateUid = '') {
  const base = task?.id
    ? `/app/tasks?task=${encodeURIComponent(task.id)}`
    : '/app/tasks'
  return withImpersonationQuery(base, impersonateUid)
}
