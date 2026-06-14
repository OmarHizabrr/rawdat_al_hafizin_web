import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ExternalLink, Loader2, RotateCcw } from 'lucide-react'
import { TaskStepper } from '../components/tasks/TaskStepper.jsx'
import { TASK_PROGRESS_STEPS, useTasksStore } from '../stores/useTasksStore.js'
import { useStudentWorkspace } from '../hooks/useStudentWorkspace.js'
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
  const { loading, builtTasks } = useStudentWorkspace()

  const tasks = useTasksStore((s) => s.tasks)
  const activeTaskId = useTasksStore((s) => s.activeTaskId)
  const setActiveTaskId = useTasksStore((s) => s.setActiveTaskId)
  const setTaskStep = useTasksStore((s) => s.setTaskStep)
  const advanceTask = useTasksStore((s) => s.advanceTask)
  const regressTask = useTasksStore((s) => s.regressTask)
  const resetTaskToBuilt = useTasksStore((s) => s.resetTaskToBuilt)

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
            {str('layout.nav_dashboard')}
          </Link>
          <div className="rh-student-workspace__section-head">
            <div>
              <h1 className="rh-student-workspace__title">{str('layout.nav_tasks')}</h1>
              <p className="rh-student-workspace__lead">
                مرتبطة بخططك وأورادك واختباراتك — Stepper يعكس التقدّم الفعلي مع إمكانية التعديل اليدوي.
              </p>
            </div>
            {loading ? (
              <span className="rh-task-chip">
                <RhIcon as={Loader2} size={14} strokeWidth={RH_ICON_STROKE} className="rh-lucide" style={{ animation: 'rh-spin 1s linear infinite' }} />
                {' '}
                تحديث…
              </span>
            ) : (
              <span className="rh-task-chip">
                {openCount} مفتوح · {builtTasks.length} إجمالي
              </span>
            )}
          </div>
        </header>

        {!loading && tasks.length === 0 ? (
          <div className="rh-student-workspace__empty">
            <p className="rh-student-workspace__footer-text">لا توجد واجبات حالياً.</p>
            <p className="rh-student-workspace__menu-desc" style={{ marginTop: 'var(--rh-space-2)' }}>
              انضم لخطة أو حلقة أو نشاط ليظهر واجبك هنا تلقائياً.
            </p>
            <div className="rh-task-actions" style={{ justifyContent: 'center', marginTop: 'var(--rh-space-4)' }}>
              <Link to={plansPath} className="rh-student-workspace__cta">
                {str('layout.nav_plans')}
              </Link>
              <Link to={homePath} className="rh-student-workspace__footer-link">
                {str('layout.nav_home')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="rh-student-workspace__tasks-layout">
            <aside>
              <h2 className="rh-student-workspace__section-title">قائمة الواجبات</h2>
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
                          {manual ? <span className="rh-task-chip rh-task-chip--manual">تعديل يدوي</span> : null}
                          <span className="rh-task-chip">{task.dueLabel}</span>
                        </div>
                      </button>
                      {itemHref ? (
                        <div style={{ marginTop: 'var(--rh-space-3)', display: 'flex', justifyContent: 'flex-end' }}>
                          <Link to={itemHref} className="rh-student-workspace__urgent-open">
                            <RhIcon as={ExternalLink} size={12} strokeWidth={RH_ICON_STROKE} />
                            فتح
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
                          الحالة من البيانات: <strong>{stepLabel(activeTask.builtStep)}</strong>
                        </p>
                      ) : null}
                    </div>
                    <span className="rh-task-status-pill">{activeTask.dueLabel}</span>
                  </div>

                  <div className="rh-task-panel-box" style={{ marginTop: 'var(--rh-space-5)' }}>
                    <p className="rh-student-workspace__section-title" style={{ marginBottom: 'var(--rh-space-4)' }}>
                      مراحل التقدّم
                    </p>
                    <TaskStepper currentStep={activeTask.step} onStepClick={(stepId) => setTaskStep(activeTask.id, stepId)} />
                  </div>

                  <div className="rh-task-actions" style={{ marginTop: 'var(--rh-space-5)' }}>
                    <Button type="button" variant="secondary" icon={ChevronRight} onClick={() => regressTask(activeTask.id)}>
                      المرحلة السابقة
                    </Button>
                    <Button type="button" icon={ChevronLeft} onClick={() => advanceTask(activeTask.id)}>
                      المرحلة التالية
                    </Button>
                    {activeTask.builtStep && activeTask.step !== activeTask.builtStep ? (
                      <Button type="button" variant="secondary" icon={RotateCcw} onClick={() => resetTaskToBuilt(activeTask.id)}>
                        إعادة لمزامنة البيانات
                      </Button>
                    ) : null}
                    {taskLink ? (
                      <Link to={taskLink} className="rh-student-workspace__urgent-open">
                        <RhIcon as={ExternalLink} size={14} strokeWidth={RH_ICON_STROKE} />
                        فتح الصفحة
                      </Link>
                    ) : null}
                  </div>

                  <p className="rh-student-workspace__menu-desc" style={{ marginTop: 'var(--rh-space-4)' }}>
                    عند تسجيل الورد أو إتمام الاختبار أو كتابة المساهمة، تُحدَّث الحالة تلقائياً من بياناتك.
                  </p>
                </>
              ) : (
                <p className="rh-student-workspace__footer-text">اختر واجباً من القائمة.</p>
              )}
            </section>
          </div>
        )}

        <footer className="rh-student-workspace__footer" style={{ justifyContent: 'center' }}>
          <Link to={homePath} className="rh-student-workspace__footer-link">
            <RhIcon as={ArrowLeft} size={16} strokeWidth={RH_ICON_STROKE} />
            العودة للرئيسية
          </Link>
        </footer>
      </div>
    </div>
  )
}
