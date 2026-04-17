import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  NotebookPen,
  Home,
  Menu,
  Puzzle,
  Settings,
  Users,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { UserMenu } from '../components/UserMenu.jsx'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePlanReminders } from '../hooks/usePlanReminders.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const STORAGE_KEY = 'rh.sidebarCollapsed'

const baseNav = [
  { to: '/app', end: true, label: 'الرئيسية', Icon: Home },
  { to: '/app/welcome', label: 'البداية', Icon: BookOpen },
  { to: '/app/plans', label: 'الخطط', Icon: ClipboardList },
  { to: '/app/awrad', label: 'الأوراد', Icon: NotebookPen },
  { to: '/app/settings', label: 'الإعدادات', Icon: Settings },
  { to: '/app/foundation', label: 'أساس الواجهة', Icon: Puzzle },
]

const adminNavItem = { to: '/app/admin/users', label: 'المستخدمون', Icon: Users }

export function MainLayout() {
  const { user } = useAuth()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)
  const nav = isAdmin(user) ? [...baseNav.slice(0, 4), adminNavItem, ...baseNav.slice(4)] : baseNav
  usePlanReminders(impersonateUid ? null : user)
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

  const closeMobile = useCallback(() => setMobileOpen(false), [setMobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const onResize = () => {
      if (window.matchMedia('(min-width: 900px)').matches) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [mobileOpen])

  const CollapseIcon = collapsed ? ChevronsLeft : ChevronsRight

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
              to={withImpersonationQuery(item.to, impersonateUid)}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) => ['rh-nav-link', isActive ? 'rh-nav-link--active' : ''].join(' ')}
              onClick={closeMobile}
            >
              <span className="rh-nav-link__icon" aria-hidden>
                <RhIcon as={item.Icon} size={20} strokeWidth={RH_ICON_STROKE} />
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
              <RhIcon as={CollapseIcon} size={20} strokeWidth={RH_ICON_STROKE} />
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
            <RhIcon as={Menu} size={22} strokeWidth={RH_ICON_STROKE} />
          </button>
          <h1 className="rh-topbar__heading">منصة روضة الحافظين</h1>
          <div className="rh-topbar__spacer" />
          {user && <UserMenu user={user} />}
        </header>

        <main className="rh-content">
          <div className="rh-mob-app-scaffold">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
