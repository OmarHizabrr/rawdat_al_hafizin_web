import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronsLeft, ChevronsRight, Menu } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { MobileBottomNav } from '../components/MobileBottomNav.jsx'
import { UserNotificationsMenu } from '../components/UserNotificationsMenu.jsx'
import { UserMenu } from '../components/UserMenu.jsx'
import { buildAppNav, buildBottomNavTabs } from '../config/appNav.js'
import { normalizeRole } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { usePlanReminders } from '../hooks/usePlanReminders.js'
import { useMobileLayout } from '../hooks/useMobileLayout.js'
import { useStudentWorkspace } from '../hooks/useStudentWorkspace.js'
import { useTasksStore } from '../stores/useTasksStore.js'
import { PROFILE_REQUEST_STATUS } from '../services/profileRequestService.js'
import { syncFcmTokenToProfile } from '../services/pushNotificationsService.js'
import { upsertUserNotification } from '../services/userNotificationsService.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { rhHapticChromeTap, rhHapticNavigate } from '../utils/haptics.js'
import { notificationsEnabled } from '../utils/notificationsPrefs.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const STORAGE_KEY = 'rh.sidebarCollapsed'

export function MainLayout() {
  const { user } = useAuth()
  const { ready: permReady, canAccessPage } = usePermissions()
  const { str, branding } = useSiteContent()
  const { pathname, search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)
  const navRef = useRef(null)

  const nav = useMemo(
    () => buildAppNav({ str, user, permReady, canAccessPage }),
    [str, user, permReady, canAccessPage],
  )

  const bottomNavTabs = useMemo(
    () => buildBottomNavTabs({ str, user, permReady, canAccessPage }),
    [str, user, permReady, canAccessPage],
  )

  const showBottomNav = bottomNavTabs.length > 0
  const isMobileLayout = useMobileLayout()
  const showMobileBottomNav = showBottomNav && isMobileLayout
  useStudentWorkspace()
  const openTaskCount = useTasksStore((s) => s.tasks.filter((t) => t.step !== 'done').length)

  const bottomNavTabsWithBadges = useMemo(
    () =>
      bottomNavTabs.map((tab) =>
        tab.to === '/app/tasks' && openTaskCount > 0 ? { ...tab, badge: openTaskCount } : tab,
      ),
    [bottomNavTabs, openTaskCount],
  )
  usePlanReminders(impersonateUid || user?.hideHomePlanUi ? null : user, { iconSrc: branding.logoSrc })
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

  useEffect(() => {
    const navEl = navRef.current
    if (!navEl) return
    const active = navEl.querySelector('.rh-nav-link--active')
    if (!active) return
    active.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pathname, mobileOpen, collapsed])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    const main = document.querySelector('.rh-main')
    if (main && typeof main.scrollTop === 'number') main.scrollTop = 0
  }, [pathname])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    if (!mobileOpen) {
      document.body.style.removeProperty('overflow')
      return undefined
    }
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.removeProperty('overflow')
    }
  }, [mobileOpen])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const root = document.documentElement
    if (!showMobileBottomNav) {
      root.classList.remove('rh-has-bottom-nav')
      root.style.removeProperty('--rh-bottom-nav-h')
      return undefined
    }
    root.classList.add('rh-has-bottom-nav')
    root.style.setProperty('--rh-bottom-nav-h', 'calc(3.75rem + env(safe-area-inset-bottom, 0px))')
    return () => {
      root.classList.remove('rh-has-bottom-nav')
      root.style.removeProperty('--rh-bottom-nav-h')
    }
  }, [showMobileBottomNav])

  useEffect(() => {
    if (typeof window === 'undefined' || impersonateUid) return undefined
    if (!notificationsEnabled()) return undefined
    const askPermission = () => {
      if (!('Notification' in window)) return
      if (Notification.permission !== 'default') return
      Notification.requestPermission().catch(() => {})
    }
    const onInstalled = () => {
      try {
        const key = 'rh.notifications.installPermissionAsked'
        if (localStorage.getItem(key)) return
        localStorage.setItem(key, '1')
      } catch {
        /* ignore */
      }
      askPermission()
    }
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [impersonateUid])

  useEffect(() => {
    if (!user?.uid || impersonateUid) return undefined
    let mounted = true
    syncFcmTokenToProfile(user)
      .then((res) => {
        if (!mounted || !res || res.ok) return
        if (res.reason === 'MISSING_VAPID_KEY') {
          console.warn('[push] VITE_FIREBASE_VAPID_KEY is missing — set it at build time for FCM tokens')
        }
      })
      .catch((e) => {
        if (mounted) console.warn('[push] syncFcmTokenToProfile failed', e)
      })
    return () => {
      mounted = false
    }
    // uid فقط: تحديث مستند المستخدم (مثلاً pushToken) يُعيد إنشاء كائن user في AuthProvider؛ [user] كان يسبب حلقة مزامنة
    // eslint-disable-next-line react-hooks/exhaustive-deps -- نُعيد المزامنة عند تغيّر المستخدم (uid) أو انتهاء التقمص فقط
  }, [user?.uid, impersonateUid])

  useEffect(() => {
    if (!user?.uid || impersonateUid || user?.hideHomePlanUi) return undefined
    const onOverdue = (e) => {
      if (!notificationsEnabled()) return
      const detail = e?.detail || {}
      const planId = String(detail.planId || '').trim()
      const day = String(detail.day || '').trim()
      if (!planId || !day) return
      const notificationId = `notification-overdue-${planId}-${day}`
      const title = 'تنبيه تأخر الورد'
      const body = detail.overdueSinceYmd
        ? `يوجد تأخر في الخطة (${detail.planName || planId}) منذ ${detail.overdueSinceYmd}. المتبقي: ${detail.owedPages || 0} صفحة.`
        : `يوجد تأخر في الخطة (${detail.planName || planId}). المتبقي: ${detail.owedPages || 0} صفحة.`
      upsertUserNotification({
        userId: user.uid,
        notificationId,
        title,
        body,
        notificationType: 'wird_overdue',
        planId,
        ymd: day,
        overdueSinceYmd: detail.overdueSinceYmd || '',
        owedPages: detail.owedPages || 0,
        userData: user,
      }).catch(() => {})
    }
    window.addEventListener('rh:wird-overdue-detected', onOverdue)
    return () => window.removeEventListener('rh:wird-overdue-detected', onOverdue)
  }, [user, impersonateUid])

  const CollapseIcon = collapsed ? ChevronsLeft : ChevronsRight

  const isStudent = normalizeRole(user?.role) === 'student'
  const profileStatus = String(user?.profileRequestStatus || '').trim()
  const approved = profileStatus === PROFILE_REQUEST_STATUS.APPROVED
  const isWelcomePath = pathname === '/app/welcome' || pathname === '/app/welcome/'
  const isApplicationPath = pathname === '/app/application' || pathname === '/app/application/'
  /** طالب لم يُعتمد طلبه: واجهة مبسطة بدون شريط التنقل الكامل على البداية وصفحة الطلب فقط */
  const pendingPreApprovalShell =
    isStudent && !approved && (isWelcomePath || isApplicationPath)

  if (pendingPreApprovalShell) {
    return (
      <div className="rh-app rh-app--pending-welcome">
        <header className="rh-pending-welcome__bar">
          <div className="rh-pending-welcome__brand">
            <img src={branding.logoSrc} alt="" className="rh-pending-welcome__logo" width={40} height={40} />
            <span className="rh-pending-welcome__title">{str('layout.sidebar_title')}</span>
          </div>
          {user && <UserMenu user={user} />}
        </header>
        <div className="rh-pending-welcome__content">
          <div className="rh-mob-app-scaffold">
            <Suspense
              fallback={
                <div
                  className="rh-mob-app-scaffold"
                  style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}
                  role="status"
                  aria-live="polite"
                >
                  <p className="lead" style={{ color: 'var(--rh-text-muted)', margin: 0 }}>
                    جاري التحميل…
                  </p>
                </div>
              }
            >
              <div key={pathname} className="rh-page-surface">
                <Outlet />
              </div>
            </Suspense>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={[
        'rh-app',
        collapsed ? 'rh-app--collapsed' : '',
        mobileOpen ? 'rh-app--mobile-nav' : '',
        showMobileBottomNav ? 'rh-app--bottom-nav' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <aside className="rh-sidebar" aria-label="القائمة الرئيسية">
        <NavLink
          to={withImpersonationQuery('/app', impersonateUid)}
          end
          className={({ isActive }) =>
            ['rh-sidebar__brand', 'rh-sidebar__brand-link', isActive ? 'rh-sidebar__brand-link--active' : '']
              .filter(Boolean)
              .join(' ')
          }
          onPointerDown={(e) => rhHapticNavigate(e)}
          onClick={closeMobile}
          aria-label={str('layout.sidebar_brand_aria')}
        >
          <img src={branding.logoSrc} alt="" className="rh-sidebar__logo" width={40} height={40} />
          {!collapsed && <span className="rh-sidebar__title">{str('layout.sidebar_title')}</span>}
        </NavLink>

        <nav ref={navRef} className="rh-sidebar__nav ui-scroll ui-scroll--padded">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={withImpersonationQuery(item.to, impersonateUid)}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) => ['rh-nav-link', isActive ? 'rh-nav-link--active' : ''].join(' ')}
              onPointerDown={(e) => rhHapticNavigate(e)}
              onClick={closeMobile}
            >
              <span className="rh-nav-link__icon" aria-hidden>
                <RhIcon as={item.Icon} size={20} strokeWidth={RH_ICON_STROKE} />
              </span>
              <span className="rh-nav-link__label">{item.label}</span>
              {item.to === '/app/tasks' && openTaskCount > 0 ? (
                <span className="rh-nav-link__badge" aria-hidden>
                  {openTaskCount > 99 ? '99+' : openTaskCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="rh-sidebar__footer">
          <button
            type="button"
            className="rh-sidebar__collapse"
            onPointerDown={(e) => rhHapticChromeTap(e)}
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
        <button
          type="button"
          className="rh-backdrop"
          aria-label="إغلاق القائمة"
          onPointerDown={(e) => rhHapticChromeTap(e)}
          onClick={closeMobile}
        />
      )}

      <div className="rh-main">
        <header className="rh-topbar">
          <button
            type="button"
            className="rh-icon-btn rh-topbar__menu"
            aria-label="فتح القائمة"
            onPointerDown={(e) => rhHapticChromeTap(e)}
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
              onPointerDown={(e) => rhHapticNavigate(e)}
              onClick={closeMobile}
            >
              {str('layout.topbar_heading')}
            </NavLink>
          </h1>
          <div className="rh-topbar__spacer" />
          {user && <UserNotificationsMenu user={user} />}
          {user && <UserMenu user={user} />}
        </header>

        <main className="rh-content">
          <div className="rh-mob-app-scaffold">
            <Suspense
              fallback={
                <div
                  className="rh-mob-app-scaffold"
                  style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}
                  role="status"
                  aria-live="polite"
                >
                  <p className="lead" style={{ color: 'var(--rh-text-muted)', margin: 0 }}>
                    جاري التحميل…
                  </p>
                </div>
              }
            >
              <div key={pathname} className="rh-page-surface">
                <Outlet />
              </div>
            </Suspense>
          </div>
        </main>

        {showMobileBottomNav ? (
          <MobileBottomNav
            tabs={bottomNavTabsWithBadges}
            impersonateUid={impersonateUid}
            moreOpen={mobileOpen}
            onMoreClick={() => setMobileOpen((open) => !open)}
            onTabClick={closeMobile}
          />
        ) : null}
      </div>
    </div>
  )
}
