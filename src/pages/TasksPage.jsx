import { Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ExternalLink, Loader2, RotateCcw } from 'lucide-react'
import { HomeworkCategoriesPanel } from '../components/tasks/HomeworkCategoriesPanel.jsx'
import { TaskStepper } from '../components/tasks/TaskStepper.jsx'
import { TASK_PROGRESS_STEPS, useTasksStore } from '../stores/useTasksStore.js'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { buildTaskHref } from '../utils/buildTaskHref.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { Button } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function stepLabel(stepId) {
  return TASK_PROGRESS_STEPS.find((s) => s.id === stepId)?.label || stepId
}

export default function TasksPage() {
  const { user } = useAuth()
  const { str } = useSiteContent()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)
  const contextUserId = impersonateUid || user?.uid || ''
  const loading = useTasksStore((s) => s.workspaceLoading)

  const tasks = useTasksStore((s) => s.tasks)
  const activeTaskId = useTasksStore((s) => s.activeTaskId)
  const setActiveTaskId = useTasksStore((s) => s.setActiveTaskId)
  const setTaskStep = useTasksStore((s) => s.setTaskStep)
  const advanceTask = useTasksStore((s) => s.advanceTask)
  const regressTask = useTasksStore((s) => s.regressTask)
  const resetTaskToBuilt = useTasksStore((s) => s.resetTaskToBuilt)

  useEffect(() => {
    const taskId = new URLSearchParams(search).get('task')?.trim()
    if (!taskId) return
    if (tasks.some((t) => t.id === taskId)) setActiveTaskId(taskId)
  }, [search, tasks, setActiveTaskId])

  const activeTask = tasks.find((t) => t.id === activeTaskId) || tasks[0] || null
  const openCount = tasks.filter((t) => t.step !== 'done').length
  const taskLink = buildTaskHref(activeTask, impersonateUid)
  const dashboardPath = withImpersonationQuery('/app/dashboard', impersonateUid)
  const homePath = withImpersonationQuery('/app', impersonateUid)
  const plansPath = withImpersonationQuery('/app/plans', impersonateUid)

  return (
    <div className="rh-student-workspace" dir="rtl">
      <div className="rh-student-workspace__inner">
        <header>
          <Link to={dashboardPath} className="rh-student-workspace__back-link">
            <RhIcon as={ArrowRight} size={16} strokeWidth={RH_ICON_STROKE} />
            {str('layout.nav_my_board')}
          </Link>
          <div className="rh-student-workspace__section-head">
            <div>
              <h1 className="rh-student-workspace__title">{str('layout.nav_tasks')}</h1>
              <p className="rh-student-workspace__lead">{str('tasks.lead')}</p>
            </div>
            {loading ? (
              <span className="rh-task-chip">
                <RhIcon as={Loader2} size={14} strokeWidth={RH_ICON_STROKE} className="rh-lucide" style={{ animation: 'rh-spin 1s linear infinite' }} />
                {' '}
                {str('tasks.updating')}
              </span>
            ) : (
              <span className="rh-task-chip">
                {str('tasks.summary', { open: openCount, total: tasks.length })}
              </span>
            )}
          </div>
        </header>

        <div className="rh-task-panel-box" style={{ marginBottom: 'var(--rh-space-5)' }}>
          <HomeworkCategoriesPanel userId={contextUserId} />
        </div>

        {!loading && tasks.length === 0 ? (
          <div className="rh-student-workspace__empty" style={{ marginTop: 'var(--rh-space-4)' }}>
            <p className="rh-student-workspace__menu-desc">{str('tasks.sync_empty_hint')}</p>
            <div className="rh-task-actions" style={{ justifyContent: 'center', marginTop: 'var(--rh-space-4)' }}>
              <Link to={plansPath} className="rh-student-workspace__cta">
                {str('layout.nav_plans')}
              </Link>
              <Link to={homePath} className="rh-student-workspace__footer-link">
                {str('layout.nav_home')}
              </Link>
            </div>
          </div>
        ) : loading || tasks.length > 0 ? (
          <div className="rh-student-workspace__tasks-layout">
            <aside>
              <h2 className="rh-student-workspace__section-title">{str('tasks.sync_list_title')}</h2>
              <ul className="rh-student-workspace__task-list" style={{ marginTop: 'var(--rh-space-3)' }}>
                {tasks.map((task) => {
                  const selected = task.id === activeTask?.id
                  const manual = task.builtStep && task.step !== task.builtStep
                  const itemHref = buildTaskHref(task, impersonateUid)
                  return (
                    <li
                      key={task.id}
                      className={[
                        'rh-student-workspace__task-card',
                        selected ? 'rh-student-workspace__task-card--active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveTaskId(task.id)}
                        className="rh-student-workspace__task-picker"
                      >
                        <div className="rh-student-workspace__section-head" style={{ alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0 }}>
                            <p className="rh-student-workspace__menu-title">{task.title}</p>
                            <p className="rh-student-workspace__menu-desc">{task.description}</p>
                          </div>
                          <span className="rh-task-chip">{task.category}</span>
                        </div>
                        <div className="rh-task-actions" style={{ marginTop: 'var(--rh-space-2)' }}>
                          <span className="rh-task-chip" style={{ color: 'var(--rh-primary)' }}>
                            {stepLabel(task.step)}
                          </span>
                          {manual ? <span className="rh-task-chip rh-task-chip--manual">{str('tasks.manual_badge')}</span> : null}
                          <span className="rh-task-chip">{task.dueLabel}</span>
                        </div>
                      </button>
                      {itemHref ? (
                        <div style={{ marginTop: 'var(--rh-space-3)', display: 'flex', justifyContent: 'flex-end' }}>
                          <Link to={itemHref} className="rh-student-workspace__urgent-open">
                            <RhIcon as={ExternalLink} size={12} strokeWidth={RH_ICON_STROKE} />
                            {str('tasks.open_short')}
                          </Link>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </aside>

            <section className="rh-student-workspace__panel">
              {activeTask ? (
                <>
                  <div className="rh-student-workspace__section-head" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <p className="rh-student-workspace__section-meta">{activeTask.category}</p>
                      <h2 className="rh-student-workspace__title" style={{ fontSize: '1.25rem' }}>
                        {activeTask.title}
                      </h2>
                      <p className="rh-student-workspace__lead">{activeTask.description}</p>
                      {activeTask.builtStep && activeTask.builtStep !== activeTask.step ? (
                        <p className="rh-student-workspace__menu-desc" style={{ color: 'var(--rh-warning)' }}>
                          {str('tasks.built_step_note', { step: stepLabel(activeTask.builtStep) })}
                        </p>
                      ) : null}
                    </div>
                    <span className="rh-task-status-pill">{activeTask.dueLabel}</span>
                  </div>

                  <div className="rh-task-panel-box" style={{ marginTop: 'var(--rh-space-5)' }}>
                    <p className="rh-student-workspace__section-title" style={{ marginBottom: 'var(--rh-space-4)' }}>
                      {str('tasks.progress_title')}
                    </p>
                    <TaskStepper currentStep={activeTask.step} onStepClick={(stepId) => setTaskStep(activeTask.id, stepId)} />
                  </div>

                  <div className="rh-task-actions" style={{ marginTop: 'var(--rh-space-5)' }}>
                    <Button type="button" variant="secondary" icon={ChevronRight} onClick={() => regressTask(activeTask.id)}>
                      {str('tasks.step_prev')}
                    </Button>
                    <Button type="button" icon={ChevronLeft} onClick={() => advanceTask(activeTask.id)}>
                      {str('tasks.step_next')}
                    </Button>
                    {activeTask.builtStep && activeTask.step !== activeTask.builtStep ? (
                      <Button type="button" variant="secondary" icon={RotateCcw} onClick={() => resetTaskToBuilt(activeTask.id)}>
                        {str('tasks.reset_sync')}
                      </Button>
                    ) : null}
                    {taskLink ? (
                      <Link to={taskLink} className="rh-student-workspace__urgent-open">
                        <RhIcon as={ExternalLink} size={14} strokeWidth={RH_ICON_STROKE} />
                        {str('tasks.open_page')}
                      </Link>
                    ) : null}
                  </div>

                  <p className="rh-student-workspace__menu-desc" style={{ marginTop: 'var(--rh-space-4)' }}>
                    {str('tasks.auto_sync_note')}
                  </p>
                </>
              ) : (
                <p className="rh-student-workspace__footer-text">{str('tasks.pick_one')}</p>
              )}
            </section>
          </div>
        ) : null}

        <footer className="rh-student-workspace__footer" style={{ justifyContent: 'center' }}>
          <Link to={homePath} className="rh-student-workspace__footer-link">
            <RhIcon as={ArrowLeft} size={16} strokeWidth={RH_ICON_STROKE} />
            {str('tasks.back_home')}
          </Link>
        </footer>
      </div>
    </div>
  )
}
