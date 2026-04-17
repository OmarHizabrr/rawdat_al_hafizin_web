import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from '../services/authService.js'
import { useOnClickOutside } from '../ui/hooks/useOnClickOutside.js'
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
    await signOut()
    navigate('/', { replace: true })
  }, [navigate])

  const name = user?.displayName?.trim() || 'مستخدم'
  const email = user?.email || ''
  const photo = user?.photoURL
  const initial = name.charAt(0)

  return (
    <div className="rh-user-menu" ref={wrapRef}>
      <button
        type="button"
        className="rh-user-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
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
          <Link to="/app/settings" className="rh-user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
            الإعدادات
          </Link>
          <Link to="/app/plans" className="rh-user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
            الخطط
          </Link>
          <Link to="/app/awrad" className="rh-user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
            الأوراد
          </Link>
          <Link to="/app/welcome" className="rh-user-dropdown__item" role="menuitem" onClick={() => setOpen(false)}>
            صفحة البداية
          </Link>
          <button type="button" className="rh-user-dropdown__item rh-user-dropdown__item--danger" role="menuitem" onClick={handleLogout}>
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  )
}
