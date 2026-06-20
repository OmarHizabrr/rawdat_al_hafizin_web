import { ChevronLeft, ChevronRight, ExternalLink, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PlanWirdTaskDetail } from './PlanWirdTaskDetail.jsx'
import { TaskStepper } from './TaskStepper.jsx'
import { useSiteContent } from '../../context/useSiteContent.js'
import { TASK_PROGRESS_STEPS, useTasksStore } from '../../stores/useTasksStore.js'
import { buildTaskHref } from '../../utils/buildTaskHref.js'
import { subscribeAwrad } from '../../utils/awradStorage.js'
import { subscribePlans } from '../../utils/plansStorage.js'
import { Button } from '../../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../../ui/RhIcon.jsx'

function stepLabel(stepId) {
  return TASK_PROGRESS_STEPS.find((s) => s.id === stepId)?.label || stepId
}

function parsePlanIdFromTaskId(taskId) {
  if (!taskId?.startsWith('plan-wird:')) return ''
  return taskId.slice('plan-wird:'.length)
}

export function SyncedTasksList({ userId, impersonateUid = '', defaultPlanId = '' }) {
  const { str } = useSiteContent()
  const [searchParams, setSearchParams] = useSearchParams()
  const tasks = useTasksStore((s) => s.tasks)
  const workspaceLoading = useTasksStore((s) => s.workspaceLoading)
  const activeTaskId = useTasksStore((s) => s.activeTaskId)
  const setActiveTaskId = useTasksStore((s) => s.setActiveTaskId)
  const setTaskStep = useTasksStore((s) => s.setTaskStep)
  const advanceTask = useTasksStore((s) => s.advanceTask)
  const regressTask = useTasksStore((s) => s.regressTask)
  const resetTaskToBuilt = useTasksStore((s) => s.resetTaskToBuilt)

  const [plans, setPlans] = useState([])
  const [awrad, setAwrad] = useState([])

  const taskParam = searchParams.get('task')?.trim() || ''

  useEffect(() => {
    if (!userId) {
      setPlans([])
      setAwrad([])
      return undefined
    }
    const unsubP = subscribePlans(userId, setPlans)
    const unsubA = subscribeAwrad(userId, setAwrad)
    return () => {
      unsubP()
      unsubA()
    }
  }, [userId])

  useEffect(() => {
    if (!taskParam || !tasks.some((t) => t.id === taskParam)) return
    setActiveTaskId(taskParam)
  }, [taskParam, tasks, setActiveTaskId])

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeTaskId) || null,
    [tasks, activeTaskId],
  )

  const activePlan = useMemo(() => {
    const planId = parsePlanIdFromTaskId(activeTask?.id)
    if (!planId) return null
    return plans.find((p) => p.id === planId) || null
  }, [activeTask, plans])

  const openCount = tasks.filter((t) => t.step !== 'done').length
  const manualOverride =
    activeTask && activeTask.builtStep && activeTask.step !== activeTask.builtStep

  const selectTask = (taskId) => {
    setActiveTaskId(taskId)
    const next = new URLSearchParams(searchParams)
    if (taskId) next.set('task', taskId)
    else next.delete('task')
    setSearchParams(next, { replace: true })
  }

  if (!tasks.length && !workspaceLoading) {
    return (
      <section className="rh-student-workspace__empty">
        <h2 className="rh-student-workspace__section-title">{str('tasks.empty_title')}</h2>
        <p className="rh-student-workspace__menu-desc">{str('tasks.empty_hint')}</p>
      </section>
    )
  }

  return (
    <section className="rh-student-workspace__panel">
      <div className="rh-student-workspace__section-head">
        <div>
          <h2 className="rh-student-workspace__section-title">{str('tasks.sync_list_title')}</h2>
          <p className="rh-student-workspace__menu-desc">{str('tasks.auto_sync_note')}</p>
        </div>
        <span className="rh-task-chip">
          {workspaceLoading ? str('tasks.updating') : str('tasks.summary', { open: openCount, total: tasks.length })}
        </span>
      </div>

      <div className="rh-student-workspace__tasks-layout">
        <ul className="rh-student-workspace__task-list">
          {tasks.map((task) => {
            const isActive = task.id === activeTaskId
            return (
              <li
                key={task.id}
                className={[
                  'rh-student-workspace__task-card',
                  isActive ? 'rh-student-workspace__task-card--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <button
                  type="button"
                  className="rh-student-workspace__task-picker"
                  onClick={() => selectTask(task.id)}
                >
                  <p className="rh-student-workspace__menu-title">{task.title}</p>
                  <p className="rh-student-workspace__menu-desc">
                    {stepLabel(task.step)} · {task.dueLabel}
                    {task.category ? ` · ${task.category}` : ''}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="rh-student-workspace__panel" style={{ margin: 0 }}>
          {!activeTask ? (
            <p className="rh-student-workspace__menu-desc">{str('tasks.pick_one')}</p>
          ) : (
            <>
              <div className="rh-student-workspace__section-head">
                <h3 className="rh-student-workspace__section-title">{activeTask.title}</h3>
                {manualOverride ? (
                  <span className="rh-task-chip rh-task-chip--manual">{str('tasks.manual_badge')}</span>
                ) : null}
              </div>
              {activeTask.description ? (
                <p className="rh-student-workspace__menu-desc">{activeTask.description}</p>
              ) : null}
              {activeTask.dueLabel ? (
                <span className="rh-task-status-pill">{activeTask.dueLabel}</span>
              ) : null}

              <div style={{ marginTop: 'var(--rh-space-4)' }}>
                <h4 className="rh-student-workspace__section-title" style={{ fontSize: '0.95rem' }}>
                  {str('tasks.progress_title')}
                </h4>
                <p className="rh-student-workspace__menu-desc">{str('tasks.built_step_note')}</p>
                <TaskStepper
                  currentStep={activeTask.step}
                  onStepClick={(stepId) => setTaskStep(activeTask.id, stepId)}
                />
              </div>

              <div className="rh-task-actions" style={{ marginTop: 'var(--rh-space-4)' }}>
                <Button
                  type="button"
                  variant="secondary"
                  icon={ChevronRight}
                  disabled={activeTask.step === 'pending'}
                  onClick={() => regressTask(activeTask.id)}
                >
                  {str('tasks.step_prev')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  icon={ChevronLeft}
                  disabled={activeTask.step === 'done'}
                  onClick={() => advanceTask(activeTask.id)}
                >
                  {str('tasks.step_next')}
                </Button>
                {manualOverride ? (
                  <Button
                    type="button"
                    variant="ghost"
                    icon={RotateCcw}
                    onClick={() => resetTaskToBuilt(activeTask.id)}
                  >
                    {str('tasks.reset_sync')}
                  </Button>
                ) : null}
              </div>

              {activeTask.source === 'plan' && activePlan ? (
                <div style={{ marginTop: 'var(--rh-space-6)' }}>
                  <PlanWirdTaskDetail
                    plan={activePlan}
                    awrad={awrad}
                    contextUserId={userId}
                    isDefaultPlan={activePlan.id === defaultPlanId}
                  />
                </div>
              ) : null}

              {activeTask.source !== 'plan' ? (
                <div className="rh-task-actions" style={{ marginTop: 'var(--rh-space-4)' }}>
                  <Link
                    to={buildTaskHref(activeTask, impersonateUid)}
                    className="rh-student-workspace__cta"
                    style={{ fontSize: 'var(--rh-text-sm)' }}
                  >
                    <RhIcon as={ExternalLink} size={16} strokeWidth={RH_ICON_STROKE} />
                    {str('tasks.open_page')}
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
