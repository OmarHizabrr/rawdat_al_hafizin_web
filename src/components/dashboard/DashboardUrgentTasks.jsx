import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { TASK_PROGRESS_STEPS } from '../../stores/useTasksStore.js'
import { buildTaskHref } from '../../utils/buildTaskHref.js'
import { RhIcon, RH_ICON_STROKE } from '../../ui/RhIcon.jsx'

function stepLabel(stepId) {
  return TASK_PROGRESS_STEPS.find((s) => s.id === stepId)?.label || stepId
}

export function DashboardUrgentTasks({ tasks = [], impersonateUid = '', str }) {
  const urgent = (tasks || []).filter((t) => t.step !== 'done').slice(0, 3)
  if (!urgent.length) return null

  return (
    <section className="rh-student-workspace__urgent">
      <div className="rh-student-workspace__section-head">
        <h2 className="rh-student-workspace__section-title">{str('dashboard.urgent_title')}</h2>
        <Link
          to={buildTaskHref({ to: '/app/tasks' }, impersonateUid) || '/app/tasks'}
          className="rh-student-workspace__footer-link"
        >
          {str('dashboard.footer_go_tasks')}
          <RhIcon as={ArrowRight} size={14} strokeWidth={RH_ICON_STROKE} />
        </Link>
      </div>
      <ul className="rh-student-workspace__urgent-list">
        {urgent.map((task) => {
          const href = buildTaskHref(task, impersonateUid)
          return (
            <li key={task.id} className="rh-student-workspace__urgent-item">
              <div>
                <p className="rh-student-workspace__menu-title">{task.title}</p>
                <p className="rh-student-workspace__menu-desc">
                  {stepLabel(task.step)} · {task.dueLabel}
                </p>
              </div>
              {href ? (
                <Link to={href} className="rh-student-workspace__urgent-open">
                  <RhIcon as={ExternalLink} size={14} strokeWidth={RH_ICON_STROKE} />
                  {str('dashboard.task_open')}
                </Link>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
