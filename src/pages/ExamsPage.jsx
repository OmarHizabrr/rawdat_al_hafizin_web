import { Compass, Pencil, Plus, Trash2, UserPlus, Users, Video } from 'lucide-react'
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
import { HALAKA_MEMBER_ROLES } from '../utils/halakatStorage.js'
import {
  addUserToExam,
  joinPublicExam,
  loadExamMembersWithProfiles,
  loadExams,
  removeExamForUser,
  removeExamMember,
  saveExams,
  setExamMemberRole,
  subscribeExams,
} from '../utils/examsStorage.js'
import { VOLUME_BY_ID } from '../data/volumes.js'
import {
  EXAM_VOLUME_SCOPE,
  formatExamVolumeSpecsSummaryLines,
  normalizeExamVolumeSpecs,
  totalResolvedPagesFromExamVolumeSpecs,
  VOLUMES,
} from '../utils/examVolumeSpec.js'
import { leavingUserDeletesWholeGroup } from '../utils/groupMembership.js'
import { mergeUserDirectoryRows } from '../utils/userDirectoryMerge.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import {
  Button,
  Modal,
  ScrollArea,
  SearchField,
  TextField,
  TextAreaField,
  useToast,
} from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function newId() {
  return firestoreApi.getNewId('exams')
}

const PH = PERMISSION_PAGE_IDS.exams

function examCanEdit(ex) {
  return ex?.examRole !== HALAKA_MEMBER_ROLES.STUDENT
}

function examCanManageMembers(ex) {
  const r = ex?.examRole
  return r === HALAKA_MEMBER_ROLES.OWNER || r === HALAKA_MEMBER_ROLES.SUPERVISOR
}

function roleLabel(role) {
  if (role === HALAKA_MEMBER_ROLES.OWNER) return 'مالك'
  if (role === HALAKA_MEMBER_ROLES.SUPERVISOR) return 'مشرف'
  if (role === HALAKA_MEMBER_ROLES.TEACHER) return 'معلم'
  return 'طالب'
}

const ROLE_RANK = {
  [HALAKA_MEMBER_ROLES.OWNER]: 4,
  [HALAKA_MEMBER_ROLES.SUPERVISOR]: 3,
  [HALAKA_MEMBER_ROLES.TEACHER]: 2,
  [HALAKA_MEMBER_ROLES.STUDENT]: 1,
}

function normalizeRole(role) {
  if (role === HALAKA_MEMBER_ROLES.OWNER) return HALAKA_MEMBER_ROLES.OWNER
  if (role === HALAKA_MEMBER_ROLES.SUPERVISOR) return HALAKA_MEMBER_ROLES.SUPERVISOR
  if (role === HALAKA_MEMBER_ROLES.TEACHER) return HALAKA_MEMBER_ROLES.TEACHER
  return HALAKA_MEMBER_ROLES.STUDENT
}

function canManageRole(actorRole, targetRole) {
  const actor = normalizeRole(actorRole)
  const target = normalizeRole(targetRole)
  if (actor === HALAKA_MEMBER_ROLES.OWNER) return true
  if (actor === HALAKA_MEMBER_ROLES.SUPERVISOR) {
    return target === HALAKA_MEMBER_ROLES.TEACHER || target === HALAKA_MEMBER_ROLES.STUDENT
  }
  if (actor === HALAKA_MEMBER_ROLES.TEACHER) return target === HALAKA_MEMBER_ROLES.STUDENT
  return false
}

function canAssignRole(actorRole, targetRole, nextRole) {
  const actor = normalizeRole(actorRole)
  const target = normalizeRole(targetRole)
  const next = normalizeRole(nextRole)
  return (
    canManageRole(actor, target) &&
    canManageRole(actor, next) &&
    (ROLE_RANK[next] || 0) < (ROLE_RANK[actor] || 0)
  )
}

