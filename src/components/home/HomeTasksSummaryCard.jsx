import { ArrowLeft, ListChecks } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { HapticLink } from '../../ui/HapticLink.jsx'
import { useSiteContent } from '../../context/useSiteContent.js'
import { subscribeHomeworkLogsForUser } from '../../services/homeworkLogService.js'
import { useTasksStore } from '../../stores/useTasksStore.js'
import { computeDailyHomeworkSummary } from '../../utils/dailyHomeworkSummary.js'
import { localYmd } from '../../utils/planDailyQuota.js'
import { withImpersonationQuery } from '../../utils/impersonation.js'
import { RhIcon, RH_ICON_STROKE } from '../../ui/RhIcon.jsx'

export function HomeTasksSummaryCard({ userId, impersonateUid = '' }) {
  const { taskCategories, str } = useSiteContent()
  const tasks = useTasksStore((s) => s.tasks)
  const workspaceLoading = useTasksStore((s) => s.workspaceLoading)
  const [homeworkLogs, setHomeworkLogs] = useState([])

  const todayYmd = useMemo(() => localYmd(), [])
  const categories = useMemo(
    () => [...(taskCategories || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [taskCategories],
  )

  useEffect(() => {
    if (!userId) {
      setHomeworkLogs([])
      return undefined
    }
    return subscribeHomeworkLogsForUser(userId, setHomeworkLogs, () => {})
  }, [userId])

  const summary = useMemo(
    () =>
      computeDailyHomeworkSummary({
        categories,
        homeworkLogs,
        tasks,
        todayYmd,
      }),
    [categories, homeworkLogs, tasks, todayYmd],
  )

  const tasksPath = withImpersonationQuery('/app/tasks', impersonateUid)

  return (
    <section className="card rh-home-tasks-summary">
      <div className="rh-home-tasks-summary__head">
        <div>
          <h2 className="rh-home-tasks-summary__title">{str('app.home_tasks_summary_title')}</h2>
          <p className="rh-home-tasks-summary__lead">{str('app.home_tasks_summary_lead')}</p>
        </div>
        <RhIcon as={ListChecks} size={28} strokeWidth={1.65} className="rh-home-tasks-summary__icon" />
      </div>

      {workspaceLoading ? (
        <p className="rh-home-tasks-summary__loading">{str('tasks.updating')}</p>
      ) : summary.totalToday === 0 ? (
        <p className="rh-home-tasks-summary__empty">{str('app.home_tasks_summary_empty')}</p>
      ) : (
        <div className="rh-home-tasks-summary__stats">
          <div className="rh-home-tasks-summary__stat">
            <span className="rh-home-tasks-summary__stat-val">{summary.totalToday}</span>
            <span className="rh-home-tasks-summary__stat-key">
              {str('app.home_tasks_summary_count', { count: summary.totalToday })}
            </span>
          </div>
          <div className="rh-home-tasks-summary__stat rh-home-tasks-summary__stat--success">
            <span className="rh-home-tasks-summary__stat-val">{summary.completionPercent}%</span>
            <span className="rh-home-tasks-summary__stat-key">{str('app.home_tasks_summary_done')}</span>
          </div>
          <div className="rh-home-tasks-summary__stat rh-home-tasks-summary__stat--warn">
            <span className="rh-home-tasks-summary__stat-val">{summary.delayPercent}%</span>
            <span className="rh-home-tasks-summary__stat-key">{str('app.home_tasks_summary_late')}</span>
          </div>
        </div>
      )}

      <HapticLink to={tasksPath} className="rh-home-tasks-summary__cta">
        {summary.notDone > 0
          ? str('app.home_cross_tasks', { count: summary.notDone })
          : str('layout.nav_tasks')}
        <RhIcon as={ArrowLeft} size={18} strokeWidth={RH_ICON_STROKE} />
      </HapticLink>
    </section>
  )
}
