import { useEffect } from 'react'
import { ProgramSections } from '../components/ProgramSections.jsx'
import { SITE_TITLE } from '../config/site.js'

export default function WelcomePage() {
  useEffect(() => {
    document.title = `البداية — ${SITE_TITLE}`
  }, [])

  return (
    <div className="rh-app-welcome">
      <header className="rh-app-welcome__intro card">
        <h2>البداية — تعريف المنصة</h2>
        <p className="lead">نفس المحتوى التعريفي الذي تراه في الصفحة العامة، متاحاً هنا أثناء استخدامك للمنصة.</p>
      </header>
      <ProgramSections />
    </div>
  )
}
