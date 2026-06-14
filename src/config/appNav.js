import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  Bird,
  LayoutDashboard,
  ListChecks,
  MessageCircleMore,
  MessageCircleQuestion,
  NotebookPen,
  Puzzle,
  ScrollText,
  Settings,
  UserRound,
  Users,
  UsersRound,
  Video,
  Bell,
} from 'lucide-react'
import { isAdmin } from './roles.js'

/** مسارات التبويبات السفلية الأساسية على الموبايل */
export const BOTTOM_TAB_ROUTES = ['/app/dashboard', '/app/tasks', '/app/plans', '/app/awrad']

const BOTTOM_TAB_FALLBACK_SKIP = new Set([
  ...BOTTOM_TAB_ROUTES,
  '/app',
  '/app/profile',
  '/app/settings',
  '/app/foundation',
  '/app/welcome',
])

export function buildBaseNav(str) {
  return [
    { to: '/app', end: true, label: str('layout.nav_home'), Icon: Home, pageId: 'home' },
    { to: '/app/dashboard', label: str('layout.nav_dashboard'), Icon: LayoutDashboard, pageId: 'home' },
    { to: '/app/tasks', label: str('layout.nav_tasks'), Icon: ListChecks, pageId: 'home' },
    { to: '/app/welcome', label: str('layout.nav_welcome'), Icon: BookOpen, pageId: 'welcome' },
    { to: '/app/plans', label: str('layout.nav_plans'), Icon: ClipboardList, pageId: 'plans' },
    { to: '/app/halakat', label: str('layout.nav_halakat'), Icon: UsersRound, pageId: 'halakat' },
    { to: '/app/remote-tasmee', label: str('layout.nav_remote_tasmee'), Icon: Video, pageId: 'remote_tasmee' },
    { to: '/app/exams', label: str('layout.nav_exams'), Icon: ScrollText, pageId: 'exams' },
    { to: '/app/dawrat', label: str('layout.nav_dawrat'), Icon: GraduationCap, pageId: 'dawrat' },
    { to: '/app/awrad', label: str('layout.nav_awrad'), Icon: NotebookPen, pageId: 'awrad' },
    { to: '/app/activities', label: str('layout.nav_activities'), Icon: CalendarDays, pageId: 'activities' },
    { to: '/app/feelings', label: str('layout.nav_feelings'), Icon: Bird, pageId: 'feelings' },
    { to: '/app/inquiries', label: str('layout.nav_inquiries'), Icon: MessageCircleQuestion, pageId: 'inquiries' },
    { to: '/app/reports', label: str('layout.nav_reports'), Icon: FileText, pageId: 'reports' },
    {
      to: '/app/leave-request',
      label: str('layout.nav_leave_request'),
      Icon: CalendarClock,
      pageId: 'leave_request',
    },
    { to: '/app/certificates', label: str('layout.nav_certificates'), Icon: ScrollText, pageId: 'certificates' },
    { to: '/app/profile', label: 'الملف الشخصي', Icon: UserRound, pageId: 'settings' },
    { to: '/app/settings', label: str('layout.nav_settings'), Icon: Settings, pageId: 'settings' },
    { to: '/app/foundation', label: str('layout.nav_foundation'), Icon: Puzzle, pageId: 'foundation' },
  ]
}

export function buildAdminNavItems(str) {
  return [
    { to: '/app/admin', label: str('layout.nav_dashboard'), Icon: LayoutDashboard },
    { to: '/app/admin/users', label: str('layout.nav_users'), Icon: Users },
    { to: '/app/admin/push-notifications', label: 'إشعارات المستخدمين', Icon: Bell },
    { to: '/app/admin/applications', label: 'طلبات الالتحاق', Icon: Users },
    { to: '/app/admin/groups', label: 'إدارة المجموعات', Icon: MessageCircleMore },
  ]
}

export function isNavItemVisible(item, { user, permReady, canAccessPage }) {
  return !item.pageId || !permReady || isAdmin(user) || canAccessPage(item.pageId)
}

export function filterVisibleNavItems(items, ctx) {
  return (items || []).filter((item) => isNavItemVisible(item, ctx))
}

export function buildAppNav({ str, user, permReady, canAccessPage }) {
  const ctx = { user, permReady, canAccessPage }
  const baseNav = buildBaseNav(str)
  const adminNavItems = buildAdminNavItems(str)
  const filtered = filterVisibleNavItems(baseNav, ctx)
  return isAdmin(user) ? [...filtered.slice(0, 9), ...adminNavItems, ...filtered.slice(9)] : filtered
}

/** حتى 4 تبويبات سفلية حسب الصلاحيات */
export function buildBottomNavTabs({ str, user, permReady, canAccessPage }) {
  const ctx = { user, permReady, canAccessPage }
  const visible = filterVisibleNavItems(buildBaseNav(str), ctx)
  const byPath = new Map(visible.map((item) => [item.to, item]))
  const tabs = []

  for (const path of BOTTOM_TAB_ROUTES) {
    const item = byPath.get(path)
    if (item) tabs.push(item)
  }

  if (tabs.length < 3) {
    for (const item of visible) {
      if (tabs.length >= 4) break
      if (BOTTOM_TAB_FALLBACK_SKIP.has(item.to)) continue
      if (tabs.some((t) => t.to === item.to)) continue
      tabs.push(item)
    }
  }

  return tabs.slice(0, 4)
}
