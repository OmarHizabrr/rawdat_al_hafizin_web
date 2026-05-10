import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  LogOut,
  NotebookPen,
  Send,
  Settings,
  UserRound,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAdmin, normalizeRole } from '../config/roles.js'
import { PROFILE_REQUEST_STATUS } from '../services/profileRequestService.js'
import { signOut } from '../services/authService.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { setApplicationReviewSessionFlag } from '../utils/applicationReviewSession.js'
import { HapticLink } from '../ui/HapticLink.jsx'
import { useOnClickOutside } from '../ui/hooks/useOnClickOutside.js'
import { rhHapticChromeTap } from '../utils/haptics.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export function UserMenu({ user }) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const navigate = useNavigate()

  useOnClickOutside(wrapRef, () => setOpen(false), open)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const handleLogout = useCallback(async () => {
    setOpen(false)
    try {
      const pid = typeof user?.permissionProfileId === 'string' ? user.permissionProfileId.trim() : ''
      if (pid && normalizeRole(user?.role) === 'student') {
        const doc = await firestoreApi.getData(firestoreApi.getPermissionProfileDoc(pid))
        if (doc?.applicationFormAfterLogout === true) {
          setApplicationReviewSessionFlag()
        }
      }
    } catch {
      /* تجاهل فشل القراءة قبل الخروج */
    }
    await signOut()
    navigate('/', { replace: true })
  }, [navigate, user])

  const name = user?.displayName?.trim() || 'مستخدم'
  const email = user?.email || ''
  const photo = user?.photoURL
  const initial = name.charAt(0)

  const isStudent = normalizeRole(user?.role) === 'student'
  const profileApproved =
    String(user?.profileRequestStatus || '').trim() === PROFILE_REQUEST_STATUS.APPROVED
  const pendingPreApprovalMenu = isStudent && !profileApproved

  return (
    <div className="rh-user-menu" ref={wrapRef}>
      <button
        type="button"
        className="rh-user-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onPointerDown={(e) => rhHapticChromeTap(e)}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="rh-user-trigger__avatar">
          {photo ? <img src={photo} alt="" width={40} height={40} /> : <span aria-hidden>{initial}</span>}
        </span>
        <span className="rh-user-trigger__text">
          <span className="rh-user-trigger__name">{name}</span>
          {email && <span className="rh-user-trigger__email">{email}</span>}
        </span>
        <span className={['rh-user-trigger__chev', open ? 'rh-user-trigger__chev--open' : ''].filter(Boolean).join(' ')} aria-hidden>
          <RhIcon as={ChevronDown} size={18} strokeWidth={RH_ICON_STROKE} />
        </span>
      </button>

      {open && (
        <div id={menuId} className="rh-user-dropdown" role="menu">
          <div className="rh-user-dropdown__head">
            <span className="rh-user-dropdown__head-name">{name}</span>
            {email && <span className="rh-user-dropdown__head-email">{email}</span>}
          </div>
          {pendingPreApprovalMenu ? (
            <>
              <HapticLink
                to="/app/application"
                className="rh-user-dropdown__item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <span className="rh-user-dropdown__item-icon" aria-hidden>
                  <RhIcon as={Send} size={18} strokeWidth={RH_ICON_STROKE} />
                </span>
                طلب الالتحاق
              </HapticLink>
              <HapticLink to="/app/welcome" className="rh-user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
                <span className="rh-user-dropdown__item-icon" aria-hidden>
                  <RhIcon as={BookOpen} size={18} strokeWidth={RH_ICON_STROKE} />
                </span>
                صفحة البداية
              </HapticLink>
            </>
          ) : (
            <>
              <HapticLink to="/app/profile" className="rh-user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
                <span className="rh-user-dropdown__item-icon" aria-hidden>
                  <RhIcon as={UserRound} size={18} strokeWidth={RH_ICON_STROKE} />
                </span>
                الملف الشخصي
              </HapticLink>
              <HapticLink to="/app/settings" className="rh-user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
                <span className="rh-user-dropdown__item-icon" aria-hidden>
                  <RhIcon as={Settings} size={18} strokeWidth={RH_ICON_STROKE} />
                </span>
                الإعدادات
              </HapticLink>
              {isAdmin(user) && (
                <HapticLink to="/app/admin/users" className="rh-user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
                  <span className="rh-user-dropdown__item-icon" aria-hidden>
                    <RhIcon as={Users} size={18} strokeWidth={RH_ICON_STROKE} />
                  </span>
                  إدارة المستخدمين
                </HapticLink>
              )}
              {!user?.hideHomePlanUi ? (
                <HapticLink to="/app/plans" className="rh-user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
                  <span className="rh-user-dropdown__item-icon" aria-hidden>
                    <RhIcon as={ClipboardList} size={18} strokeWidth={RH_ICON_STROKE} />
                  </span>
                  الخطط
                </HapticLink>
              ) : null}
              <HapticLink to="/app/awrad" className="rh-user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
                <span className="rh-user-dropdown__item-icon" aria-hidden>
                  <RhIcon as={NotebookPen} size={18} strokeWidth={RH_ICON_STROKE} />
                </span>
                الأوراد
              </HapticLink>
              <HapticLink to="/app/welcome" className="rh-user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
                <span className="rh-user-dropdown__item-icon" aria-hidden>
                  <RhIcon as={BookOpen} size={18} strokeWidth={RH_ICON_STROKE} />
                </span>
                صفحة البداية
              </HapticLink>
            </>
          )}
          <button
            type="button"
            className="rh-user-dropdown__item rh-user-dropdown__item--danger"
            role="menuitem"
            onPointerDown={(e) => rhHapticChromeTap(e)}
            onClick={handleLogout}
          >
            <span className="rh-user-dropdown__item-icon" aria-hidden>
              <RhIcon as={LogOut} size={18} strokeWidth={RH_ICON_STROKE} />
            </span>
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  )
}
