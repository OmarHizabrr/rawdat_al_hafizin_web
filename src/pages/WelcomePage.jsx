import { useEffect, useMemo } from 'react'
import { CrossNav } from '../components/CrossNav.jsx'
import { ProgramSections } from '../components/ProgramSections.jsx'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'

export default function WelcomePage() {
  const { user } = useAuth()
  const { canAccessPage } = usePermissions()
  const { branding, str } = useSiteContent()

  const welcomeCrossItems = useMemo(() => {
    const base = [
      { to: '/app', label: str('layout.nav_home') },
      { to: '/app/plans', label: str('layout.nav_plans') },
    ]
    if (canAccessPage('halakat')) {
      base.push({ to: '/app/halakat', label: str('layout.nav_halakat') })
    }
    if (canAccessPage('dawrat')) {
      base.push({ to: '/app/dawrat', label: str('layout.nav_dawrat') })
    }
    base.push({ to: '/app/awrad', label: str('layout.nav_awrad') })
    if (canAccessPage('leave_request')) {
      base.push({ to: '/app/leave-request', label: str('layout.nav_leave_request') })
    }
    if (canAccessPage('certificates')) {
      base.push({ to: '/app/certificates', label: str('layout.nav_certificates') })
    }
    base.push({ to: '/app/settings', label: str('layout.nav_settings') })
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
      base.push({ to: '/app/admin/users', label: str('layout.nav_users') })
    }
    return base
  }, [user, str, canAccessPage])

  useEffect(() => {
    document.title = `البداية — ${branding.siteTitle}`
  }, [branding.siteTitle])

  return (
    <div className="rh-app-welcome">
      <header className="rh-app-welcome__intro card">
        <h2>البداية — تعريف المنصة</h2>
        <p className="lead">نفس المحتوى التعريفي الذي تراه في الصفحة العامة، متاحاً هنا أثناء استخدامك للمنصة.</p>
        <CrossNav items={welcomeCrossItems} className="rh-app-welcome__cross" />
      </header>
      <ProgramSections />
    </div>
  )
}
