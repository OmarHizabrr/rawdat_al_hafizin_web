import { useCallback, useEffect, useMemo, useState } from 'react'
import { SITE_TITLE } from '../config/site.js'
import { USER_ROLES, isAdmin, normalizeRole, roleLabel } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import {
  adminDeleteUserFirestore,
  adminSetUserActive,
  adminUpdateUserRole,
  subscribeAllUsers,
} from '../services/adminUsersService.js'
import { loadPlans } from '../utils/plansStorage.js'
import { PeekButton } from '../components/PeekButton.jsx'
import { PlanAwradModal } from '../components/PlanAwradModal.jsx'
import { Button, Modal, ScrollArea, SearchField, useToast } from '../ui/index.js'

export default function AdminUsersPage() {
  const { user: actor } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [profileUser, setProfileUser] = useState(null)
  const [profilePlans, setProfilePlans] = useState([])
  const [planPeek, setPlanPeek] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyUid, setBusyUid] = useState(null)

  useEffect(() => {
    document.title = `المستخدمون — ${SITE_TITLE}`
  }, [])

  useEffect(() => {
    if (!isAdmin(actor)) return
    const unsub = subscribeAllUsers(setUsers, () => {
      toast.warning('تعذّر تحميل قائمة المستخدمين. تحقق من صلاحيات Firestore.', 'تنبيه')
    })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- الاشتراك مرة عند فتح الصفحة كأدمن
  }, [actor?.uid])

  useEffect(() => {
    if (!profileUser?.uid) {
      setProfilePlans([])
      return
    }
    let cancelled = false
    loadPlans(profileUser.uid).then((plans) => {
      if (!cancelled) setProfilePlans(plans)
    })
    return () => {
      cancelled = true
    }
  }, [profileUser?.uid])

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

  const onRoleChange = async (target, nextRole) => {
    if (!actor || (target.uid === actor.uid && normalizeRole(nextRole) !== 'admin')) {
      toast.warning('لا يمكنك إزالة صلاحية الأدمن عن نفسك من هنا.', 'تنبيه')
      return
    }
    await runBusy(target.uid, async () => {
      await adminUpdateUserRole(actor, target.uid, nextRole)
      toast.success('تم تحديث الدور.', 'تم')
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
      if (profileUser?.uid === deleteTarget.uid) setProfileUser(null)
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

  const openProfile = useCallback((u) => {
    setProfileUser(u)
    setPlanPeek(null)
  }, [])

  return (
    <div className="rh-admin-users">
      <header className="rh-admin-users__hero card">
        <h1 className="rh-admin-users__title">إدارة المستخدمين</h1>
        <p className="rh-admin-users__desc">
          عرض الحسابات، تغيير الدور (طالب / معلم / ادمن)، إيقاف الحساب، أو حذف بياناته من Firestore. لإسناد أول
          حساب أدمن يدوياً، عدّل الحقل <code className="rh-admin-users__code">role</code> في مستند المستخدم إلى{' '}
          <code className="rh-admin-users__code">admin</code> من وحدة تحكم Firebase.
        </p>
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
                <PeekButton
                  className="rh-admin-users__peek-user"
                  title="ملف المستخدم وخططه"
                  onClick={() => openProfile(u)}
                />
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

      <Modal open={Boolean(profileUser)} title={profileUser ? `ملف: ${profileUser.displayName || profileUser.email}` : ''} onClose={() => setProfileUser(null)} size="md">
        {profileUser && (
          <>
            <div className="rh-admin-users__profile-meta">
              <span>
                <strong>البريد:</strong> {profileUser.email || '—'}
              </span>
              <span>
                <strong>الدور:</strong> {roleLabel(profileUser.role)}
              </span>
              <span>
                <strong>الحالة:</strong> {profileUser.isActive === false ? 'موقوف' : 'نشط'}
              </span>
            </div>
            <h3 className="rh-admin-users__plans-title">الخطط</h3>
            <ScrollArea className="rh-admin-users__plans-scroll" padded maxHeight="min(48dvh, 360px)">
              {profilePlans.length === 0 ? (
                <p className="rh-admin-users__plans-empty">لا توجد خطط محفوظة.</p>
              ) : (
                <ul className="rh-admin-users__plan-list">
                  {profilePlans.map((p) => (
                    <li key={p.id} className="rh-admin-users__plan-row">
                      <div>
                        <strong>{p.name}</strong>
                        <span className="rh-admin-users__plan-sub">
                          {p.totalTargetPages} صفحة — {p.dailyPages} ص/يوم
                        </span>
                      </div>
                      <PeekButton
                        title="عرض الأوراد لهذه الخطة"
                        onClick={() => setPlanPeek({ userId: profileUser.uid, plan: p })}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </>
        )}
      </Modal>

      <PlanAwradModal
        open={Boolean(planPeek)}
        onClose={() => setPlanPeek(null)}
        userId={planPeek?.userId}
        plan={planPeek?.plan}
      />

      <Modal open={Boolean(deleteTarget)} title="تأكيد حذف بيانات المستخدم" onClose={() => setDeleteTarget(null)} size="sm">
        <p className="rh-admin-users__warn">
          سيتم حذف مستند المستخدم وجميع <strong>خططه</strong> و<strong>أوراده</strong> من قاعدة البيانات. لا يُحذف حساب
          Google تلقائياً.
        </p>
        <p className="rh-admin-users__warn-name">
          <strong>{deleteTarget?.displayName || deleteTarget?.email}</strong>
        </p>
        <div className="rh-admin-users__modal-actions">
          <Button type="button" variant="danger" onClick={confirmDelete}>
            نعم، احذف نهائياً
          </Button>
          <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
