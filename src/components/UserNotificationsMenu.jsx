import { Bell, CheckCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { usePermissions } from '../context/usePermissions.js'
import {
  markAllUserNotificationsRead,
  markUserNotificationRead,
  subscribeUserNotifications,
} from '../services/userNotificationsService.js'
import { useOnClickOutside } from '../ui/hooks/useOnClickOutside.js'
import { RH_ICON_STROKE, RhIcon } from '../ui/RhIcon.jsx'

function formatWhen(iso) {
  const t = Date.parse(String(iso || ''))
  if (!Number.isFinite(t)) return ''
  return new Date(t).toLocaleString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    day: '2-digit',
  })
}

export function UserNotificationsMenu({ user }) {
  const { canAccessPage } = usePermissions()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)
  const userId = user?.uid || ''
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const rootRef = useRef(null)
  useOnClickOutside(rootRef, () => setOpen(false), open)

  useEffect(() => {
    if (!userId) return undefined
    return subscribeUserNotifications(userId, setItems)
  }, [userId])

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items])

  return (
    <div className="rh-notify" ref={rootRef}>
      <button
        type="button"
        className="rh-icon-btn rh-notify__trigger"
        aria-label="الإشعارات"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <RhIcon as={Bell} size={20} strokeWidth={RH_ICON_STROKE} />
        {unreadCount > 0 ? <span className="rh-notify__badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </button>

      {open ? (
        <section className="rh-notify__panel" role="dialog" aria-label="الإشعارات">
          <header className="rh-notify__head">
            <strong>الإشعارات</strong>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="rh-notify__mark-all"
                onClick={() => markAllUserNotificationsRead(userId, items, user || {})}
              >
                <RhIcon as={CheckCheck} size={15} strokeWidth={RH_ICON_STROKE} />
                تعليم الكل كمقروء
              </button>
            ) : null}
          </header>

          <div className="rh-notify__list">
            {items.length === 0 ? (
              <p className="rh-notify__empty">لا توجد إشعارات حتى الآن.</p>
            ) : (
              items.slice(0, 30).map((n) => (
                <article key={n.id} className={['rh-notify__item', n.isRead ? 'is-read' : ''].filter(Boolean).join(' ')}>
                  <div className="rh-notify__creator">
                    {n.creatorPhotoURL ? (
                      <img
                        src={n.creatorPhotoURL}
                        alt=""
                        width={28}
                        height={28}
                        className="rh-notify__creator-avatar"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="rh-notify__creator-avatar rh-notify__creator-avatar--fallback">
                        {(n.creatorDisplayName || 'م').charAt(0)}
                      </span>
                    )}
                    <span className="rh-notify__creator-name">{n.creatorDisplayName || 'منشئ الإشعار'}</span>
                  </div>
                  <p className="rh-notify__title">{n.title || 'إشعار'}</p>
                  {n.body ? <p className="rh-notify__body">{n.body}</p> : null}
                  <div className="rh-notify__meta">
                    <span>{formatWhen(n.createdAt)}</span>
                    {!n.isRead ? (
                      <button
                        type="button"
                        className="rh-notify__mark"
                        onClick={() => markUserNotificationRead(userId, n.id, user || {})}
                      >
                        تمّت القراءة
                      </button>
                    ) : (
                      <span className="rh-notify__read-pill">مقروء</span>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
          {canAccessPage('notifications') ? (
            <footer className="rh-notify__footer">
              <Link
                to={withImpersonationQuery('/app/notifications', impersonateUid)}
                className="rh-notify__manage-link"
                onClick={() => setOpen(false)}
              >
                إدارة كل الإشعارات…
              </Link>
            </footer>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

