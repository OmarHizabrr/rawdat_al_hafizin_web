import { Bell, Send } from 'lucide-react'
import { HapticLink } from '../ui/HapticLink.jsx'
import { useEffect, useMemo, useState } from 'react'

import { CrossNav } from '../components/CrossNav.jsx'
import { AdminAdvancedPanel } from '../components/admin/AdminAdvancedPanel.jsx'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { subscribeAllUsers } from '../services/adminUsersService.js'
import { upsertUserNotification } from '../services/userNotificationsService.js'
import { Button, Modal, SearchField, TextAreaField, TextField, useToast } from '../ui/index.js'

export default function AdminPushNotificationsPage() {
  const { user: actor } = useAuth()
  const { branding, str } = useSiteContent()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [target, setTarget] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    document.title = `إشعارات المستخدمين — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    console.log('[AdminPushNotifications] mount', { actorUid: actor?.uid, isAdmin: isAdmin(actor) })
    if (!isAdmin(actor)) {
      console.warn('[AdminPushNotifications] non-admin access attempt — UI may be empty')
      return undefined
    }
    const unsub = subscribeAllUsers(
      (list) => {
        const arr = Array.isArray(list) ? list : []
        if (import.meta.env.DEV) {
          console.log('[AdminPushNotifications] users snapshot', { count: arr.length })
        }
        setRows(arr)
      },
      (err) => {
        console.error('[AdminPushNotifications] subscribeAllUsers failed', err)
        setRows([])
        toast.warning('تعذّر تحميل المستخدمين. تحقق من الصلاحيات والاتصال.', 'تنبيه')
      },
    )
    return () => {
      console.log('[AdminPushNotifications] unmount / unsubscribe')
      unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- اشتراك مرة عند فتح الصفحة كأدمن
  }, [actor?.uid])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((u) => {
      const hay = `${u.displayName || ''} ${u.email || ''} ${u.uid || ''}`.toLowerCase()
      return hay.includes(s)
    })
  }, [rows, q])

  const vapidConfigured = useMemo(
    () => Boolean(String(import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim()),
    [],
  )

  const hasDeviceToken = (u) => Boolean(String(u.pushToken || u.fcmToken || '').trim())

  const openSend = (u) => {
    console.log('[AdminPushNotifications] openSend modal', { uid: u?.uid, email: u?.email })
    setTarget(u)
    setTitle('')
    setBody('')
  }

  const onSend = async () => {
    if (!actor?.uid || !target?.uid) {
      console.warn('[AdminPushNotifications] onSend aborted: missing actor or target', {
        actorUid: actor?.uid,
        targetUid: target?.uid,
      })
      return
    }
    const t = String(title || '').trim()
    const b = String(body || '').trim()
    if (!t) {
      toast.warning('أدخل عنوان الإشعار.', 'تنبيه')
      return
    }
    if (!b) {
      toast.warning('أدخل نص الإشعار.', 'تنبيه')
      return
    }
    const notificationId = `admin-manual-${target.uid}-${Date.now()}`
    console.log('[AdminPushNotifications] sending notification', {
      notificationId,
      userId: target.uid,
      title: t,
      bodyPreview: b.slice(0, 120),
      bodyLength: b.length,
    })
    setSending(true)
    try {
      await upsertUserNotification({
        userId: target.uid,
        notificationId,
        title: t,
        body: b,
        notificationType: 'admin_manual',
        userData: actor,
      })
      console.log('[AdminPushNotifications] upsertUserNotification OK', { notificationId, userId: target.uid })
      toast.success('تم إنشاء الإشعار وإدراجه في صفحة إشعارات المستخدم (ومهمة الدفع إن وُجدت).', 'تم')
      setTarget(null)
      setTitle('')
      setBody('')
    } catch (e) {
      console.error('[AdminPushNotifications] upsertUserNotification FAILED', e, {
        code: e?.code,
        message: e?.message,
        notificationId,
        userId: target.uid,
      })
      toast.warning(
        `تعذّر الإرسال: ${String(e?.message || e || 'خطأ غير معروف').slice(0, 200)}`,
        'تنبيه',
      )
    } finally {
      setSending(false)
    }
  }

  const crossItems = useMemo(
    () => [
      { to: '/app/admin', label: str('layout.nav_admin') },
      { to: '/app/admin/users', label: str('layout.nav_users') },
      { to: '/app', label: str('layout.nav_home') },
    ],
    [str],
  )

  if (!isAdmin(actor)) {
    return (
      <div className="rh-admin-users">
        <section className="card">
          <p className="rh-admin-users__empty">هذه الصفحة للمشرفين فقط.</p>
          <HapticLink to="/app" className="ui-btn ui-btn--secondary">
            الرئيسية
          </HapticLink>
        </section>
      </div>
    )
  }

  return (
    <div className="rh-admin-users rh-admin-users--application-requests">
      <header className="rh-admin-users__hero card">
        <h1 className="rh-admin-users__title">إشعارات المستخدمين</h1>
        <p className="rh-admin-users__desc">
          أرسل إشعاراً لأي مستخدم في المنصة. يصل الإشعار داخل التطبيق، وإلى الهاتف إن كان المستخدم فعّل الإشعارات
          مسبقاً.
        </p>
        <AdminAdvancedPanel summary="معلومات تقنية للمشرف">
          <p className="rh-settings-footnote" style={{ margin: 0 }}>
            شارة «تم تفعيل إشعارات الهاتف» تعني أن المستخدم وافق على الإشعارات من المتصفح. إن ظهرت «لم تُفعَّل بعد»
            للجميع، قد يلزم ضبط إعدادات النشر من قبل المطور (مفتاح Web Push في Firebase).
          </p>
        </AdminAdvancedPanel>
      </header>

      {!vapidConfigured ? (
        <section className="card" style={{ borderColor: 'var(--rh-warning-border, #c9a227)' }}>
          <p className="rh-settings-footnote" style={{ margin: 0 }}>
            <strong>تنبيه:</strong> إشعارات الهاتف غير مفعّلة في هذا الإصدار من الموقع. تواصل مع مطور المنصة لضبط
            إعدادات Firebase ثم إعادة النشر.
          </p>
        </section>
      ) : null}

      <CrossNav items={crossItems} className="rh-admin-users__cross" />

      <section className="card rh-admin-users__toolbar">
        <SearchField
          label="بحث"
            placeholder="ابحث بالاسم أو البريد أو رقم المستخدم…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rh-admin-applications__search"
        />
        <p className="rh-settings-footnote" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          العدد الظاهر: <strong>{filtered.length}</strong> من أصل <strong>{rows.length}</strong>
        </p>
      </section>

      <ul className="rh-admin-users__grid">
        {filtered.map((u) => (
          <li key={u.uid} className="card rh-admin-users__card">
            <div className="rh-admin-users__card-top">
              <span className="rh-admin-users__avatar" aria-hidden={!u.photoURL}>
                {u.photoURL ? <img src={u.photoURL} alt="" width={48} height={48} /> : (u.displayName || u.email || '?').charAt(0)}
              </span>
              <div className="rh-admin-users__card-head">
                <strong className="rh-admin-users__name">{u.displayName || 'بدون اسم'}</strong>
                <span className="rh-admin-users__email">{u.email || '—'}</span>
                <span className="rh-plans__saved-badge">
                  {hasDeviceToken(u) ? 'إشعارات الهاتف مفعّلة' : 'إشعارات الهاتف غير مفعّلة'}
                </span>
              </div>
            </div>
            <AdminAdvancedPanel summary="رقم المستخدم في النظام">
              <p className="rh-settings-footnote" dir="ltr" style={{ margin: 0, wordBreak: 'break-all' }}>
                {u.uid}
              </p>
            </AdminAdvancedPanel>
            <div className="rh-admin-users__row--actions">
              <Button type="button" size="sm" variant="primary" icon={Bell} onClick={() => openSend(u)}>
                إرسال إشعار
              </Button>
              <HapticLink to={`/app/plans?uid=${encodeURIComponent(u.uid)}`} className="ui-btn ui-btn--secondary ui-btn--sm">
                خطط المستخدم
              </HapticLink>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <section className="card">
          <p className="rh-admin-users__empty">لا يوجد مستخدمون مطابقون للبحث.</p>
        </section>
      ) : null}

      <Modal
        open={Boolean(target)}
        title={target ? `إشعار إلى: ${target.displayName || target.email || target.uid}` : ''}
        onClose={() => !sending && setTarget(null)}
        size="sm"
        contentClassName="ui-modal__content--plan-members"
        closeOnBackdrop={!sending}
        closeOnEsc={!sending}
        showClose={!sending}
      >
        <div className="ui-modal__body">
        <TextField label="عنوان الإشعار" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <TextAreaField label="نص الإشعار" value={body} onChange={(e) => setBody(e.target.value)} rows={5} required />
        <p className="rh-settings-footnote" style={{ marginTop: 0 }}>
          يُسجَّل الإشعار في حساب المستخدم، ويُرسل إلى هاتفه إن كانت الإشعارات مفعّلة.
        </p>
        </div>
        <div className="rh-modal-footer rh-admin-users__modal-actions">
          <Button type="button" variant="primary" icon={Send} loading={sending} onClick={() => void onSend()}>
            إرسال
          </Button>
          <Button type="button" variant="ghost" disabled={sending} onClick={() => setTarget(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
