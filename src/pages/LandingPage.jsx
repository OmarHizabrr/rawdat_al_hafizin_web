import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ProgramSections } from '../components/ProgramSections.jsx'
import { SITE_TITLE } from '../config/site.js'

export default function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = SITE_TITLE
  }, [])

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-inner">
          <img className="logo" src="/logo.png" alt="شعار روضة الحافظين" width={120} height={120} />
          <p className="eyebrow">بجمع الشيخ يحيى بن عبد العزيز اليحيى</p>
          <h1>روضة الحافظين</h1>
          <p className="subtitle">برنامج تحفيظ السنة النبوية — منصة ويب تدعم الهاتف والمتصفح</p>
          <button type="button" className="cta" onClick={() => navigate('/login')}>
            ابدأ رحلتك إلى هنا
          </button>
        </div>
      </header>

      <main className="content">
        <ProgramSections />

        <section id="start-journey" className="card cta-panel" aria-label="بداية الرحلة">
          <h2>بداية رحلتك</h2>
          <p>للمتابعة إلى المنصة وتسجيل الدخول عبر Google، اضغط الزر أعلاه أو من هنا.</p>
          <p className="landing-kit-link">
            <button type="button" className="rh-link-btn" onClick={() => navigate('/login')}>
              الانتقال إلى تسجيل الدخول
            </button>
            {' · '}
            <Link to="/foundation">أساس الواجهة (للمطورين)</Link>
          </p>
        </section>
      </main>

      <footer className="footer">
        <p>روضة الحافظين — برنامج تحفيظ السنة النبوية</p>
        <p className="footer-links">
          <Link to="/foundation">دليل المكوّنات</Link>
        </p>
      </footer>
    </div>
  )
}
