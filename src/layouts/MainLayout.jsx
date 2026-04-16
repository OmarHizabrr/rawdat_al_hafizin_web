import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { UserMenu } from '../components/UserMenu.jsx'
import { useAuth } from '../context/useAuth.js'

const STORAGE_KEY = 'rh.sidebarCollapsed'

const nav = [
  { to: '/app', end: true, label: 'الرئيسية', icon: '🏠' },
  { to: '/app/welcome', label: 'البداية', icon: '📖' },
  { to: '/app/foundation', label: 'أساس الواجهة', icon: '🧩' },
]

export function MainLayout() {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  useEffect(() => {
    if (!mobileOpen) return
    const onResize = () => {
      if (window.matchMedia('(min-width: 900px)').matches) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [mobileOpen])

  return (
    <div className={['rh-app', collapsed ? 'rh-app--collapsed' : '', mobileOpen ? 'rh-app--mobile-nav' : '']
      .filter(Boolean)
      .join(' ')}>
      <aside className="rh-sidebar" aria-label="القائمة الرئيسية">
        <div className="rh-sidebar__brand">
          <img src="/logo.png" alt="" className="rh-sidebar__logo" width={40} height={40} />
          {!collapsed && <span className="rh-sidebar__title">روضة الحافظين</span>}
        </div>

        <nav className="rh-sidebar__nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) => ['rh-nav-link', isActive ? 'rh-nav-link--active' : ''].join(' ')}
              onClick={closeMobile}
            >
              <span className="rh-nav-link__icon" aria-hidden>
                {item.icon}
              </span>
              <span className="rh-nav-link__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="rh-sidebar__footer">
          <button
            type="button"
            className="rh-sidebar__collapse"
            onClick={() => setCollapsed((c) => !c)}
            aria-pressed={collapsed}
            title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            <span className="rh-sidebar__collapse-icon" aria-hidden>
              {collapsed ? '»' : '«'}
            </span>
            {!collapsed && <span>طي القائمة</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button type="button" className="rh-backdrop" aria-label="إغلاق القائمة" onClick={closeMobile} />
      )}

      <div className="rh-main">
        <header className="rh-topbar">
          <button
            type="button"
            className="rh-icon-btn rh-topbar__menu"
            aria-label="فتح القائمة"
            onClick={() => setMobileOpen(true)}
          >
            ☰
          </button>
          <h1 className="rh-topbar__heading">منصة روضة الحافظين</h1>
          <div className="rh-topbar__spacer" />
          {user && <UserMenu user={user} />}
        </header>

        <main className="rh-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
