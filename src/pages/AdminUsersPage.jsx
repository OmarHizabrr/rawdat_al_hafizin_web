import { Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useSiteContent } from '../context/useSiteContent.js'
import { USER_ROLES, isAdmin, normalizeRole } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import {
  adminDeleteUserFirestore,
  adminSetUserActive,
  adminUpdateUserPermissionProfile,
  adminUpdateUserRole,
  subscribeAllUsers,
} from '../services/adminUsersService.js'
import { subscribePermissionProfiles } from '../services/permissionProfilesService.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { PeekButton } from '../components/PeekButton.jsx'
import { Button, Modal, SearchField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export default function AdminUsersPage() {
  const { user: actor } = useAuth()
  const { branding, str } = useSiteContent()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyUid, setBusyUid] = useState(null)
  const [permissionProfiles, setPermissionProfiles] = useState([])

  useEffect(() => {
    document.title = `المستخدمون — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    if (!isAdmin(actor)) return
    const unsub = subscribeAllUsers(setUsers, () => {
      toast.warning('تعذّر تحميل قائمة المستخدمين. تحقق من صلاحيات Firestore.', 'تنبيه')
    })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- الاشتراك مرة عند فتح الصفحة كأدمن
  }, [actor?.uid])

  useEffect(() => {
    if (!isAdmin(actor)) return undefined
    const unsub = subscribePermissionProfiles(setPermissionProfiles, () => {})
    return () => unsub()
  }, [actor])

  const adminCrossItems = useMemo(
    () => [
      { to: '/app/admin', label: str('layout.nav_dashboard') },
      { to: '/app', label: str('layout.nav_home') },
      { to: '/app/plans', label: str('layout.nav_plans') },
      { to: '/app/awrad', label: str('layout.nav_awrad') },
      { to: '/app/welcome', label: str('layout.nav_welcome') },
      { to: '/app/settings', label: str('layout.nav_settings') },
    ],
    [str],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const hay = `${u.displayName || ''} ${u.email || ''} ${u.uid || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [users, query])

  const runBusy = async (uid, fn) => {
    setBusyUid(uid)
    try {
      await fn()
    } finally {
      setBusyUid(null)
    }
  }

  const onPermissionProfileChange = async (target, profileId) => {
    if (!actor) return
    await runBusy(target.uid, async () => {
      await adminUpdateUserPermissionProfile(actor, target.uid, profileId)
      toast.success('تم تحديث نوع الصلاحيات.', 'تم')
    })
  }

  const onRoleChange = async (target, nextRole) => {
    if (!actor || (target.uid === actor.uid && normalizeRole(nextRole) !== 'admin')) {
      toast.warning('لا يمكنك إزالة صلاحية الأدمن عن نفسك من هنا.', 'تنبيه')
      return
    }
    await runBusy(target.uid, async () => {
      await adminUpdateUserRole(actor, target.uid, nextRole)
      toast.success('تم تحديث الدور وربط نوع الصلاحيات تلقائياً عند وجود نوع مربوط بهذا الدور.', 'تم')
    })
  }

  const onToggleActive = async (target, nextActive) => {
    if (!actor || target.uid === actor.uid) {
      toast.warning('لا يمكنك إيقاف حسابك بهذه اللوحة.', 'تنبيه')
      return
    }
    await runBusy(target.uid, async () => {
      await adminSetUserActive(actor, target.uid, nextActive)
      toast.success(nextActive ? 'تم تفعيل الحساب.' : 'تم إيقاف الحساب.', 'تم')
    })
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !actor) return
    if (deleteTarget.uid === actor.uid) {
      toast.warning('لا يمكن حذف حسابك من هنا.', 'تنبيه')
      setDeleteTarget(null)
      return
    }
    try {
      await runBusy(deleteTarget.uid, async () => {
        await adminDeleteUserFirestore(actor, deleteTarget.uid)
      })
      toast.info('تم حذف بيانات المستخدم من المنصة.', '')
      setDeleteTarget(null)
    } catch (e) {
      if (e?.message === 'SELF_DELETE') {
        toast.warning('لا يمكن حذف حسابك.', 'تنبيه')
      } else {
        toast.warning('تعذّر الحذف. تحقق من الصلاحيات.', 'تنبيه')
      }
      setDeleteTarget(null)
    }
  }

  return (
    <div className="rh-admin-users">
      <header className="rh-admin-users__hero card">
        <h1 className="rh-admin-users__title">إدارة المستخدمين</h1>
        <p className="rh-admin-users__desc">
          عرض الحسابات، تغيير الدور (طالب / معلم / ادمن)، إيقاف الحساب، أو حذف بياناته من Firestore. عند تغيير الدور
          يُحدَّث في مستند <code className="rh-admin-users__code">users</code> كلٌّ من <code className="rh-admin-users__code">role</code> و{' '}
          <code className="rh-admin-users__code">permissionProfileId</code> تلقائياً: يُختار أول نوع صلاحيات مربوط بذلك
          الدور من لوحة «أنواع المستخدمين». الدور «ادمن» يفرّغ <code className="rh-admin-users__code">permissionProfileId</code>.
          يمكنك أيضاً ضبط نوع الصلاحيات يدوياً دون تغيير الدور؛ أي تغيير لاحق للدور يعيد الإسناد التلقائي. الحسابات
          الجديدة تُنشأ بدور طالب وحقل <code className="rh-admin-users__code">starterAccess</code> حتى يروا صفحتي البداية
          والإعدادات فقط إلى أن تُسنَد لهم صلاحيات أو يُختار «وصول كامل» من نوع الصلاحيات. أيقونة المنزل تفتح رئيسيته،
          وأيقونة العين صفحة خططه.
        </p>
        <CrossNav items={adminCrossItems} className="rh-admin-users__cross" />
      </header>

      <section className="rh-admin-users__toolbar card">
        <SearchField
          label="بحث"
          placeholder="اسم، بريد، أو معرّف…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      <ul className="rh-admin-users__grid">
        {filtered.map((u) => {
          const name = u.displayName?.trim() || 'بدون اسم'
          const photo = u.photoURL
          const initial = name.charAt(0)
          const active = u.isActive !== false
          const role = normalizeRole(u.role)
          const loading = busyUid === u.uid

          return (
            <li key={u.uid} className="rh-admin-users__card card">
              <div className="rh-admin-users__card-top">
                <span className="rh-admin-users__avatar" aria-hidden>
                  {photo ? <img src={photo} alt="" width={48} height={48} /> : initial}
                </span>
                <div className="rh-admin-users__card-head">
                  <strong className="rh-admin-users__name">{name}</strong>
                  <span className="rh-admin-users__email">{u.email || u.uid}</span>
                </div>
                <div className="rh-admin-users__peek-row">
                  <Link
                    className="rh-peek-btn"
                    title="الصفحة الرئيسية كهذا المستخدم (تعديل نيابة)"
                    aria-label="الصفحة الرئيسية كهذا المستخدم"
                    to={`/app?uid=${encodeURIComponent(u.uid)}`}
                  >
                    <RhIcon as={Home} size={18} strokeWidth={RH_ICON_STROKE} />
                  </Link>
                  <PeekButton
                    className="rh-admin-users__peek-user"
                    title="فتح صفحة خطط المستخدم"
                    to={`/app/plans?uid=${encodeURIComponent(u.uid)}`}
                  />
                </div>
              </div>

              <div className="rh-admin-users__row">
                <span className="rh-admin-users__label">الدور</span>
                <select
                  className="rh-admin-users__select"
                  value={role}
                  disabled={loading || u.uid === actor?.uid}
                  onChange={(e) => onRoleChange(u, e.target.value)}
                >
                  {USER_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rh-admin-users__row">
                <span className="rh-admin-users__label">نوع الصلاحيات</span>
                <select
                  className="rh-admin-users__select"
                  value={u.permissionProfileId || ''}
                  disabled={loading || role === 'admin'}
                  onChange={(e) => onPermissionProfileChange(u, e.target.value)}
                >
                  <option value="">— بدون (وصول كامل للصفحات) —</option>
                  {permissionProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.id}
                    </option>
                  ))}
                </select>
                <p className="rh-admin-users__profile-meta">
                  يتغيّر هذا الإسناد تلقائياً عند تعديل «الدور» أعلاه، ما لم تضبط نوعاً يدوياً ثم تغيّر الدور فيُستبدل
                  بالنوع المطابق للدور الجديد.
                </p>
              </div>

              <div className="rh-admin-users__row rh-admin-users__row--actions">
                <label className="rh-admin-users__toggle">
                  <input
                    type="checkbox"
                    checked={active}
                    disabled={loading || u.uid === actor?.uid}
                    onChange={(e) => onToggleActive(u, e.target.checked)}
                  />
                  <span>حساب نشط</span>
                </label>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={loading || u.uid === actor?.uid}
                  onClick={() => setDeleteTarget(u)}
                >
                  حذف البيانات
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="rh-admin-users__empty">لا يوجد مستخدمون يطابقون البحث.</p>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        title="تأكيد حذف بيانات المستخدم"
        onClose={() => !(deleteTarget && busyUid === deleteTarget.uid) && setDeleteTarget(null)}
        size="sm"
        closeOnBackdrop={!(deleteTarget && busyUid === deleteTarget?.uid)}
        closeOnEsc={!(deleteTarget && busyUid === deleteTarget?.uid)}
        showClose={!(deleteTarget && busyUid === deleteTarget?.uid)}
      >
        <p className="rh-admin-users__warn">
          سيتم حذف مستند المستخدم وجميع <strong>خططه</strong> و<strong>أوراده</strong> من قاعدة البيانات. لا يُحذف حساب
          Google تلقائياً.
        </p>
        <p className="rh-admin-users__warn-name">
          <strong>{deleteTarget?.displayName || deleteTarget?.email}</strong>
        </p>
        <div className="rh-admin-users__modal-actions">
          <Button
            type="button"
            variant="danger"
            loading={Boolean(deleteTarget) && busyUid === deleteTarget?.uid}
            onClick={confirmDelete}
          >
            نعم، احذف نهائياً
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={Boolean(deleteTarget) && busyUid === deleteTarget?.uid}
            onClick={() => setDeleteTarget(null)}
          >
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
