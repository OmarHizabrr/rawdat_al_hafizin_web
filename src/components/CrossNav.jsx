import {
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Compass,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Settings,
  Users,
  UsersRound,
  Video,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { RH_ICON_STROKE, RhIcon } from '../ui/RhIcon.jsx'

function iconForPath(path) {
  const p = String(path || '').toLowerCase()
  if (p === '/app' || p === '/app/') return Home
  if (p.includes('/admin')) return LayoutDashboard
  if (p.includes('/plans/explore')) return Compass
  if (p.includes('/plans')) return ClipboardList
  if (p.includes('/halakat/explore')) return Compass
  if (p.includes('/halakat')) return UsersRound
  if (p.includes('/remote-tasmee/explore')) return Compass
  if (p.includes('/remote-tasmee')) return Video
  if (p.includes('/exams/explore')) return Compass
  if (p.includes('/exams')) return ListChecks
  if (p.includes('/dawrat/explore')) return Compass
  if (p.includes('/dawrat')) return GraduationCap
  if (p.includes('/awrad')) return NotebookPen
  if (p.includes('/activities/explore')) return Compass
  if (p.includes('/activities')) return CalendarDays
  if (p.includes('/reports')) return FileText
  if (p.includes('/notifications')) return Bell
  if (p.includes('/leave-request')) return CalendarClock
  if (p.includes('/settings')) return Settings
  if (p.includes('/users')) return Users
  if (p.includes('/welcome')) return BookOpen
  return Compass
}

/**
 * شريط روابط ثابت بين الصفحات (نفس المبدأ: كل مسار يصل لصفحته).
 * للمشرف أثناء `?uid=` يُمرَّر المعرف في الروابط تلقائياً.
 * @param {{ to: string, label: string }[]} items
 */
export function CrossNav({ items = [], className = '' }) {
  const { user } = useAuth()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)

  if (!items.length) return null
  return (
    <nav
      className={['rh-cross-nav', className].filter(Boolean).join(' ')}
      aria-label="تنقل سريع بين أقسام المنصة"
    >
      {items.map((item, i) => {
        const to = withImpersonationQuery(item.to, impersonateUid)
        const Icon = iconForPath(item.to)
        return (
          <span key={`${to}:${item.label}`} className="rh-cross-nav__frag">
            {i > 0 && <span className="rh-cross-nav__sep" aria-hidden> </span>}
            <NavLink to={to} end className={({ isActive }) => ['rh-cross-nav__link', isActive ? 'is-active' : ''].filter(Boolean).join(' ')}>
              <span className="rh-cross-nav__icon" aria-hidden>
                <RhIcon as={Icon} size={14} strokeWidth={RH_ICON_STROKE} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          </span>
        )
      })}
    </nav>
  )
}
