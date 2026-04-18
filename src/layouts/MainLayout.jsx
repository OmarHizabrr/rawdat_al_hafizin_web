import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Compass,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  Home,
  Menu,
  Puzzle,
  Settings,
  Users,
  UsersRound,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { UserMenu } from '../components/UserMenu.jsx'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { usePlanReminders } from '../hooks/usePlanReminders.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const STORAGE_KEY = 'rh.sidebarCollapsed'

export function MainLayout() {
  const { user } = useAuth()
  const { ready: permReady, canAccessPage } = usePermissions()
  const { str, branding } = useSiteContent()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)

  const baseNav = useMemo(
    () => [
      { to: '/app', end: true, label: str('layout.nav_home'), Icon: Home, pageId: 'home' },
      { to: '/app/welcome', label: str('layout.nav_welcome'), Icon: BookOpen, pageId: 'welcome' },
      { to: '/app/plans', label: str('layout.nav_plans'), Icon: ClipboardList, pageId: 'plans' },
      { to: '/app/plans/explore', label: str('layout.nav_plans_explore'), Icon: Compass, pageId: 'plans_explore' },
      { to: '/app/halakat', label: str('layout.nav_halakat'), Icon: UsersRound, pageId: 'halakat' },
      { to: '/app/halakat/explore', label: str('layout.nav_halakat_explore'), Icon: Compass, pageId: 'halakat_explore' },
      { to: '/app/dawrat', label: str('layout.nav_dawrat'), Icon: GraduationCap, pageId: 'dawrat' },
      { to: '/app/dawrat/explore', label: str('layout.nav_dawrat_explore'), Icon: Compass, pageId: 'dawrat_explore' },
      { to: '/app/awrad', label: str('layout.nav_awrad'), Icon: NotebookPen, pageId: 'awrad' },
      { to: '/app/settings', label: str('layout.nav_settings'), Icon: Settings, pageId: 'settings' },
      { to: '/app/foundation', label: str('layout.nav_foundation'), Icon: Puzzle, pageId: 'foundation' },
    ],
    [str],
  )

  const adminNavItems = useMemo(
    () => [
      { to: '/app/admin', label: str('layout.nav_dashboard'), Icon: LayoutDashboard },
      { to: '/app/admin/users', label: str('layout.nav_users'), Icon: Users },
    ],
    [str],
  )

  const nav = useMemo(() => {
    const visible = (item) =>
      !item.pageId || !permReady || isAdmin(user) || canAccessPage(item.pageId)
    const filtered = baseNav.filter(visible)
    return isAdmin(user) ? [...filtered.slice(0, 9), ...adminNavItems, ...filtered.slice(9)] : filtered
  }, [baseNav, adminNavItems, user, permReady, canAccessPage])
  usePlanReminders(impersonateUid ? null : user, { iconSrc: branding.logoSrc })
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
        <NavLink
          to={withImpersonationQuery('/app', impersonateUid)}
          end
          className={({ isActive }) =>
            ['rh-sidebar__brand', 'rh-sidebar__brand-link', isActive ? 'rh-sidebar__brand-link--active' : '']
              .filter(Boolean)
              .join(' ')
          }
          onClick={closeMobile}
          aria-label={str('layout.sidebar_brand_aria')}
        >
          <img src={branding.logoSrc} alt="" className="rh-sidebar__logo" width={40} height={40} />
          {!collapsed && <span className="rh-sidebar__title">{str('layout.sidebar_title')}</span>}
        </NavLink>

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
            title={collapsed ? str('layout.collapse_expand') : str('layout.collapse_collapse')}
          >
            <span className="rh-sidebar__collapse-icon" aria-hidden>
              <RhIcon as={CollapseIcon} size={20} strokeWidth={RH_ICON_STROKE} />
            </span>
            {!collapsed && <span>{str('layout.collapse_label')}</span>}
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
          <h1 className="rh-topbar__heading">
            <NavLink
              to={withImpersonationQuery('/app', impersonateUid)}
              end
              className={({ isActive }) =>
                ['rh-topbar__home-link', isActive ? 'rh-topbar__home-link--active' : ''].filter(Boolean).join(' ')
              }
              onClick={closeMobile}
            >
              {str('layout.topbar_heading')}
            </NavLink>
          </h1>
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
