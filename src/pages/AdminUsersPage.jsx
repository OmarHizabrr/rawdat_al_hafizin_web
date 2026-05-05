import { Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSiteContent } from '../context/useSiteContent.js'
import { USER_ROLES, isAdmin, normalizeRole } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import {
  adminClearUserProfilePhoto,
  adminDeleteUserFirestore,
  adminSetUserActive,
  adminUpdateUserDisplayName,
  adminUpdateUserPermissionProfile,
  adminUpdateUserRole,
  adminUploadUserProfilePhoto,
  subscribeAllUsers,
} from '../services/adminUsersService.js'
import { messageForProfilePhotoError } from '../services/profilePhotoStorage.js'
import { subscribePermissionProfiles } from '../services/permissionProfilesService.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { PeekButton } from '../components/PeekButton.jsx'
import { Button, Modal, SearchField, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

export default function AdminUsersPage() {
  const { user: actor } = useAuth()
  const { branding, str } = useSiteContent()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [profileFilter, setProfileFilter] = useState('all')
  const [selectedUids, setSelectedUids] = useState(() => new Set())
  const [bulkRole, setBulkRole] = useState('')
  const [bulkProfile, setBulkProfile] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyUid, setBusyUid] = useState(null)
  const [permissionProfiles, setPermissionProfiles] = useState([])
  const [displayModalUser, setDisplayModalUser] = useState(null)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [displayModalBusyKind, setDisplayModalBusyKind] = useState(null)
  const adminPhotoInputRef = useRef(null)

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
      { to: '/app/leave-request', label: str('layout.nav_leave_request') },
      { to: '/app/certificates', label: str('layout.nav_certificates') },
      { to: '/app/settings', label: str('layout.nav_settings') },
    ],
    [str],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== 'all' && normalizeRole(u.role) !== roleFilter) return false
      if (profileFilter === '__none__' && (u.permissionProfileId || '')) return false
      if (profileFilter !== 'all' && profileFilter !== '__none__' && (u.permissionProfileId || '') !== profileFilter) {
        return false
      }
      if (!q) return true
      const hay = `${u.displayName || ''} ${u.email || ''} ${u.uid || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [users, query, roleFilter, profileFilter])

  const selectableRows = useMemo(
    () => filtered.filter((u) => u.uid && u.uid !== actor?.uid),
    [filtered, actor?.uid],
  )
  const allSelectableChecked = selectableRows.length > 0 && selectableRows.every((u) => selectedUids.has(u.uid))

  const runBusy = async (uid, fn) => {
    setBusyUid(uid)
    try {
      await fn()
    } finally {
      setBusyUid(null)
    }
  }

  const toggleSelected = (uid, checked) => {
    setSelectedUids((prev) => {
      const next = new Set(prev)
      if (checked) next.add(uid)
      else next.delete(uid)
      return next
    })
  }

  const toggleAllSelectable = (checked) => {
    setSelectedUids((prev) => {
      const next = new Set(prev)
      for (const row of selectableRows) {
        if (checked) next.add(row.uid)
        else next.delete(row.uid)
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedUids(new Set())
  }

  const runBulkRoleUpdate = async () => {
    if (!actor || !bulkRole) return
    const targets = users.filter((u) => selectedUids.has(u.uid) && u.uid !== actor.uid)
    if (!targets.length) {
      toast.info('حدّد مستخدمين أولاً.', '')
      return
    }
    const roleLabel = USER_ROLES.find((r) => r.value === bulkRole)?.label || bulkRole
    const ok = window.confirm(`تأكيد تغيير الدور إلى "${roleLabel}" لعدد ${targets.length} مستخدم؟`)
    if (!ok) return
    setBulkBusy(true)
    let done = 0
    const failed = []
    for (const target of targets) {
      try {
        await adminUpdateUserRole(actor, target.uid, bulkRole)
        done += 1
      } catch {
        failed.push(target.uid)
      }
    }
    setBulkBusy(false)
    if (failed.length) {
      toast.warning(`تم تحديث ${done} من ${targets.length}. فشل: ${failed.slice(0, 5).join('، ')}`, 'تنبيه')
    } else {
      toast.success(`تم تحديث الدور لـ ${done} من ${targets.length}.`, 'تم')
      clearSelection()
    }
  }

  const runBulkProfileUpdate = async () => {
    if (!actor) return
    const targets = users.filter((u) => selectedUids.has(u.uid) && u.uid !== actor.uid)
    if (!targets.length) {
      toast.info('حدّد مستخدمين أولاً.', '')
      return
    }
    const profileLabel =
      bulkProfile === '__none__'
        ? 'بدون نوع'
        : permissionProfiles.find((p) => p.id === bulkProfile)?.name || bulkProfile
    const ok = window.confirm(`تأكيد تغيير نوع الصلاحيات إلى "${profileLabel}" لعدد ${targets.length} مستخدم؟`)
    if (!ok) return
    setBulkBusy(true)
    let done = 0
    const failed = []
    const nextProfileId = bulkProfile === '__none__' ? '' : bulkProfile
    for (const target of targets) {
      try {
        await adminUpdateUserPermissionProfile(actor, target.uid, nextProfileId)
        done += 1
      } catch {
        failed.push(target.uid)
      }
    }
    setBulkBusy(false)
    if (failed.length) {
      toast.warning(`تم تحديث ${done} من ${targets.length}. فشل: ${failed.slice(0, 5).join('، ')}`, 'تنبيه')
    } else {
      toast.success(`تم تحديث نوع الصلاحيات لـ ${done} من ${targets.length}.`, 'تم')
      clearSelection()
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

  const openDisplayModal = (u) => {
    setEditDisplayName(u.displayName?.trim() ?? '')
    setDisplayModalUser(u)
  }

  const saveDisplayName = async () => {
    if (!displayModalUser || !actor) return
    setDisplayModalBusyKind('name')
    try {
      await runBusy(displayModalUser.uid, async () => {
        await adminUpdateUserDisplayName(actor, displayModalUser.uid, editDisplayName)
      })
      toast.success('تم تحديث الاسم في قاعدة بيانات المنصة.', 'تم')
      setDisplayModalUser(null)
    } catch (e) {
      if (e?.message === 'DISPLAY_NAME_REQUIRED') {
        toast.warning('يرجى إدخال اسم للعرض.', 'تنبيه')
      } else {
        toast.warning('تعذّر الحفظ. تحقق من الصلاحيات.', 'تنبيه')
      }
    } finally {
      setDisplayModalBusyKind(null)
    }
  }

  const onAdminPhotoSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !displayModalUser || !actor) return
    setDisplayModalBusyKind('photo')
    try {
      await runBusy(displayModalUser.uid, async () => {
        await adminUploadUserProfilePhoto(actor, displayModalUser.uid, file)
      })
      toast.success('تم رفع الصورة وتحديث المستند.', 'تم')
      setDisplayModalUser(null)
    } catch (err) {
      const msg = messageForProfilePhotoError(err)
      toast.warning(msg || 'تعذّر رفع الصورة. تحقق من الصلاحيات وقواعد التخزين.', 'تنبيه')
    } finally {
      setDisplayModalBusyKind(null)
    }
  }

  const onAdminClearPhoto = async () => {
    if (!displayModalUser || !actor) return
    setDisplayModalBusyKind('clear')
    try {
      await runBusy(displayModalUser.uid, async () => {
        await adminClearUserProfilePhoto(actor, displayModalUser.uid)
      })
      toast.success('تمت إزالة رابط الصورة من المستند.', 'تم')
      setDisplayModalUser(null)
    } catch {
      toast.warning('تعذّر التحديث.', 'تنبيه')
    } finally {
      setDisplayModalBusyKind(null)
    }
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
          والإعدادات فقط إلى أن تُسنَد لهم صلاحيات أو يُختار «وصول كامل» من نوع الصلاحيات. يمكنك تعديل الاسم كنص ورفع
          صورة للملف الشخصي إلى التخزين لأي مستخدم من زر «الاسم والصورة» — يُخزَّن في Firestore والتخزين ولا يغيّر حساب
          Google. أيقونة المنزل
          تفتح رئيسيته، وأيقونة العين صفحة خططه.
        </p>
        <CrossNav items={adminCrossItems} className="rh-admin-users__cross" />
      </header>

      <section className="rh-admin-users__toolbar card">
        <div className="rh-admin-users__toolbar-grid">
          <SearchField
            label="بحث"
            placeholder="اسم، بريد، أو معرّف…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="users-role-filter">فلتر الدور</label>
            <select
              id="users-role-filter"
              className="ui-input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">الكل</option>
              {USER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="users-profile-filter">فلتر نوع الصلاحيات</label>
            <select
              id="users-profile-filter"
              className="ui-input"
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="__none__">بدون نوع</option>
              {permissionProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name || p.id}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rh-admin-users__bulk card">
        <label className="rh-admin-users__bulk-check">
          <input
            type="checkbox"
            checked={allSelectableChecked}
            disabled={!selectableRows.length || bulkBusy}
            onChange={(e) => toggleAllSelectable(e.target.checked)}
          />
          <span>تحديد الكل (مع استثناء حسابك الحالي)</span>
        </label>
        <p className="rh-admin-users__profile-meta rh-admin-users__profile-meta--compact">
          المحددون: {selectedUids.size}
        </p>
        <div className="rh-admin-users__bulk-actions">
          <Button type="button" variant="ghost" size="sm" disabled={!selectedUids.size || bulkBusy} onClick={clearSelection}>
            إلغاء تحديد الكل
          </Button>
        </div>
        <div className="rh-admin-users__bulk-row">
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="users-bulk-role">تغيير الدور للمحدد</label>
            <select
              id="users-bulk-role"
              className="ui-input"
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value)}
              disabled={bulkBusy}
            >
              <option value="">اختر الدور…</option>
              {USER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <Button type="button" variant="secondary" disabled={!bulkRole || bulkBusy} loading={bulkBusy} onClick={runBulkRoleUpdate}>
            تطبيق الدور على المحدد
          </Button>
        </div>
        <div className="rh-admin-users__bulk-row">
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="users-bulk-profile">تغيير نوع الصلاحيات للمحدد</label>
            <select
              id="users-bulk-profile"
              className="ui-input"
              value={bulkProfile}
              onChange={(e) => setBulkProfile(e.target.value)}
              disabled={bulkBusy}
            >
              <option value="">اختر النوع…</option>
              <option value="__none__">بدون نوع</option>
              {permissionProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name || p.id}</option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!bulkProfile || bulkBusy}
            loading={bulkBusy}
            onClick={runBulkProfileUpdate}
          >
            تطبيق النوع على المحدد
          </Button>
        </div>
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
                <label className="rh-admin-users__select-check">
                  <input
                    type="checkbox"
                    checked={selectedUids.has(u.uid)}
                    disabled={u.uid === actor?.uid || bulkBusy}
                    onChange={(e) => toggleSelected(u.uid, e.target.checked)}
                  />
                </label>
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
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onClick={() => openDisplayModal(u)}
                >
                  الاسم والصورة
                </Button>
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
        open={Boolean(displayModalUser)}
        title={displayModalUser ? `الاسم والصورة — ${displayModalUser.displayName?.trim() || displayModalUser.email || displayModalUser.uid}` : 'الاسم والصورة'}
        onClose={() => {
          if (displayModalUser && (busyUid === displayModalUser.uid || displayModalBusyKind)) return
          setDisplayModalUser(null)
        }}
        size="sm"
        closeOnBackdrop={!(displayModalUser && (busyUid === displayModalUser?.uid || displayModalBusyKind))}
        closeOnEsc={!(displayModalUser && (busyUid === displayModalUser?.uid || displayModalBusyKind))}
        showClose={!(displayModalUser && (busyUid === displayModalUser?.uid || displayModalBusyKind))}
      >
        <p className="rh-admin-users__profile-meta">
          الاسم يُحدَّث في Firestore فقط. الصورة تُرفع إلى التخزين ثم يُحفظ الرابط في المستند. حساب Google يبقى كما هو؛
          المستخدم يرى التغييرات داخل المنصة بعد التحديث.
        </p>
        <TextField
          label="الاسم المعروض"
          value={editDisplayName}
          onChange={(e) => setEditDisplayName(e.target.value)}
          hint="احفظ الاسم بزر «حفظ الاسم» منفصلاً عن رفع الصورة."
          autoComplete="off"
        />
        <p className="rh-admin-users__profile-meta rh-admin-users__profile-meta--compact">
          صورة الملف الشخصي: ملف حتى 2 ميجابايت (‎JPEG / PNG / WebP / GIF).
        </p>
        <input
          ref={adminPhotoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="rh-admin-users__hidden-file"
          onChange={onAdminPhotoSelected}
        />
        <div className="rh-admin-users__modal-actions rh-admin-users__modal-actions--wrap">
          <Button
            type="button"
            variant="primary"
            loading={displayModalBusyKind === 'name'}
            disabled={Boolean(displayModalBusyKind) && displayModalBusyKind !== 'name'}
            onClick={saveDisplayName}
          >
            حفظ الاسم
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={displayModalBusyKind === 'photo'}
            disabled={Boolean(displayModalBusyKind) && displayModalBusyKind !== 'photo'}
            onClick={() => adminPhotoInputRef.current?.click()}
          >
            رفع صورة
          </Button>
          <Button
            type="button"
            variant="ghost"
            loading={displayModalBusyKind === 'clear'}
            disabled={
              (Boolean(displayModalBusyKind) && displayModalBusyKind !== 'clear') || !displayModalUser?.photoURL
            }
            onClick={onAdminClearPhoto}
          >
            إزالة الصورة من المستند
          </Button>
        </div>
        <div className="rh-admin-users__modal-actions">
          <Button
            type="button"
            variant="ghost"
            disabled={Boolean(displayModalBusyKind)}
            onClick={() => setDisplayModalUser(null)}
          >
            إلغاء
          </Button>
        </div>
      </Modal>

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
