import { Link, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import { ArrowRight, LayoutDashboard, ListChecks, Loader2 } from 'lucide-react'
import { DashboardMenuGrid } from '../components/dashboard/DashboardMenuGrid.jsx'
import { DashboardUrgentTasks } from '../components/dashboard/DashboardUrgentTasks.jsx'
import { buildDashboardMenuItems } from '../data/dashboardMenuItems.js'
import { useTasksStore } from '../stores/useTasksStore.js'
import { useStudentWorkspace } from '../hooks/useStudentWorkspace.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { isAdmin } from '../config/roles.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export default function DashboardPage() {
  const { user } = useAuth()
  const { str } = useSiteContent()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)
  const tasksPath = useMemo(() => withImpersonationQuery('/app/tasks', impersonateUid), [impersonateUid])
  const { ready: permReady, canAccessPage } = usePermissions()
  const { loading, plansCount, halakatCount, pendingTaskCount, workspace } = useStudentWorkspace()
  const tasks = useTasksStore((s) => s.tasks)

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.step === 'done').length
    const inProgress = tasks.filter((t) => t.step === 'in_progress').length
    const pending = tasks.filter((t) => t.step === 'pending').length
    return { total, done, inProgress, pending }
  }, [tasks])

  const visibleMenuItems = useMemo(() => {
    const visible = (item) =>
      !item.pageId || !permReady || isAdmin(user) || canAccessPage(item.pageId)
    return buildDashboardMenuItems(str).filter(visible).map((item) => {
      if (item.id === 'tasks' && pendingTaskCount > 0) {
        return { ...item, badge: `${pendingTaskCount} واجب` }
      }
      if (item.id === 'plans' && plansCount > 0) {
        return { ...item, badge: `${plansCount} خطة` }
      }
      if (item.id === 'halakat' && halakatCount > 0) {
        return { ...item, badge: `${halakatCount} حلقة` }
      }
      return item
    })
  }, [permReady, user, canAccessPage, pendingTaskCount, plansCount, halakatCount, str])

  const awradToday = useMemo(() => {
    const open = (workspace.plans || []).length
    const done = tasks.filter((t) => t.source === 'plan' && t.step === 'done').length
    return { open, done }
  }, [workspace.plans, tasks])

  return (
    <div className="rh-student-workspace tw-font-sans tw-text-slate-900" dir="rtl">
      <div className="tw-mx-auto tw-max-w-6xl tw-space-y-6">
        <header className="tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-gradient-to-l tw-from-sky-50 tw-to-white tw-p-5 tw-shadow-sm sm:tw-p-6">
          <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-4">
            <div className="tw-space-y-2">
              <div className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-full tw-bg-sky-100 tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-text-sky-800">
                <RhIcon as={LayoutDashboard} size={14} strokeWidth={RH_ICON_STROKE} />
                لوحة التحكم
              </div>
              <h1 className="tw-text-2xl tw-font-extrabold tw-tracking-tight sm:tw-text-3xl">{str('layout.nav_dashboard')}</h1>
              <p className="tw-max-w-2xl tw-text-sm tw-leading-relaxed tw-text-slate-600 sm:tw-text-base">
                {str('dashboard.lead')}
              </p>
            </div>
            <Link
              to={tasksPath}
              className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-xl tw-bg-sky-600 tw-px-4 tw-py-2.5 tw-text-sm tw-font-bold tw-text-white tw-shadow-sm hover:tw-bg-sky-700"
            >
              <RhIcon as={ListChecks} size={18} strokeWidth={RH_ICON_STROKE} />
              {str('layout.nav_tasks')}
              {pendingTaskCount > 0 ? (
                <span className="tw-rounded-full tw-bg-white/20 tw-px-2 tw-py-0.5 tw-text-xs">{pendingTaskCount}</span>
              ) : null}
            </Link>
          </div>

          {loading ? (
            <p className="tw-mt-5 tw-inline-flex tw-items-center tw-gap-2 tw-text-sm tw-text-slate-600">
              <RhIcon as={Loader2} size={16} strokeWidth={RH_ICON_STROKE} className="tw-animate-spin" />
              {str('dashboard.loading')}
            </p>
          ) : (
            <div className="tw-mt-5 tw-grid tw-grid-cols-2 tw-gap-3 sm:tw-grid-cols-4">
              {[
                { label: str('dashboard.kpi_open'), value: stats.total - stats.done },
                { label: str('dashboard.kpi_in_progress'), value: stats.inProgress },
                { label: str('dashboard.kpi_awrad_today'), value: `${awradToday.done}/${awradToday.open || '—'}` },
                { label: str('dashboard.kpi_done'), value: stats.done },
              ].map((kpi) => (
                <div key={kpi.label} className="tw-rounded-xl tw-border tw-border-white/80 tw-bg-white/80 tw-p-3 tw-text-center tw-shadow-sm">
                  <p className="tw-text-2xl tw-font-extrabold tw-text-slate-900">{kpi.value}</p>
                  <p className="tw-mt-1 tw-text-xs tw-font-semibold tw-text-slate-600">{kpi.label}</p>
                </div>
              ))}
            </div>
          )}
        </header>

        {!loading && pendingTaskCount > 0 ? (
          <DashboardUrgentTasks tasks={tasks} impersonateUid={impersonateUid} str={str} />
        ) : null}

        <section className="tw-space-y-4">
          <div className="tw-flex tw-items-center tw-justify-between tw-gap-3">
            <h2 className="tw-text-lg tw-font-bold">{str('dashboard.menu_title')}</h2>
            <span className="tw-text-xs tw-font-semibold tw-text-slate-500">{visibleMenuItems.length} قسم</span>
          </div>
          <DashboardMenuGrid items={visibleMenuItems} />
        </section>

        <footer className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-rounded-xl tw-border tw-border-dashed tw-border-slate-300 tw-bg-slate-50 tw-p-4">
          <p className="tw-text-sm tw-text-slate-600">
            {pendingTaskCount > 0
              ? str('dashboard.footer_pending', { count: pendingTaskCount })
              : str('dashboard.footer_all_clear')}
          </p>
          <Link to={tasksPath} className="tw-inline-flex tw-items-center tw-gap-1 tw-text-sm tw-font-bold tw-text-sky-700 hover:tw-text-sky-900">
            {str('dashboard.footer_go_tasks')}
            <RhIcon as={ArrowRight} size={16} strokeWidth={RH_ICON_STROKE} />
          </Link>
        </footer>
      </div>
    </div>
  )
}
