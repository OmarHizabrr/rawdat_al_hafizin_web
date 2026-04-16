import { useEffect } from 'react'
import { useAuth } from '../context/useAuth.js'
import { SITE_NAME, SITE_TITLE } from '../config/site.js'

export default function AppHomePage() {
  const { user } = useAuth()

  useEffect(() => {
    document.title = `الرئيسية — ${SITE_TITLE}`
  }, [])

  const name = user?.displayName?.trim() || 'ضيفنا الكريم'

  return (
    <div className="rh-app-home">
      <section className="card rh-app-home__hero">
        <h2>مرحباً، {name}</h2>
        <p className="lead">
          أهلاً بك في {SITE_NAME}. من هنا ستنطلق لحفظ السنة النبوية على منهج متدرّج — المحتوى التفصيلي سيُضاف
          تباعاً.
        </p>
      </section>
      <section className="card">
        <h2>ماذا بعد؟</h2>
        <p className="lead">استعرض «البداية» من القائمة الجانبية لقراءة تعريف البرنامج، أو انتقل لمسارات الحفظ عندما تكون جاهزة.</p>
      </section>
    </div>
  )
}
