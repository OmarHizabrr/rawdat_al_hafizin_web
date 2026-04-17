import { useEffect, useMemo } from 'react'
import { CrossNav } from '../components/CrossNav.jsx'
import { ProgramSections } from '../components/ProgramSections.jsx'
import { isAdmin } from '../config/roles.js'
import { SITE_TITLE } from '../config/site.js'
import { useAuth } from '../context/useAuth.js'

export default function WelcomePage() {
  const { user } = useAuth()

  const welcomeCrossItems = useMemo(() => {
    const base = [
      { to: '/app', label: 'الرئيسية' },
      { to: '/app/plans', label: 'الخطط' },
      { to: '/app/awrad', label: 'الأوراد' },
      { to: '/app/settings', label: 'الإعدادات' },
    ]
    if (isAdmin(user)) base.push({ to: '/app/admin/users', label: 'المستخدمون' })
    return base
  }, [user])

  useEffect(() => {
    document.title = `البداية — ${SITE_TITLE}`
  }, [])

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
