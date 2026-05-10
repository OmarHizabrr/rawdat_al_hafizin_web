import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProgramSections } from '../components/ProgramSections.jsx'
import { HapticLink } from '../ui/HapticLink.jsx'
import { rhHapticNavigate } from '../utils/haptics.js'
import { useSiteContent } from '../context/useSiteContent.js'

export default function LandingPage() {
  const navigate = useNavigate()
  const { branding, str } = useSiteContent()

  useEffect(() => {
    document.title = branding.siteTitle
  }, [branding.siteTitle])

  return (
    <div className="page rh-page-surface">
      <header className="hero">
        <div className="hero-inner">
          <img className="logo" src={branding.logoSrc} alt={str('landing.logo_alt')} width={120} height={120} />
          <p className="eyebrow">{str('landing.eyebrow')}</p>
          <h1>{str('landing.hero_title')}</h1>
          <p className="subtitle">{str('landing.subtitle')}</p>
          <button
            type="button"
            className="cta"
            onPointerDown={(e) => rhHapticNavigate(e)}
            onClick={() => navigate('/login')}
          >
            {str('landing.cta')}
          </button>
        </div>
      </header>

      <main className="content">
        <ProgramSections />

        <section id="start-journey" className="card cta-panel" aria-label={str('landing.section_start_title')}>
          <h2>{str('landing.section_start_title')}</h2>
          <p>{str('landing.section_start_p')}</p>
          <p className="landing-kit-link">
            <button
              type="button"
              className="rh-link-btn"
              onPointerDown={(e) => rhHapticNavigate(e)}
              onClick={() => navigate('/login')}
            >
              {str('landing.section_start_login_btn')}
            </button>
            {' · '}
            <HapticLink to="/foundation">{str('landing.section_start_foundation_link')}</HapticLink>
          </p>
        </section>
      </main>

      <footer className="footer">
        <p>{str('landing.footer_line')}</p>
        <p className="footer-links">
          <HapticLink to="/foundation">{str('landing.footer_kit_link')}</HapticLink>
        </p>
      </footer>
    </div>
  )
}
