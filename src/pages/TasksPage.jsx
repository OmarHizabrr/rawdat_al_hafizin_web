import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ExternalLink, Loader2, RotateCcw } from 'lucide-react'
import { TaskStepper } from '../components/tasks/TaskStepper.jsx'
import { TASK_PROGRESS_STEPS, useTasksStore } from '../stores/useTasksStore.js'
import { useStudentWorkspace } from '../hooks/useStudentWorkspace.js'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { buildTaskHref } from '../utils/buildTaskHref.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
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
    <div className="rh-student-workspace tw-font-sans tw-text-slate-900" dir="rtl">
      <div className="tw-mx-auto tw-max-w-6xl tw-space-y-6">
        <header className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
          <div>
            <Link to={dashboardPath} className="tw-mb-2 tw-inline-flex tw-items-center tw-gap-1 tw-text-sm tw-font-semibold tw-text-sky-700 hover:tw-text-sky-900">
              <RhIcon as={ArrowRight} size={16} strokeWidth={RH_ICON_STROKE} />
              {str('layout.nav_dashboard')}
            </Link>
            <h1 className="tw-text-2xl tw-font-extrabold">{str('layout.nav_tasks')}</h1>
            <p className="tw-mt-1 tw-text-sm tw-text-slate-600">
              مرتبطة بخططك وأورادك واختباراتك — Stepper يعكس التقدّم الفعلي مع إمكانية التعديل اليدوي.
            </p>
          </div>
          {loading ? (
            <span className="tw-inline-flex tw-items-center tw-gap-2 tw-text-sm tw-text-slate-500">
              <RhIcon as={Loader2} size={16} strokeWidth={RH_ICON_STROKE} className="tw-animate-spin" />
              تحديث…
            </span>
          ) : (
            <span className="tw-rounded-full tw-bg-slate-100 tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-text-slate-700">
              {openCount} مفتوح · {builtTasks.length} إجمالي
            </span>
          )}
        </header>

        {!loading && tasks.length === 0 ? (
          <div className="tw-rounded-2xl tw-border tw-border-dashed tw-border-slate-300 tw-bg-slate-50 tw-p-8 tw-text-center">
            <p className="tw-text-sm tw-text-slate-600">لا توجد واجبات حالياً.</p>
            <p className="tw-mt-2 tw-text-xs tw-text-slate-500">انضم لخطة أو حلقة أو نشاط ليظهر واجبك هنا تلقائياً.</p>
            <div className="tw-mt-4 tw-flex tw-flex-wrap tw-justify-center tw-gap-2">
              <Link to={plansPath} className="tw-rounded-lg tw-bg-sky-600 tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white">
                {str('layout.nav_plans')}
              </Link>
              <Link to={homePath} className="tw-rounded-lg tw-border tw-border-slate-300 tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-slate-700">
                {str('layout.nav_home')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="tw-grid tw-grid-cols-1 tw-gap-6 lg:tw-grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
            <aside className="tw-space-y-3">
              <h2 className="tw-text-sm tw-font-bold tw-text-slate-700">قائمة الواجبات</h2>
              <ul className="tw-space-y-2">
                {tasks.map((task) => {
                  const selected = task.id === activeTask?.id
                  const manual = task.builtStep && task.step !== task.builtStep
                  const itemHref = buildTaskHref(task, impersonateUid)
                  return (
                    <li key={task.id}>
                      <div
                        className={[
                          'tw-w-full tw-rounded-xl tw-border tw-p-4 tw-transition',
                          selected
                            ? 'tw-border-sky-300 tw-bg-sky-50 tw-shadow-sm'
                            : 'tw-border-slate-200 tw-bg-white hover:tw-border-slate-300 hover:tw-bg-slate-50',
                        ].join(' ')}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveTaskId(task.id)}
                          className="tw-w-full tw-text-start"
                        >
                          <div className="tw-flex tw-items-start tw-justify-between tw-gap-2">
                            <div className="tw-min-w-0">
                              <p className="tw-font-bold tw-text-slate-900">{task.title}</p>
                              <p className="tw-mt-1 tw-line-clamp-2 tw-text-xs tw-text-slate-600">{task.description}</p>
                            </div>
                            <span className="tw-shrink-0 tw-rounded-full tw-bg-slate-100 tw-px-2 tw-py-0.5 tw-text-[0.65rem] tw-font-bold tw-text-slate-700">
                              {task.category}
                            </span>
                          </div>
                          <div className="tw-mt-2 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                            <p className="tw-text-xs tw-font-semibold tw-text-sky-700">{stepLabel(task.step)}</p>
                            {manual ? (
                              <span className="tw-rounded-full tw-bg-amber-100 tw-px-2 tw-py-0.5 tw-text-[0.6rem] tw-font-bold tw-text-amber-800">
                                تعديل يدوي
                              </span>
                            ) : null}
                            <span className="tw-text-[0.65rem] tw-text-slate-500">{task.dueLabel}</span>
                          </div>
                        </button>
                        {itemHref ? (
                          <div className="tw-mt-3 tw-flex tw-justify-end">
                            <Link
                              to={itemHref}
                              className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-lg tw-border tw-border-sky-200 tw-bg-sky-50 tw-px-2.5 tw-py-1 tw-text-[0.65rem] tw-font-bold tw-text-sky-800 hover:tw-bg-sky-100"
                            >
                              <RhIcon as={ExternalLink} size={12} strokeWidth={RH_ICON_STROKE} />
                              فتح
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </aside>

            <section className="tw-space-y-5 tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-sm sm:tw-p-6">
              {activeTask ? (
                <>
                  <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
                    <div>
                      <p className="tw-text-xs tw-font-bold tw-uppercase tw-tracking-wide tw-text-slate-500">{activeTask.category}</p>
                      <h2 className="tw-mt-1 tw-text-xl tw-font-extrabold">{activeTask.title}</h2>
                      <p className="tw-mt-2 tw-text-sm tw-leading-relaxed tw-text-slate-600">{activeTask.description}</p>
                      {activeTask.builtStep && activeTask.builtStep !== activeTask.step ? (
                        <p className="tw-mt-2 tw-text-xs tw-text-amber-700">
                          الحالة من البيانات: <strong>{stepLabel(activeTask.builtStep)}</strong>
                        </p>
                      ) : null}
                    </div>
                    <span className="tw-rounded-full tw-bg-amber-50 tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-text-amber-800">
                      {activeTask.dueLabel}
                    </span>
                  </div>

                  <div className="tw-rounded-xl tw-border tw-border-slate-100 tw-bg-slate-50 tw-p-4">
                    <p className="tw-mb-4 tw-text-sm tw-font-bold tw-text-slate-700">مراحل التقدّم</p>
                    <TaskStepper currentStep={activeTask.step} onStepClick={(stepId) => setTaskStep(activeTask.id, stepId)} />
                  </div>

                  <div className="tw-flex tw-flex-wrap tw-gap-2">
                    <button
                      type="button"
                      onClick={() => regressTask(activeTask.id)}
                      className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-lg tw-border tw-border-slate-300 tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-slate-700 hover:tw-bg-slate-50"
                    >
                      <RhIcon as={ChevronRight} size={16} strokeWidth={RH_ICON_STROKE} />
                      المرحلة السابقة
                    </button>
                    <button
                      type="button"
                      onClick={() => advanceTask(activeTask.id)}
                      className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-lg tw-bg-sky-600 tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-sky-700"
                    >
                      المرحلة التالية
                      <RhIcon as={ChevronLeft} size={16} strokeWidth={RH_ICON_STROKE} />
                    </button>
                    {activeTask.builtStep && activeTask.step !== activeTask.builtStep ? (
                      <button
                        type="button"
                        onClick={() => resetTaskToBuilt(activeTask.id)}
                        className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-lg tw-border tw-border-amber-200 tw-bg-amber-50 tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-amber-900 hover:tw-bg-amber-100"
                      >
                        <RhIcon as={RotateCcw} size={16} strokeWidth={RH_ICON_STROKE} />
                        إعادة لمزامنة البيانات
                      </button>
                    ) : null}
                    {taskLink ? (
                      <Link
                        to={taskLink}
                        className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-lg tw-border tw-border-sky-200 tw-bg-sky-50 tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-sky-800 hover:tw-bg-sky-100"
                      >
                        <RhIcon as={ExternalLink} size={16} strokeWidth={RH_ICON_STROKE} />
                        فتح الصفحة
                      </Link>
                    ) : null}
                  </div>

                  <p className="tw-text-xs tw-text-slate-500">
                    عند تسجيل الورد أو إتمام الاختبار أو كتابة المساهمة، تُحدَّث الحالة تلقائياً من بياناتك.
                  </p>
                </>
              ) : (
                <p className="tw-text-sm tw-text-slate-600">اختر واجباً من القائمة.</p>
              )}
            </section>
          </div>
        )}

        <footer className="tw-rounded-xl tw-border tw-border-dashed tw-border-slate-300 tw-bg-slate-50 tw-p-4 tw-text-center">
          <Link to={homePath} className="tw-inline-flex tw-items-center tw-gap-1 tw-text-sm tw-font-bold tw-text-slate-700 hover:tw-text-slate-900">
            <RhIcon as={ArrowLeft} size={16} strokeWidth={RH_ICON_STROKE} />
            العودة للرئيسية
          </Link>
        </footer>
      </div>
    </div>
  )
}
