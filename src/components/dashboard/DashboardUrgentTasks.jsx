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
    <section className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-amber-200/80 tw-bg-gradient-to-l tw-from-amber-50/80 tw-to-white tw-p-4 tw-shadow-sm sm:tw-p-5">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
        <h2 className="tw-text-base tw-font-bold tw-text-slate-900">{str('dashboard.urgent_title')}</h2>
        <Link
          to={buildTaskHref({ to: '/app/tasks' }, impersonateUid) || '/app/tasks'}
          className="tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-font-bold tw-text-sky-700 hover:tw-text-sky-900"
        >
          {str('dashboard.footer_go_tasks')}
          <RhIcon as={ArrowRight} size={14} strokeWidth={RH_ICON_STROKE} />
        </Link>
      </div>
      <ul className="tw-space-y-2">
        {urgent.map((task) => {
          const href = buildTaskHref(task, impersonateUid)
          return (
            <li
              key={task.id}
              className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-rounded-xl tw-border tw-border-white/80 tw-bg-white/90 tw-p-3"
            >
              <div className="tw-min-w-0 tw-flex-1">
                <p className="tw-font-bold tw-text-slate-900">{task.title}</p>
                <p className="tw-mt-0.5 tw-text-xs tw-text-slate-600">
                  {stepLabel(task.step)} · {task.dueLabel}
                </p>
              </div>
              {href ? (
                <Link
                  to={href}
                  className="tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1 tw-rounded-lg tw-bg-sky-600 tw-px-3 tw-py-1.5 tw-text-xs tw-font-bold tw-text-white hover:tw-bg-sky-700"
                >
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
