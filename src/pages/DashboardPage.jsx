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
    return { total, done, inProgress }
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
    <div className="rh-student-workspace" dir="rtl">
      <div className="rh-student-workspace__inner">
        <header className="rh-student-workspace__hero">
          <div className="rh-student-workspace__hero-top">
            <div>
              <div className="rh-student-workspace__eyebrow">
                <RhIcon as={LayoutDashboard} size={14} strokeWidth={RH_ICON_STROKE} />
                {str('layout.nav_dashboard')}
              </div>
              <h1 className="rh-student-workspace__title">{str('layout.nav_dashboard')}</h1>
              <p className="rh-student-workspace__lead">{str('dashboard.lead')}</p>
            </div>
            <Link to={tasksPath} className="rh-student-workspace__cta">
              <RhIcon as={ListChecks} size={18} strokeWidth={RH_ICON_STROKE} />
              {str('layout.nav_tasks')}
              {pendingTaskCount > 0 ? (
                <span className="rh-student-workspace__cta-badge">{pendingTaskCount}</span>
              ) : null}
            </Link>
          </div>

          {loading ? (
            <p className="rh-student-workspace__lead" style={{ marginTop: 'var(--rh-space-5)' }}>
              <RhIcon as={Loader2} size={16} strokeWidth={RH_ICON_STROKE} className="rh-lucide" style={{ animation: 'rh-spin 1s linear infinite' }} />
              {' '}
              {str('dashboard.loading')}
            </p>
          ) : (
            <div className="rh-student-workspace__kpis">
              {[
                { label: str('dashboard.kpi_open'), value: stats.total - stats.done },
                { label: str('dashboard.kpi_in_progress'), value: stats.inProgress },
                { label: str('dashboard.kpi_awrad_today'), value: `${awradToday.done}/${awradToday.open || '—'}` },
                { label: str('dashboard.kpi_done'), value: stats.done },
              ].map((kpi) => (
                <div key={kpi.label} className="rh-student-workspace__kpi">
                  <p className="rh-student-workspace__kpi-value">{kpi.value}</p>
                  <p className="rh-student-workspace__kpi-label">{kpi.label}</p>
                </div>
              ))}
            </div>
          )}
        </header>

        {!loading && pendingTaskCount > 0 ? (
          <DashboardUrgentTasks tasks={tasks} impersonateUid={impersonateUid} str={str} />
        ) : null}

        <section>
          <div className="rh-student-workspace__section-head">
            <h2 className="rh-student-workspace__section-title">{str('dashboard.menu_title')}</h2>
            <span className="rh-student-workspace__section-meta">{visibleMenuItems.length} قسم</span>
          </div>
          <div style={{ marginTop: 'var(--rh-space-4)' }}>
            <DashboardMenuGrid items={visibleMenuItems} />
          </div>
        </section>

        <footer className="rh-student-workspace__footer">
          <p className="rh-student-workspace__footer-text">
            {pendingTaskCount > 0
              ? str('dashboard.footer_pending', { count: pendingTaskCount })
              : str('dashboard.footer_all_clear')}
          </p>
          <Link to={tasksPath} className="rh-student-workspace__footer-link">
            {str('dashboard.footer_go_tasks')}
            <RhIcon as={ArrowRight} size={16} strokeWidth={RH_ICON_STROKE} />
          </Link>
        </footer>
      </div>
    </div>
  )
}
