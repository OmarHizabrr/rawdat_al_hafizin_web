import { Compass, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { subscribeAllUsers } from '../services/adminUsersService.js'
import {
  DAWRA_MEMBER_ROLES,
  addUserToDawra,
  joinPublicDawra,
  loadDawrat,
  loadDawratMembersWithProfiles,
  removeDawraForUser,
  removeDawraMember,
  saveDawrat,
  setDawraMemberRole,
  subscribeDawrat,
} from '../utils/dawratStorage.js'
import { daysInclusiveYmd } from '../utils/datePeriodAr.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import {
  Button,
  DateField,
  Modal,
  ScrollArea,
  SearchField,
  TextField,
  TextAreaField,
  useToast,
} from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function newId() {
  return firestoreApi.getNewId('dawrat')
}

function dawraCanEdit(d) {
  return d?.dawraRole !== DAWRA_MEMBER_ROLES.MEMBER
}

function dawraCanManageMembers(d) {
  const r = d?.dawraRole
  return r === DAWRA_MEMBER_ROLES.OWNER || r === DAWRA_MEMBER_ROLES.ADMIN
}

function roleLabel(role) {
  if (role === DAWRA_MEMBER_ROLES.OWNER) return 'مالك'
  if (role === DAWRA_MEMBER_ROLES.ADMIN) return 'مشرف'
  return 'عضو'
}

const DELIVERY_LABELS = {
  online: 'عن بُعد',
  onsite: 'ميداني',
  hybrid: 'ميداني وعن بُعد',
}

const PH = PERMISSION_PAGE_IDS.dawrat