const EXAM_SCOPE_SELECT_OPTIONS = [
  { value: EXAM_VOLUME_SCOPE.FULL, label: 'المجلد كاملاً' },
  { value: EXAM_VOLUME_SCOPE.THREE_QUARTERS, label: 'ثلاثة أرباع المجلد' },
  { value: EXAM_VOLUME_SCOPE.HALF, label: 'نصف المجلد' },
  { value: EXAM_VOLUME_SCOPE.QUARTER, label: 'ربع المجلد' },
  { value: EXAM_VOLUME_SCOPE.CUSTOM, label: 'عدد صفحات محدد' },
]

function newVolumeRowKey() {
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function editorRowsFromSpecs(specs) {
  const n = normalizeExamVolumeSpecs(specs)
  return n.map((s) => ({
    key: newVolumeRowKey(),
    volumeId: s.volumeId,
    scope: s.scope,
    customPages: s.customPages != null ? String(s.customPages) : '',
  }))
}

function specsFromEditorRows(rows) {
  return rows.map((r) => ({
    volumeId: r.volumeId,
    scope: r.scope,
    customPages: r.scope === EXAM_VOLUME_SCOPE.CUSTOM ? r.customPages : null,
  }))
}

export default function ExamsPage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
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
  const exploreHref = appLink('/app/exams/explore')

  const [saved, setSaved] = useState([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [examVisibility, setExamVisibility] = useState('private')
  const [volumeRows, setVolumeRows] = useState([])
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
      ? `الاختبار (عرض) — ${branding.siteTitle}`
      : actingAsUser
        ? `الاختبار (نيابة) — ${branding.siteTitle}`
        : `الاختبار — ${branding.siteTitle}`
  }, [readOnly, actingAsUser, branding.siteTitle])

  useEffect(() => {
    if (!viewUserId) return undefined
    let mounted = true
    loadExams(viewUserId).then((rows) => {
      if (mounted) setSaved(rows)
    })
    const unsub = subscribeExams(viewUserId, (rows) => {
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
    loadExamMembersWithProfiles(membersModal.id)
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

  const memberUidSet = useMemo(() => new Set(membersList.map((r) => r.userId)), [membersList])

  const memberDirectoryExtras = useMemo(() => {
    const out = []
    if (user?.uid) {
      out.push({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
      })
    }
    for (const row of membersList) {
      if (!row.userId) continue
      out.push({
        uid: row.userId,
        displayName: row.displayName,
        email: row.email,
        photoURL: row.photoURL,
        role: row.role,
      })
    }
    return out
  }, [user, membersList])

  const mergedDirectoryUsers = useMemo(
    () => mergeUserDirectoryRows(directoryUsers, memberDirectoryExtras),
    [directoryUsers, memberDirectoryExtras],
  )

  const draftExamTotalPages = useMemo(
    () => totalResolvedPagesFromExamVolumeSpecs(specsFromEditorRows(volumeRows)),
    [volumeRows],
  )

  const filteredPickerUsers = useMemo(() => {
    const q = memberPickerQuery.trim().toLowerCase()
    let list = mergedDirectoryUsers
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
  }, [mergedDirectoryUsers, memberPickerQuery, memberUidSet])

  const refreshMembers = () => {
    if (!membersModal?.id) return
    setMembersLoading(true)
    loadExamMembersWithProfiles(membersModal.id)
      .then(setMembersList)
      .finally(() => setMembersLoading(false))
  }

  const openAdd = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setExamVisibility('private')
    setVolumeRows([])
    setEditorOpen(true)
  }

  const openEdit = (ex) => {
    if (!examCanEdit(ex)) return
    setEditingId(ex.id)
    setName(ex.name || '')
    setDescription(ex.description || '')
    setExamVisibility(ex.examVisibility === 'public' ? 'public' : 'private')
    setVolumeRows(editorRowsFromSpecs(ex.examVolumeSpecs))
    setEditorOpen(true)
  }

  const addVolumeRow = () => {
    const firstId = VOLUMES[0]?.id || ''
    if (!firstId) return
    setVolumeRows((prev) => [
      ...prev,
      { key: newVolumeRowKey(), volumeId: firstId, scope: EXAM_VOLUME_SCOPE.FULL, customPages: '' },
    ])
  }

  const patchVolumeRow = (key, patch) => {
    setVolumeRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const removeVolumeRow = (key) => {
    setVolumeRows((prev) => prev.filter((r) => r.key !== key))
  }

  const handleSave = async () => {
    if (!viewUserId) return
    const nowIso = new Date().toISOString()
    const examVolumeSpecs = normalizeExamVolumeSpecs(specsFromEditorRows(volumeRows))
    const row = {
      id: editingId || newId(),
      createdAt: editingId ? saved.find((x) => x.id === editingId)?.createdAt ?? nowIso : nowIso,
      updatedAt: nowIso,
      name: name.trim() || `اختبار ${new Date().toLocaleDateString('ar-SA')}`,
      description: description.trim(),
      examVolumeSpecs,
      examVisibility,
    }
    const next = editingId ? saved.map((x) => (x.id === editingId ? { ...x, ...row } : x)) : [row, ...saved]
    setSaveBusy(true)
    try {
      await saveExams(viewUserId, next, user ?? {})
      toast.success(editingId ? 'تم التحديث.' : 'تم إنشاء مجموعة الاختبار.', 'تم')
      setEditorOpen(false)
      setEditingId(null)
      setVolumeRows([])
    } catch {
      toast.warning('تعذّر الحفظ.', 'تنبيه')
    } finally {
      setSaveBusy(false)
    }
  }

  const doDelete = async () => {
    if (!deleting?.id) return
    setDeleteBusy(true)
    let outcome = 'noop'
    try {
      outcome = await removeExamForUser(viewUserId, deleting.id)
    } catch {
      toast.warning('تعذّر التنفيذ.', 'تنبيه')
      setDeleting(null)
      return
    } finally {
      setDeleteBusy(false)
    }
    if (outcome === 'noop') {
      toast.warning('تعذّر إكمال العملية.', 'تنبيه')
      setDeleting(null)
      return
    }
    toast.info(outcome === 'deletedFully' ? 'حُذفت المجموعة للجميع.' : 'غادرت المجموعة.', '')
    setDeleting(null)
  }

  const handleJoin = async () => {
    const id = joinId.trim()
    if (!id || !viewUserId || !user) return
    setJoinBusy(true)
    try {
      await joinPublicExam(viewUserId, id, user)
      setJoinId('')
      toast.success('تم الانضمام.', 'تم')
    } catch (e) {
      const m = e?.message
      if (m === 'EXAM_NOT_PUBLIC') toast.warning('المجموعة ليست عامة.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else if (m === 'EXAM_NOT_FOUND') toast.warning('لم يُعثر على مجموعة بهذا المعرف.', '')
      else toast.warning('تعذّر الانضمام.', '')
    } finally {
      setJoinBusy(false)
    }
  }

  const crossItems = useMemo(() => {
    const items = [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/plans'), label: str('layout.nav_plans') },
      { to: appLink('/app/halakat'), label: str('layout.nav_halakat') },
      { to: exploreHref, label: str('layout.nav_exams_explore') },
      { to: appLink('/app/dawrat'), label: str('layout.nav_dawrat') },
    ]
    if (canAccessPage('leave_request')) {
      items.push({ to: appLink('/app/leave-request'), label: str('layout.nav_leave_request') })
    }
    items.push({ to: appLink('/app/settings'), label: str('layout.nav_settings') })
    return items
  }, [str, exploreHref, appLink, canAccessPage])

  return (
    <div className="rh-plans">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">{readOnly ? 'الاختبار (عرض)' : 'الاختبار'}</h1>
            <p className="rh-plans__desc">
              {readOnly
                ? 'عرض للقراءة فقط.'
                : 'مجموعات اختبار بنفس هيكل الأعضاء (مالك، مشرف، معلم، طالب): ربط عدة مجلدات مع نطاق صفحات (ربع، نصف، … أو عدد مخصص)، عامة أو خاصة.'}
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          {!readOnly && can(PH, 'exam_create') && (
            <div className="rh-plans__hero-actions">
              <Button type="button" variant="primary" className="rh-plans__add-btn" onClick={openAdd}>
                <RhIcon as={Plus} size={18} strokeWidth={RH_ICON_STROKE} />
                مجموعة جديدة
              </Button>
            </div>
          )}
        </div>
      </header>

      {!readOnly && can(PH, 'exam_join_public') && (
        <section className="rh-settings-card rh-plans__join-card">
          <div className="rh-settings-card__head">
            <h2 className="rh-settings-card__title">الانضمام لمجموعة عامة</h2>
            <p className="rh-settings-card__subtitle">أدخل المعرف إن كانت المجموعة معروضة كعامة.</p>
          </div>
          <div className="rh-plans__join-row">
            <TextField label="معرف المجموعة" value={joinId} onChange={(e) => setJoinId(e.target.value)} />
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
              استكشاف الاختبارات العامة
            </Link>
          </div>
        </section>
      )}

      {saved.length > 0 ? (
        <section className="rh-plans__saved">
          <h2 className="rh-plans__saved-title">مجموعاتك</h2>
          <ul className="rh-plans__saved-list">
            {saved.map((ex) => {
              const volLines = formatExamVolumeSpecsSummaryLines(ex.examVolumeSpecs)
              const volTotal = totalResolvedPagesFromExamVolumeSpecs(ex.examVolumeSpecs)
              return (
              <li key={ex.id} className="rh-plans__saved-card">
                <div className="rh-plans__saved-head">
                  <div className="rh-plans__saved-head-main">
                    <strong>{ex.name}</strong>
                    <span className="rh-plans__saved-badges">
                      <span className="rh-plans__saved-badge">
                        {ex.examVisibility === 'public' ? 'عامة' : 'خاصة'}
                      </span>
                      <span className="rh-plans__saved-badge">{roleLabel(ex.examRole)}</span>
                    </span>
                  </div>
                </div>
                {ex.description && <p className="rh-plans__saved-desc">{ex.description}</p>}
                {volLines.length > 0 && (
                  <>
                    <ul className="rh-plans__saved-vols">
                      {volLines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                    {volTotal > 0 ? (
                      <p className="rh-plans__saved-meta rh-exam-volumes-total">
                        المجموع التقريبي للاختبار: <strong>{volTotal}</strong> صفحة
                      </p>
                    ) : null}
                  </>
                )}
                <p className="rh-plans__saved-meta">
                  المعرف: <code className="rh-plans__plan-id">{ex.id}</code>
                </p>
                <div className="rh-plans__saved-actions">
                  {examCanEdit(ex) && !readOnly && canAccessPage('remote_tasmee') && (
                    <Link
                      className="ui-btn ui-btn--secondary ui-btn--sm"
                      to={appLink(`/app/remote-tasmee?fromExam=${encodeURIComponent(ex.id)}`)}
                    >
                      <RhIcon as={Video} size={16} strokeWidth={RH_ICON_STROKE} />
                      بث تسميع
                    </Link>
                  )}
                  {examCanManageMembers(ex) && can(PH, 'exam_card_members') && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => setMembersModal(ex)}>
                      <RhIcon as={Users} size={16} strokeWidth={RH_ICON_STROKE} />
                      الأعضاء
                    </Button>
                  )}
                  {examCanEdit(ex) && can(PH, 'exam_card_edit') && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(ex)}>
                      <RhIcon as={Pencil} size={16} strokeWidth={RH_ICON_STROKE} />
                      تعديل
                    </Button>
                  )}
                  {can(PH, 'exam_card_delete_leave') && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(ex)}>
                      <RhIcon as={Trash2} size={16} strokeWidth={RH_ICON_STROKE} />
                      {leavingUserDeletesWholeGroup(viewUserId, ex.ownerUid, ex.examRole, HALAKA_MEMBER_ROLES)
                        ? 'حذف'
                        : 'مغادرة'}
                    </Button>
                  )}
                </div>
              </li>
              )
            })}
          </ul>
        </section>
      ) : (
        <p className="rh-plans__empty">لا توجد مجموعات بعد. أنشئ مجموعة أو انضم لعامة من الاستكشاف.</p>
      )}

      <Modal
        open={editorOpen}
        title={editingId ? 'تعديل مجموعة الاختبار' : 'مجموعة اختبار جديدة'}
        onClose={() => {
          if (!saveBusy) {
            setEditorOpen(false)
            setEditingId(null)
            setVolumeRows([])
          }
        }}
        size="lg"
        closeOnBackdrop={!saveBusy}
        closeOnEsc={!saveBusy}
        showClose={!saveBusy}
      >
        <ScrollArea className="rh-plans__editor-scroll" padded>
          <TextField label="اسم المجموعة" value={name} onChange={(e) => setName(e.target.value)} />
          <TextAreaField label="وصف (اختياري)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <section className="rh-exam-volume-editor" aria-label="مجلدات الاختبار">
            <p className="rh-plans__field-label">مجلدات الاختبار</p>
            <p className="rh-exam-volume-editor__hint">
              أضف مجلداً أو أكثر؛ لكل مجلد اختر النطاق (ربع، نصف، ثلاثة أرباع، كامل، أو عدد صفحات لا يتجاوز إجمالي
              المجلد).
            </p>
            {volumeRows.length === 0 ? (
              <p className="rh-exam-volume-editor__empty">
                لم تُضف مجلدات. يمكنك الحفظ بدون مجلدات أو الضغط على «إضافة مجلد».
              </p>
            ) : (
              <ul className="rh-exam-volume-editor__rows">
                {volumeRows.map((r) => {
                  const maxP = VOLUME_BY_ID[r.volumeId]?.pages ?? 1
                  return (
                    <li key={r.key} className="rh-exam-volume-row">
                      <div className="rh-exam-volume-row__fields">
                        <div className="ui-field">
                          <label className="ui-field__label" htmlFor={`exam-vol-${r.key}`}>
                            المجلد
                          </label>
                          <select
                            id={`exam-vol-${r.key}`}
                            className="ui-input"
                            value={r.volumeId}
                            onChange={(e) => patchVolumeRow(r.key, { volumeId: e.target.value })}
                          >
                            {VOLUMES.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label} — {v.pages} صفحة
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="ui-field">
                          <label className="ui-field__label" htmlFor={`exam-scope-${r.key}`}>
                            نطاق الصفحات
                          </label>
                          <select
                            id={`exam-scope-${r.key}`}
                            className="ui-input"
                            value={r.scope}
                            onChange={(e) => patchVolumeRow(r.key, { scope: e.target.value })}
                          >
                            {EXAM_SCOPE_SELECT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {r.scope === EXAM_VOLUME_SCOPE.CUSTOM && (
                          <div className="ui-field">
                            <label className="ui-field__label" htmlFor={`exam-pages-${r.key}`}>
                              عدد الصفحات (حدّ أقصى {maxP})
                            </label>
                            <input
                              id={`exam-pages-${r.key}`}
                              type="number"
                              className="ui-input"
                              min={1}
                              max={maxP}
                              value={r.customPages}
                              onChange={(e) => patchVolumeRow(r.key, { customPages: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeVolumeRow(r.key)}>
                        <RhIcon as={Trash2} size={16} strokeWidth={RH_ICON_STROKE} />
                        إزالة
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={addVolumeRow} disabled={!VOLUMES.length}>
              <RhIcon as={Plus} size={16} strokeWidth={RH_ICON_STROKE} />
              إضافة مجلد
            </Button>
            {draftExamTotalPages > 0 ? (
              <p className="rh-exam-volume-editor__total" role="status">
                المجموع التقريبي قبل الحفظ: <strong>{draftExamTotalPages}</strong> صفحة
              </p>
            ) : null}
          </section>
          <p className="rh-plans__field-label">الظهور</p>
          <div className="rh-segment rh-segment--plans">
            <button
              type="button"
              className={['rh-segment__btn', examVisibility === 'private' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => setExamVisibility('private')}
            >
              <span className="rh-segment__label">خاصة</span>
            </button>
            <button
              type="button"
              className={['rh-segment__btn', examVisibility === 'public' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => setExamVisibility('public')}
            >
              <span className="rh-segment__label">عامة (استكشاف + انضمام بالمعرف)</span>
            </button>
          </div>
          <div className="rh-plans__editor-actions">
            <Button type="button" variant="primary" loading={saveBusy} onClick={handleSave}>
              حفظ
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={saveBusy}
              onClick={() => {
                setEditorOpen(false)
                setEditingId(null)
                setVolumeRows([])
              }}
            >
              إلغاء
            </Button>
          </div>
        </ScrollArea>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        title={deleting ? 'تأكيد' : ''}
        onClose={() => {
          if (!deleteBusy) setDeleting(null)
        }}
        closeOnBackdrop={!deleteBusy}
        closeOnEsc={!deleteBusy}
        showClose={!deleteBusy}
      >
        <p>
          {deleting &&
          leavingUserDeletesWholeGroup(viewUserId, deleting.ownerUid, deleting.examRole, HALAKA_MEMBER_ROLES)
            ? 'حذف المجموعة نهائياً لجميع الأعضاء؟'
            : 'مغادرة هذه المجموعة؟'}
        </p>
        <div className="rh-plans__editor-actions">
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
        title={membersModal ? `أعضاء: ${membersModal.name}` : ''}
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
          {membersModal
            ? (() => {
                const mVolLines = formatExamVolumeSpecsSummaryLines(membersModal.examVolumeSpecs)
                const mVolTotal = totalResolvedPagesFromExamVolumeSpecs(membersModal.examVolumeSpecs)
                if (mVolLines.length === 0) return null
                return (
                  <div className="rh-exam-members-volumes">
                    <p className="rh-plan-members-modal__heading">مجلدات الاختبار</p>
                    <ul className="rh-plans__saved-vols">
                      {mVolLines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                    {mVolTotal > 0 ? (
                      <p className="rh-plans__saved-meta">
                        المجموع التقريبي: <strong>{mVolTotal}</strong> صفحة
                      </p>
                    ) : null}
                  </div>
                )
              })()
            : null}
          {can(PH, 'exam_member_add') && (
            <section className="rh-plan-members-modal__section">
              <h3 className="rh-plan-members-modal__heading">إضافة عضو</h3>
              <p className="rh-plan-members-modal__hint">يُضاف الطلاب أو المعلمون كأعضاء في مجموعة الاختبار.</p>
              <SearchField
                label="بحث"
                value={memberPickerQuery}
                onChange={(e) => setMemberPickerQuery(e.target.value)}
              />
              <ScrollArea className="rh-plan-members-picker" padded maxHeight="min(14rem, 36vh)">
                {mergedDirectoryUsers.length === 0 ? (
                  <p className="rh-plan-members-picker__empty">جاري تحميل المستخدمين…</p>
                ) : filteredPickerUsers.length === 0 ? (
                  <p className="rh-plan-members-picker__empty">لا نتائج مطابقة للبحث.</p>
                ) : (
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
                                await addUserToExam(user, membersModal.id, u.uid, user)
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
                            {added && <span className="rh-plan-members-pick__badge">مضاف</span>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </ScrollArea>
            </section>
          )}
          <section className="rh-plan-members-modal__section">
            <h3 className="rh-plan-members-modal__heading">الأعضاء</h3>
            {membersLoading ? (
              <p>جاري التحميل…</p>
            ) : (
              <ul className="rh-members-chat-list">
                {membersList.map((row) => {
                  const isOwner = row.role === HALAKA_MEMBER_ROLES.OWNER
                  const actorRole = normalizeRole(membersModal?.examRole)
                  return (
                    <li key={row.userId} className="rh-members-chat__item">
                      <div className="rh-members-chat__main">
                        <strong>{row.displayName || row.userId}</strong>
                        <span className="rh-plans__saved-badge">{roleLabel(row.role)}</span>
                      </div>
                      {!isOwner && (
                        <div className="rh-members-chat__actions">
                          {can(PH, 'exam_member_promote') && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant={row.role === HALAKA_MEMBER_ROLES.STUDENT ? 'secondary' : 'ghost'}
                                loading={
                                  memberRowBusy?.uid === row.userId &&
                                  memberRowBusy?.kind === `role:${HALAKA_MEMBER_ROLES.STUDENT}`
                                }
                                disabled={
                                  Boolean(memberRowBusy) ||
                                  row.role === HALAKA_MEMBER_ROLES.STUDENT ||
                                  !canAssignRole(actorRole, row.role, HALAKA_MEMBER_ROLES.STUDENT)
                                }
                                onClick={async () => {
                                  if (!user || !membersModal?.id) return
                                  setMemberRowBusy({ uid: row.userId, kind: `role:${HALAKA_MEMBER_ROLES.STUDENT}` })
                                  try {
                                    await setExamMemberRole(
                                      user,
                                      membersModal.id,
                                      row.userId,
                                      HALAKA_MEMBER_ROLES.STUDENT,
                                      user,
                                    )
                                    refreshMembers()
                                  } catch {
                                    toast.warning('تعذّر تغيير الدور.', '')
                                  } finally {
                                    setMemberRowBusy(null)
                                  }
                                }}
                              >
                                طالب
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={row.role === HALAKA_MEMBER_ROLES.TEACHER ? 'secondary' : 'ghost'}
                                loading={
                                  memberRowBusy?.uid === row.userId &&
                                  memberRowBusy?.kind === `role:${HALAKA_MEMBER_ROLES.TEACHER}`
                                }
                                disabled={
                                  Boolean(memberRowBusy) ||
                                  row.role === HALAKA_MEMBER_ROLES.TEACHER ||
                                  !canAssignRole(actorRole, row.role, HALAKA_MEMBER_ROLES.TEACHER)
                                }
                                onClick={async () => {
                                  if (!user || !membersModal?.id) return
                                  setMemberRowBusy({ uid: row.userId, kind: `role:${HALAKA_MEMBER_ROLES.TEACHER}` })
                                  try {
                                    await setExamMemberRole(
                                      user,
                                      membersModal.id,
                                      row.userId,
                                      HALAKA_MEMBER_ROLES.TEACHER,
                                      user,
                                    )
                                    refreshMembers()
                                  } catch {
                                    toast.warning('تعذّر تغيير الدور.', '')
                                  } finally {
                                    setMemberRowBusy(null)
                                  }
                                }}
                              >
                                معلم
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={row.role === HALAKA_MEMBER_ROLES.SUPERVISOR ? 'secondary' : 'ghost'}
                                loading={
                                  memberRowBusy?.uid === row.userId &&
                                  memberRowBusy?.kind === `role:${HALAKA_MEMBER_ROLES.SUPERVISOR}`
                                }
                                disabled={
                                  Boolean(memberRowBusy) ||
                                  row.role === HALAKA_MEMBER_ROLES.SUPERVISOR ||
                                  !canAssignRole(actorRole, row.role, HALAKA_MEMBER_ROLES.SUPERVISOR)
                                }
                                onClick={async () => {
                                  if (!user || !membersModal?.id) return
                                  setMemberRowBusy({
                                    uid: row.userId,
                                    kind: `role:${HALAKA_MEMBER_ROLES.SUPERVISOR}`,
                                  })
                                  try {
                                    await setExamMemberRole(
                                      user,
                                      membersModal.id,
                                      row.userId,
                                      HALAKA_MEMBER_ROLES.SUPERVISOR,
                                      user,
                                    )
                                    refreshMembers()
                                  } catch {
                                    toast.warning('تعذّر تغيير الدور.', '')
                                  } finally {
                                    setMemberRowBusy(null)
                                  }
                                }}
                              >
                                مشرف
                              </Button>
                            </>
                          )}
                          {can(PH, 'exam_member_remove') && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              loading={memberRowBusy?.uid === row.userId && memberRowBusy?.kind === 'remove'}
                              disabled={
                                Boolean(memberRowBusy) || !canManageRole(actorRole, normalizeRole(row.role))
                              }
                              onClick={async () => {
                                if (!user || !membersModal?.id) return
                                setMemberRowBusy({ uid: row.userId, kind: 'remove' })
                                try {
                                  await removeExamMember(user, membersModal.id, row.userId)
                                  refreshMembers()
                                } catch {
                                  toast.warning('تعذّر الإزالة.', '')
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
