import { Bell, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import {
  deleteUserNotification,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  subscribeUserNotifications,
} from '../services/userNotificationsService.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { Button, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const PN = PERMISSION_PAGE_IDS.notifications

function formatWhen(iso) {
  const t = Date.parse(String(iso || ''))
  if (!Number.isFinite(t)) return ''
  return new Date(t).toLocaleString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

export default function UserNotificationsPage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
  const { branding, str } = useSiteContent()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)
  const toast = useToast()
  const [items, setItems] = useState([])
  const [deletingId, setDeletingId] = useState(null)
  const userId = user?.uid || ''
  const canDelete = can(PN, 'notification_delete')

  const settingsCrossItems = useMemo(() => {
    const base = [
      { to: '/app', label: str('layout.nav_home') },
      { to: '/app/welcome', label: str('layout.nav_welcome') },
    ]
    if (canAccessPage('settings')) base.push({ to: '/app/settings', label: str('layout.nav_settings') })
    return base
  }, [str, canAccessPage])

  useEffect(() => {
    document.title = `الإشعارات — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    if (!userId) return undefined
    return subscribeUserNotifications(userId, setItems)
  }, [userId])

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items])

  const onDelete = useCallback(
    async (id) => {
      if (!userId || !id || !canDelete) return
      setDeletingId(id)
      try {
        await deleteUserNotification(userId, id)
        toast.success('تم حذف الإشعار.', 'تم')
      } catch {
        toast.warning('تعذّر حذف الإشعار. حاول مرة أخرى.', 'تنبيه')
      } finally {
        setDeletingId(null)
      }
    },
    [userId, canDelete, toast],
  )

  const onMarkRead = useCallback(
    (id) => {
      if (!userId) return
      markUserNotificationRead(userId, id, user || {})
    },
    [userId, user],
  )

  const onMarkAllRead = useCallback(() => {
    if (!userId) return
    markAllUserNotificationsRead(userId, items, user || {})
  }, [userId, items, user])

  return (
    <div className="rh-settings rh-notifications-page">
      <header className="rh-settings-header">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--rh-space-3)',
          }}
        >
          <div>
            <h1 className="rh-settings-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <RhIcon as={Bell} size={26} strokeWidth={RH_ICON_STROKE} aria-hidden />
              إدارة الإشعارات
            </h1>
            <p className="rh-settings-desc" style={{ marginTop: 8 }}>
              عرض كل الإشعارات وحذف ما تشاء. القائمة المنسدلة في الشريط تعرض أحدث العناصر فقط.
            </p>
          </div>
          {unreadCount > 0 && items.length > 0 ? (
            <Button type="button" variant="secondary" onClick={onMarkAllRead}>
              تعليم الكل كمقروء
            </Button>
          ) : null}
        </div>
        <CrossNav items={settingsCrossItems} className="rh-settings__cross" />
      </header>

        <section className="rh-settings-card" style={{ marginTop: 0 }}>
          {items.length === 0 ? (
            <p className="rh-settings-footnote" style={{ margin: 0 }}>
              لا توجد إشعارات حتى الآن.
            </p>
          ) : (
            <ul className="rh-notifications-page__list">
              {items.map((n) => (
                <li key={n.id} className={['rh-notify__item', n.isRead ? 'is-read' : ''].filter(Boolean).join(' ')}>
                  <div className="rh-notify__creator">
                    {n.creatorPhotoURL ? (
                      <img
                        src={n.creatorPhotoURL}
                        alt=""
                        width={32}
                        height={32}
                        className="rh-notify__creator-avatar"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="rh-notify__creator-avatar rh-notify__creator-avatar--fallback">
                        {(n.creatorDisplayName || 'م').charAt(0)}
                      </span>
                    )}
                    <span className="rh-notify__creator-name">{n.creatorDisplayName || '—'}</span>
                  </div>
                  <p className="rh-notify__title">{n.title || 'إشعار'}</p>
                  {n.body ? <p className="rh-notify__body">{n.body}</p> : null}
                  <div className="rh-notify__meta" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span>{formatWhen(n.createdAt)}</span>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      {!n.isRead ? (
                        <button type="button" className="rh-notify__mark" onClick={() => onMarkRead(n.id)}>
                          تمّت القراءة
                        </button>
                      ) : (
                        <span className="rh-notify__read-pill">مقروء</span>
                      )}
                      {canDelete ? (
                        <button
                          type="button"
                          className="rh-notifications-page__delete"
                          onClick={() => onDelete(n.id)}
                          disabled={deletingId === n.id}
                          aria-label="حذف الإشعار"
                        >
                          <RhIcon as={Trash2} size={16} strokeWidth={RH_ICON_STROKE} />
                          حذف
                        </button>
                      ) : null}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="rh-settings-footnote" style={{ marginTop: 16 }}>
          <Link
            to={withImpersonationQuery('/app', impersonateUid)}
            className="ui-btn ui-btn--ghost"
            style={{ display: 'inline-flex' }}
          >
            {str('layout.nav_home')}
          </Link>
        </p>
    </div>
  )
}