export default function DawratPage() {
  const { user } = useAuth()
  const { can } = usePermissions()
  const { branding, str } = useSiteContent()
  const toast = useToast()
  const { search } = useLocation()
  const [searchParams] = useSearchParams()
  const uidParam = searchParams.get('uid')?.trim() || ''
  const impersonateUid = getImpersonateUid(user, search)
  const appLink = useCallback((path) => withImpersonationQuery(path, impersonateUid), [impersonateUid])

  const viewUserId = useMemo(() => {
    if (!user?.uid) return ''
    if (uidParam && isAdmin(user)) return uidParam
    return user.uid
  }, [user, uidParam])

  const actingAsUser = Boolean(user?.uid && viewUserId && viewUserId !== user.uid)
  const readOnly = Boolean(actingAsUser && !isAdmin(user))

  const exploreHref = appLink('/app/dawrat/explore')

  const [saved, setSaved] = useState([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [dawraVisibility, setDawraVisibility] = useState('private')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [costLabel, setCostLabel] = useState('مجانية')
  const [deliveryMode, setDeliveryMode] = useState('online')
  const [registrationStart, setRegistrationStart] = useState('')
  const [registrationEnd, setRegistrationEnd] = useState('')
  const [courseStart, setCourseStart] = useState('')
  const [courseEnd, setCourseEnd] = useState('')
  const [benefitsText, setBenefitsText] = useState('')
  const [conditionsText, setConditionsText] = useState('')
  const [saveBusy, setSaveBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [joinId, setJoinId] = useState('')
  const [joinBusy, setJoinBusy] = useState(false)

  const [membersModal, setMembersModal] = useState(null)
  const [membersList, setMembersList] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [directoryUsers, setDirectoryUsers] = useState([])
  const [memberPickerQuery, setMemberPickerQuery] = useState('')
  const [addingMemberUid, setAddingMemberUid] = useState('')
  const [memberRowBusy, setMemberRowBusy] = useState(null)

  useEffect(() => {
    document.title = readOnly
      ? `دورات المستخدم — ${branding.siteTitle}`
      : actingAsUser
        ? `الدورات (نيابة) — ${branding.siteTitle}`
        : `الدورات — ${branding.siteTitle}`
  }, [readOnly, actingAsUser, branding.siteTitle])

  useEffect(() => {
    if (!viewUserId) return undefined
    let mounted = true
    loadDawrat(viewUserId).then((rows) => {
      if (mounted) setSaved(rows)
    })
    const unsub = subscribeDawrat(viewUserId, (rows) => {
      if (mounted) setSaved(rows)
    })
    return () => {
      mounted = false
      unsub()
    }
  }, [viewUserId])

  useEffect(() => {
    if (!membersModal?.id || !user?.uid) return undefined
    let cancelled = false
    setMembersLoading(true)
    loadDawratMembersWithProfiles(membersModal.id)
      .then((rows) => {
        if (!cancelled) setMembersList(rows)
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [membersModal?.id, user?.uid])

  useEffect(() => {
    if (!membersModal?.id || !user?.uid) {
      setDirectoryUsers([])
      return undefined
    }
    const unsub = subscribeAllUsers(setDirectoryUsers, () => setDirectoryUsers([]))
    return () => unsub()
  }, [membersModal?.id, user?.uid])

  const regDays = useMemo(
    () => daysInclusiveYmd(registrationStart, registrationEnd),
    [registrationStart, registrationEnd],
  )
  const courseDays = useMemo(() => daysInclusiveYmd(courseStart, courseEnd), [courseStart, courseEnd])

  const openAdd = () => {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setCostLabel('مجانية')
    setDeliveryMode('online')
    setRegistrationStart('')
    setRegistrationEnd('')
    setCourseStart('')
    setCourseEnd('')
    setBenefitsText('')
    setConditionsText('')
    setDawraVisibility('private')
    setEditorOpen(true)
  }

  const openEdit = (d) => {
    if (!dawraCanEdit(d)) return
    setEditingId(d.id)
    setTitle(d.title || '')
    setDescription(d.description || '')
    setCostLabel(d.costLabel || '')
    setDeliveryMode(d.deliveryMode === 'onsite' ? 'onsite' : d.deliveryMode === 'hybrid' ? 'hybrid' : 'online')
    setRegistrationStart(d.registrationStart || '')
    setRegistrationEnd(d.registrationEnd || '')
    setCourseStart(d.courseStart || '')
    setCourseEnd(d.courseEnd || '')
    setBenefitsText(d.benefitsText || '')
    setConditionsText(d.conditionsText || '')
    setDawraVisibility(d.dawraVisibility === 'public' ? 'public' : 'private')
    setEditorOpen(true)
  }

  const handleSave = async () => {
    if (!viewUserId) return
    if (registrationStart && registrationEnd && registrationEnd < registrationStart) {
      toast.warning('نهاية التسجيل يجب أن تكون بعد البداية.', '')
      return
    }
    if (courseStart && courseEnd && courseEnd < courseStart) {
      toast.warning('نهاية الدورة يجب أن تكون بعد البداية.', '')
      return
    }
    const nowIso = new Date().toISOString()
    const dawra = {
      id: editingId || newId(),
      createdAt: editingId ? saved.find((x) => x.id === editingId)?.createdAt ?? nowIso : nowIso,
      updatedAt: nowIso,
      dawraVisibility,
      title: title.trim() || `دورة ${new Date().toLocaleDateString('ar-SA')}`,
      description: description.trim(),
      costLabel: costLabel.trim() || '—',
      deliveryMode,
      registrationStart: registrationStart || null,
      registrationEnd: registrationEnd || null,
      courseStart: courseStart || null,
      courseEnd: courseEnd || null,
      registrationPeriodDays: regDays,
      coursePeriodDays: courseDays,
      benefitsText: benefitsText.trim() || null,
      conditionsText: conditionsText.trim() || null,
    }
    const next = editingId ? saved.map((x) => (x.id === editingId ? dawra : x)) : [dawra, ...saved]
    setSaveBusy(true)
    try {
      await saveDawrat(viewUserId, next, user ?? {})
      toast.success(editingId ? 'تم التحديث.' : 'تم إنشاء الدورة.', 'تم')
      setEditorOpen(false)
      setEditingId(null)
    } catch {
      toast.warning('تعذّر الحفظ.', 'تنبيه')
    } finally {
      setSaveBusy(false)
    }
  }

  const doDelete = async () => {
    if (!deleting?.id) return
    setDeleteBusy(true)
    try {
      await removeDawraForUser(viewUserId, deleting.id)
      toast.info(
        deleting.dawraRole === DAWRA_MEMBER_ROLES.MEMBER ? 'غادرت الدورة.' : 'حُذفت الدورة للجميع.',
        '',
      )
      setDeleting(null)
    } catch {
      toast.warning('تعذّر التنفيذ.', 'تنبيه')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  const handleJoin = async () => {
    const id = joinId.trim()
    if (!id || !viewUserId || !user) return
    setJoinBusy(true)
    try {
      await joinPublicDawra(viewUserId, id, user)
      setJoinId('')
      toast.success('تم الانضمام.', 'تم')
    } catch (e) {
      const m = e?.message
      if (m === 'DAWRA_NOT_PUBLIC') toast.warning('الدورة ليست عامة.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else if (m === 'DAWRA_NOT_FOUND') toast.warning('لم يُعثر على دورة بهذا المعرف.', '')
      else toast.warning('تعذّر الانضمام.', '')
    } finally {
      setJoinBusy(false)
    }
  }

  const memberUidSet = useMemo(() => new Set(membersList.map((r) => r.userId)), [membersList])
  const filteredPickerUsers = useMemo(() => {
    const q = memberPickerQuery.trim().toLowerCase()
    let list = directoryUsers
    if (q) {
      list = list.filter((u) => {
        const hay = `${u.displayName || ''} ${u.email || ''} ${u.uid || ''}`.toLowerCase()
        return hay.includes(q)
      })
    }
    return [...list].sort((a, b) => {
      const aAdded = memberUidSet.has(a.uid)
      const bAdded = memberUidSet.has(b.uid)
      if (aAdded !== bAdded) return aAdded ? 1 : -1
      return (a.displayName || a.uid || '').localeCompare(b.displayName || b.uid || '', 'ar')
    })
  }, [directoryUsers, memberPickerQuery, memberUidSet])

  const refreshMembers = () => {
    if (!membersModal?.id) return
    setMembersLoading(true)
    loadDawratMembersWithProfiles(membersModal.id)
      .then(setMembersList)
      .finally(() => setMembersLoading(false))
  }

  const crossItems = useMemo(
    () => [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/halakat'), label: str('layout.nav_halakat') },
      { to: exploreHref, label: str('layout.nav_dawrat_explore') },
      { to: appLink('/app/plans'), label: str('layout.nav_plans') },
      { to: appLink('/app/settings'), label: str('layout.nav_settings') },
    ],
    [str, exploreHref, appLink],
  )

  return (
    <div className="rh-plans">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">{readOnly ? 'دورات المستخدم' : 'الدورات'}</h1>
            <p className="rh-plans__desc">
              إدارة الدورات: العنوان والوصف والتكلفة وآلية العرض (عن بُعد / ميداني / الاثنين)، فترات
              التسجيل والدورة، والمميزات والشروط (اختياري)، مع أعضاء بنفس نظام الخطط.
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          {!readOnly && can(PH, 'dawra_create') && (
            <div className="rh-plans__hero-actions">
              <Button type="button" variant="primary" className="rh-plans__add-btn" onClick={openAdd}>
                <RhIcon as={Plus} size={18} strokeWidth={RH_ICON_STROKE} />
                إضافة دورة
              </Button>
            </div>
          )}
        </div>
      </header>

      {!readOnly && can(PH, 'dawra_join_public') && (
        <section className="rh-settings-card rh-plans__join-card">
          <div className="rh-settings-card__head">
            <h2 className="rh-settings-card__title">الانضمام لدورة عامة</h2>
          </div>
          <div className="rh-plans__join-row">
            <TextField label="معرف الدورة" value={joinId} onChange={(e) => setJoinId(e.target.value)} />
            <Button
              type="button"
              variant="secondary"
              className="rh-plans__join-btn"
              loading={joinBusy}
              disabled={!joinId.trim() || !viewUserId}
              onClick={handleJoin}
            >
              {!joinBusy && <RhIcon as={UserPlus} size={18} strokeWidth={RH_ICON_STROKE} />}
              انضمام
            </Button>
          </div>
          <div className="rh-plans__join-explore">
            <Link className="ui-btn ui-btn--secondary rh-plans__explore-link" to={exploreHref}>
              <RhIcon as={Compass} size={18} strokeWidth={RH_ICON_STROKE} />
              استكشاف الدورات العامة
            </Link>
          </div>
        </section>
      )}

      {saved.length > 0 ? (
        <section className="rh-plans__saved">
          <h2 className="rh-plans__saved-title">دوراتك</h2>
          <ul className="rh-plans__saved-list">
            {saved.map((d) => (
              <li key={d.id} className="rh-plans__saved-card">
                <div className="rh-plans__saved-head">
                  <div className="rh-plans__saved-head-main">
                    <strong>{d.title}</strong>
                    <span className="rh-plans__saved-badges">
                      <span className="rh-plans__saved-badge">
                        {d.dawraVisibility === 'public' ? 'عامة' : 'خاصة'}
                      </span>
                      <span className="rh-plans__saved-badge">{roleLabel(d.dawraRole)}</span>
                      <span className="rh-plans__saved-badge">{DELIVERY_LABELS[d.deliveryMode] || d.deliveryMode}</span>
                      <span className="rh-plans__saved-badge">{d.costLabel}</span>
                    </span>
                  </div>
                </div>
                <p className="rh-plans__saved-meta">
                  <strong>التسجيل:</strong>{' '}
                  {d.registrationStart && d.registrationEnd
                    ? `${d.registrationStart} → ${d.registrationEnd} (${d.registrationPeriodDays ?? '—'} يوماً)`
                    : '—'}
                  <br />
                  <strong>الدورة:</strong>{' '}
                  {d.courseStart && d.courseEnd
                    ? `${d.courseStart} → ${d.courseEnd} (${d.coursePeriodDays ?? '—'} يوماً)`
                    : '—'}
                </p>
                {d.description && <p className="rh-plans__saved-desc">{d.description}</p>}
                {d.benefitsText && (
                  <p className="rh-plans__saved-desc">
                    <strong>المميزات:</strong> {d.benefitsText}
                  </p>
                )}
                {d.conditionsText && (
                  <p className="rh-plans__saved-desc">
                    <strong>الشروط:</strong> {d.conditionsText}
                  </p>
                )}
                <p className="rh-plans__saved-meta">
                  المعرف: <code className="rh-plans__plan-id">{d.id}</code>
                </p>
                <div className="rh-plans__saved-actions">
                  {dawraCanManageMembers(d) && can(PH, 'dawra_card_members') && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => setMembersModal(d)}>
                      <RhIcon as={Users} size={16} strokeWidth={RH_ICON_STROKE} />
                      الأعضاء
                    </Button>
                  )}
                  {dawraCanEdit(d) && can(PH, 'dawra_card_edit') && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(d)}>
                      <RhIcon as={Pencil} size={16} strokeWidth={RH_ICON_STROKE} />
                      تعديل
                    </Button>
                  )}
                  {can(PH, 'dawra_card_delete_leave') && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(d)}>
                      <RhIcon as={Trash2} size={16} strokeWidth={RH_ICON_STROKE} />
                      {d.dawraRole === DAWRA_MEMBER_ROLES.MEMBER ? 'مغادرة' : 'حذف'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="rh-plans__empty">لا توجد دورات بعد.</p>
      )}

      <Modal
        open={editorOpen}
        title={editingId ? 'تعديل الدورة' : 'دورة جديدة'}
        onClose={() => {
          if (!saveBusy) {
            setEditorOpen(false)
            setEditingId(null)
          }
        }}
        size="lg"
        closeOnBackdrop={!saveBusy}
        closeOnEsc={!saveBusy}
        showClose={!saveBusy}
      >
        <ScrollArea className="rh-plans__editor-scroll" padded>
          <TextField label="عنوان الدورة" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextAreaField label="الوصف" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <TextField
            label="التكلفة (نص حر)"
            hint="مثال: مجانية، 100 دولار، 50 ريال…"
            value={costLabel}
            onChange={(e) => setCostLabel(e.target.value)}
          />
          <p className="rh-plans__field-label">آلية الدورة</p>
          <div className="rh-segment rh-segment--plans">
            {[
              { v: 'online', l: 'عن بُعد' },
              { v: 'onsite', l: 'ميداني' },
              { v: 'hybrid', l: 'ميداني وعن بُعد' },
            ].map(({ v, l }) => (
              <button
                key={v}
                type="button"
                className={['rh-segment__btn', deliveryMode === v ? 'rh-segment__btn--active' : ''].join(' ')}
                onClick={() => setDeliveryMode(v)}
              >
                <span className="rh-segment__label">{l}</span>
              </button>
            ))}
          </div>
          <p className="rh-plans__field-label">الظهور</p>
          <div className="rh-segment rh-segment--plans">
            <button
              type="button"
              className={['rh-segment__btn', dawraVisibility === 'private' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => setDawraVisibility('private')}
            >
              خاصة
            </button>
            <button
              type="button"
              className={['rh-segment__btn', dawraVisibility === 'public' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => setDawraVisibility('public')}
            >
              عامة
            </button>
          </div>
          <h3 className="rh-settings-card__title" style={{ marginTop: '1rem' }}>
            التسجيل
          </h3>
          <div className="rh-plans__dates-grid">
            <DateField label="بداية التسجيل" value={registrationStart} onChange={(e) => setRegistrationStart(e.target.value)} />
            <DateField
              label="نهاية التسجيل"
              value={registrationEnd}
              onChange={(e) => setRegistrationEnd(e.target.value)}
              min={registrationStart || undefined}
            />
          </div>
          {regDays != null && (
            <p className="ui-field__hint">مدة التسجيل: {regDays} يوماً (شاملة)</p>
          )}
          <h3 className="rh-settings-card__title" style={{ marginTop: '1rem' }}>
            فترة الدورة
          </h3>
          <div className="rh-plans__dates-grid">
            <DateField label="بداية الدورة" value={courseStart} onChange={(e) => setCourseStart(e.target.value)} />
            <DateField
              label="نهاية الدورة"
              value={courseEnd}
              onChange={(e) => setCourseEnd(e.target.value)}
              min={courseStart || undefined}
            />
          </div>
          {courseDays != null && <p className="ui-field__hint">مدة الدورة: {courseDays} يوماً (شاملة)</p>}
          <TextAreaField
            label="مميزات الدورة (اختياري)"
            value={benefitsText}
            onChange={(e) => setBenefitsText(e.target.value)}
            rows={2}
          />
          <TextAreaField
            label="شروط الدورة (اختياري)"
            value={conditionsText}
            onChange={(e) => setConditionsText(e.target.value)}
            rows={2}
          />
          <div className="rh-plans__actions">
            <Button type="button" variant="primary" onClick={handleSave} loading={saveBusy}>
              حفظ
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditorOpen(false)} disabled={saveBusy}>
              إلغاء
            </Button>
          </div>
        </ScrollArea>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        title="تأكيد"
        onClose={() => !deleteBusy && setDeleting(null)}
        size="sm"
        closeOnBackdrop={!deleteBusy}
        closeOnEsc={!deleteBusy}
        showClose={!deleteBusy}
      >
        <p className="rh-plans__warn rh-plans__warn--confirm">
          {deleting?.dawraRole === DAWRA_MEMBER_ROLES.MEMBER ? 'مغادرة الدورة؟' : 'حذف الدورة للجميع؟'}
        </p>
        <div className="rh-plans__actions">
          <Button type="button" variant="danger" loading={deleteBusy} onClick={doDelete}>
            تأكيد
          </Button>
          <Button type="button" variant="ghost" disabled={deleteBusy} onClick={() => setDeleting(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(membersModal)}
        title={membersModal ? `أعضاء: ${membersModal.title}` : ''}
        onClose={() => {
          if (memberRowBusy || addingMemberUid) return
          setMembersModal(null)
          setMembersList([])
          setMemberPickerQuery('')
        }}
        size="lg"
        contentClassName="ui-modal__content--plan-members"
        closeOnBackdrop={!memberRowBusy && !addingMemberUid}
        closeOnEsc={!memberRowBusy && !addingMemberUid}
        showClose={!memberRowBusy && !addingMemberUid}
      >
        <div className="rh-plan-members-modal__body">
          <p className="rh-plans__saved-meta">
            المعرف: <code className="rh-plans__plan-id">{membersModal?.id}</code>
          </p>
          {can(PH, 'dawra_member_add') && (
            <section className="rh-plan-members-modal__section">
              <SearchField label="بحث" value={memberPickerQuery} onChange={(e) => setMemberPickerQuery(e.target.value)} />
              <ScrollArea className="rh-plan-members-picker" padded maxHeight="min(14rem, 36vh)">
                <ul className="rh-plan-members-picker__list">
                  {filteredPickerUsers.map((u) => {
                    const added = memberUidSet.has(u.uid)
                    const busy = addingMemberUid === u.uid
                    return (
                      <li key={u.uid} className="rh-plan-members-picker__item-wrap">
                        <button
                          type="button"
                          className={['rh-plan-members-pick__row', added ? 'rh-plan-members-pick__row--added' : '']
                            .filter(Boolean)
                            .join(' ')}
                          disabled={added || busy}
                          onClick={async () => {
                            if (!user || !membersModal?.id) return
                            setAddingMemberUid(u.uid)
                            try {
                              await addUserToDawra(user, membersModal.id, u.uid, user)
                              toast.success('تمت الإضافة.', 'تم')
                              refreshMembers()
                            } catch (e) {
                              if (e?.message === 'ALREADY_MEMBER') toast.info('مضاف مسبقاً.', '')
                              else toast.warning('تعذّرت الإضافة.', '')
                            } finally {
                              setAddingMemberUid('')
                            }
                          }}
                        >
                          <span className="rh-plan-members-pick__name">{u.displayName || u.uid}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </ScrollArea>
            </section>
          )}
          <section className="rh-plan-members-modal__section">
            {membersLoading ? (
              <p>جاري التحميل…</p>
            ) : (
              <ul className="rh-members-chat-list">
                {membersList.map((row) => {
                  const isOwner = row.role === DAWRA_MEMBER_ROLES.OWNER
                  return (
                    <li key={row.userId} className="rh-members-chat__item">
                      <div className="rh-members-chat__main">
                        <strong>{row.displayName || row.userId}</strong>
                        <span className="rh-plans__saved-badge">{roleLabel(row.role)}</span>
                      </div>
                      {!isOwner && (
                        <div className="rh-members-chat__actions">
                          {can(PH, 'dawra_member_promote') && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              loading={memberRowBusy?.uid === row.userId && memberRowBusy?.kind === 'admin'}
                              disabled={Boolean(memberRowBusy)}
                              onClick={async () => {
                                if (!user || !membersModal?.id) return
                                const next =
                                  row.role === DAWRA_MEMBER_ROLES.ADMIN
                                    ? DAWRA_MEMBER_ROLES.MEMBER
                                    : DAWRA_MEMBER_ROLES.ADMIN
                                setMemberRowBusy({ uid: row.userId, kind: 'admin' })
                                try {
                                  await setDawraMemberRole(user, membersModal.id, row.userId, next, user)
                                  refreshMembers()
                                } catch {
                                  toast.warning('تعذّر.', '')
                                } finally {
                                  setMemberRowBusy(null)
                                }
                              }}
                            >
                              {row.role === DAWRA_MEMBER_ROLES.ADMIN ? 'إلغاء مشرف' : 'مشرف'}
                            </Button>
                          )}
                          {can(PH, 'dawra_member_remove') && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              loading={memberRowBusy?.uid === row.userId && memberRowBusy?.kind === 'remove'}
                              disabled={Boolean(memberRowBusy)}
                              onClick={async () => {
                                if (!user || !membersModal?.id) return
                                setMemberRowBusy({ uid: row.userId, kind: 'remove' })
                                try {
                                  await removeDawraMember(user, membersModal.id, row.userId)
                                  refreshMembers()
                                } catch {
                                  toast.warning('تعذّر.', '')
                                } finally {
                                  setMemberRowBusy(null)
                                }
                              }}
                            >
                              إزالة
                            </Button>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </Modal>
    </div>
  )
}
