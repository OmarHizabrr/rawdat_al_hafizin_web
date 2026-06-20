import { Link, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { HomeworkCategoriesPanel } from '../components/tasks/HomeworkCategoriesPanel.jsx'
import { SyncedTasksList } from '../components/tasks/SyncedTasksList.jsx'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export default function TasksPage() {
  const { user } = useAuth()
  const { str } = useSiteContent()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)
  const contextUserId = impersonateUid || user?.uid || ''
  const dashboardPath = withImpersonationQuery('/app/dashboard', impersonateUid)
  const defaultPlanId = impersonateUid ? '' : user?.defaultPlanId || ''

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
          </div>
        </header>

        <div className="rh-task-panel-box">
          <HomeworkCategoriesPanel userId={contextUserId} />
        </div>

        <SyncedTasksList
          userId={contextUserId}
          impersonateUid={impersonateUid}
          defaultPlanId={defaultPlanId}
        />

        <footer className="rh-student-workspace__footer" style={{ justifyContent: 'center' }}>
          <Link to={withImpersonationQuery('/app', impersonateUid)} className="rh-student-workspace__footer-link">
            {str('tasks.back_home')}
          </Link>
        </footer>
      </div>
    </div>
  )
}
