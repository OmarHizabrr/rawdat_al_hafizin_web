import { Compass, Pencil, Plus, Printer, Trash2, UserPlus, Users } from 'lucide-react'
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
  addUserToActivity,
  joinPublicActivity,
  loadActivities,
  loadActivityMembersWithProfiles,
  removeActivityForUser,
  removeActivityMember,
  saveActivities,
  setActivityMemberRole,
  subscribeActivities,
} from '../utils/activitiesStorage.js'
import { leavingUserDeletesWholeGroup } from '../utils/groupMembership.js'
import { mergeUserDirectoryRows } from '../utils/userDirectoryMerge.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import {
  ACTIVITY_AUDIENCE_OPTIONS,
  ACTIVITY_KIND_OPTIONS,
  activityAudienceLabel,
  activityFormatLabel,
  activityKindLabel,
  formatActivityDateTimeAr,
} from '../utils/activityLabels.js'
import {
  Button,
  Modal,
  ScrollArea,
  SearchField,
  SearchableSelect,
  TextAreaField,
  TextField,
  useToast,
} from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function newId() {
  return firestoreApi.getNewId('activities')
}

const PA = PERMISSION_PAGE_IDS.activities

function isoToDatetimeLocal(iso) {
  if (!iso) return ''
  const d = new Date(String(iso))
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function datetimeLocalToIso(local) {
  const s = String(local || '').trim()
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

function activityCanEdit(row) {
  return row?.activityRole !== HALAKA_MEMBER_ROLES.STUDENT
}

function activityCanManageMembers(row) {
  const r = row?.activityRole
  return r === HALAKA_MEMBER_ROLES.OWNER || r === HALAKA_MEMBER_ROLES.SUPERVISOR
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

export default function ActivitiesPage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
  const { str, branding } = useSiteContent()
  const roleLabel = useCallback(
    (role) => {
      if (role === HALAKA_MEMBER_ROLES.OWNER) return str('activities.role_owner')
      if (role === HALAKA_MEMBER_ROLES.SUPERVISOR) return str('activities.role_supervisor')
      if (role === HALAKA_MEMBER_ROLES.TEACHER) return str('activities.role_teacher')
      return str('activities.role_student')
    },
    [str],
  )
  const toast = useToast()
  const onPrint = useCallback(() => {
    if (typeof window !== 'undefined') window.print()
  }, [])
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
  const exploreHref = appLink('/app/activities/explore')

  const [saved, setSaved] = useState([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [activityVisibility, setActivityVisibility] = useState('private')
  const [activityKind, setActivityKind] = useState('lecture')
  const [activityFormat, setActivityFormat] = useState('onsite')
  const [startAtLocal, setStartAtLocal] = useState('')
  const [endAtLocal, setEndAtLocal] = useState('')
  const [location, setLocation] = useState('')
  const [registrationDeadlineLocal, setRegistrationDeadlineLocal] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [targetAudience, setTargetAudience] = useState('students')
  const [feeInfo, setFeeInfo] = useState('')
  const [requirements, setRequirements] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
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
      ? str('activities.doc_title_readonly')
      : actingAsUser
        ? str('activities.doc_title_impersonate')
        : str('activities.doc_title')
  }, [readOnly, actingAsUser, str])

  useEffect(() => {
    if (!viewUserId) return undefined
    let mounted = true
    loadActivities(viewUserId).then((rows) => {
      if (mounted) setSaved(rows)
    })
    const unsub = subscribeActivities(viewUserId, (rows) => {
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
    loadActivityMembersWithProfiles(membersModal.id)
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
    loadActivityMembersWithProfiles(membersModal.id)
      .then(setMembersList)
      .finally(() => setMembersLoading(false))
  }

  const resetEditorForm = () => {
    setName('')
    setDescription('')
    setActivityVisibility('private')
    setActivityKind('lecture')
    setActivityFormat('onsite')
    setStartAtLocal('')
    setEndAtLocal('')
    setLocation('')
    setRegistrationDeadlineLocal('')
    setMaxParticipants('')
    setTargetAudience('students')
    setFeeInfo('')
    setRequirements('')
    setContactName('')
    setContactPhone('')
  }

  const openAdd = () => {
    setEditingId(null)
    resetEditorForm()
    setEditorOpen(true)
  }

  const openEdit = (row) => {
    if (!activityCanEdit(row)) return
    setEditingId(row.id)
    setName(row.name || '')
    setDescription(row.description || '')
    setActivityVisibility(row.activityVisibility === 'public' ? 'public' : 'private')
    setActivityKind(row.activityKind || 'lecture')
    setActivityFormat(['online', 'onsite', 'hybrid'].includes(row.activityFormat) ? row.activityFormat : 'onsite')
    setStartAtLocal(isoToDatetimeLocal(row.startAt))
    setEndAtLocal(isoToDatetimeLocal(row.endAt))
    setLocation(row.location || '')
    setRegistrationDeadlineLocal(isoToDatetimeLocal(row.registrationDeadline))
    setMaxParticipants(
      row.maxParticipants != null && Number.isFinite(Number(row.maxParticipants))
        ? String(row.maxParticipants)
        : '',
    )
    setTargetAudience(row.targetAudience || 'students')
    setFeeInfo(row.feeInfo || '')
    setRequirements(row.requirements || '')
    setContactName(row.contactName || '')
    setContactPhone(row.contactPhone || '')
    setEditorOpen(true)
  }

  const handleSave = async () => {
    if (!viewUserId) return
    const nowIso = new Date().toISOString()
    const mp = maxParticipants.trim()
    const maxP =
      mp === '' || Number.isNaN(Number(mp)) ? null : Math.max(0, Math.floor(Number(mp)))
    const row = {
      id: editingId || newId(),
      createdAt: editingId ? saved.find((x) => x.id === editingId)?.createdAt ?? nowIso : nowIso,
      updatedAt: nowIso,
      name:
        name.trim() ||
        str('activities.default_name', { date: new Date().toLocaleDateString('ar-SA') }),
      description: description.trim(),
      activityVisibility,
      activityKind,
      activityFormat,
      startAt: datetimeLocalToIso(startAtLocal),
      endAt: datetimeLocalToIso(endAtLocal),
      location: location.trim(),
      registrationDeadline: datetimeLocalToIso(registrationDeadlineLocal),
      maxParticipants: maxP,
      targetAudience,
      feeInfo: feeInfo.trim(),
      requirements: requirements.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
    }
    const next = editingId ? saved.map((x) => (x.id === editingId ? { ...x, ...row } : x)) : [row, ...saved]
    setSaveBusy(true)
    try {
      await saveActivities(viewUserId, next, user ?? {})
      toast.success(
        editingId ? str('activities.toast_save_updated') : str('activities.toast_save_created'),
        str('activities.toast_ok_title'),
      )
      setEditorOpen(false)
      setEditingId(null)
    } catch {
      toast.warning(str('activities.toast_save_fail'), str('activities.toast_alert_title'))
    } finally {
      setSaveBusy(false)
    }
  }

  const doDelete = async () => {
    if (!deleting?.id) return
    setDeleteBusy(true)
    let outcome = 'noop'
    try {
      outcome = await removeActivityForUser(viewUserId, deleting.id)
    } catch {
      toast.warning(str('activities.toast_exec_fail'), str('activities.toast_alert_title'))
      setDeleting(null)
      return
    } finally {
      setDeleteBusy(false)
    }
    if (outcome === 'noop') {
      toast.warning(str('activities.toast_op_fail'), str('activities.toast_alert_title'))
      setDeleting(null)
      return
    }
    toast.info(
      outcome === 'deletedFully' ? str('activities.toast_deleted_group') : str('activities.toast_left_group'),
      '',
    )
    setDeleting(null)
  }

  const handleJoin = async () => {
    const id = joinId.trim()
    if (!id || !viewUserId || !user) return
    setJoinBusy(true)
    try {
      await joinPublicActivity(viewUserId, id, user)
      setJoinId('')
      toast.success(str('activities.toast_join_success'), str('activities.toast_ok_title'))
    } catch (e) {
      const m = e?.message
      if (m === 'ACTIVITY_NOT_PUBLIC') toast.warning(str('activities.toast_join_not_public'), '')
      else if (m === 'ALREADY_MEMBER') toast.info(str('activities.toast_join_already'), '')
      else if (m === 'ACTIVITY_NOT_FOUND') toast.warning(str('activities.toast_join_not_found'), '')
      else toast.warning(str('activities.toast_join_fail'), '')
    } finally {
      setJoinBusy(false)
    }
  }

  const crossItems = useMemo(() => {
    const items = [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/plans'), label: str('layout.nav_plans') },
      { to: appLink('/app/halakat'), label: str('layout.nav_halakat') },
      { to: exploreHref, label: str('layout.nav_activities_explore') },
    ]
    if (canAccessPage('exams')) {
      items.push({ to: appLink('/app/exams'), label: str('layout.nav_exams') })
    }
    if (canAccessPage('exams_explore')) {
      items.push({ to: appLink('/app/exams/explore'), label: str('layout.nav_exams_explore') })
    }
    items.push({ to: appLink('/app/dawrat'), label: str('layout.nav_dawrat') })
    if (canAccessPage('leave_request')) {
      items.push({ to: appLink('/app/leave-request'), label: str('layout.nav_leave_request') })
    }
    items.push({ to: appLink('/app/settings'), label: str('layout.nav_settings') })
    return items
  }, [str, exploreHref, appLink, canAccessPage])

  return (
    <div className="rh-plans rh-activities-page">
      <div className="rh-print-only" aria-hidden="true">
        <p className="rh-print-only__title">
          {readOnly ? str('activities.hero_title_readonly') : str('activities.hero_title')}
        </p>
        <p className="rh-print-only__meta">
          {str('activities.print_stamp', {
            date: new Date().toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }),
            siteTitle: branding.siteTitle,
          })}
        </p>
      </div>
      <header className="rh-plans__hero no-print">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">
              {readOnly ? str('activities.hero_title_readonly') : str('activities.hero_title')}
            </h1>
            <p className="rh-plans__desc">
              {readOnly ? str('activities.hero_lead_readonly') : str('activities.hero_lead_normal')}
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <div className="rh-plans__hero-actions no-print">
            <Button type="button" variant="secondary" className="rh-plans__print-btn" onClick={onPrint}>
              <RhIcon as={Printer} size={18} strokeWidth={RH_ICON_STROKE} />
              {str('activities.print_btn')}
            </Button>
            {!readOnly && can(PA, 'activity_create') && (
              <Button type="button" variant="primary" className="rh-plans__add-btn" onClick={openAdd}>
                <RhIcon as={Plus} size={18} strokeWidth={RH_ICON_STROKE} />
                {str('activities.btn_new_group')}
              </Button>
            )}
          </div>
        </div>
      </header>

      {!readOnly && can(PA, 'activity_join_public') && (
        <section className="rh-settings-card rh-plans__join-card no-print">
          <div className="rh-settings-card__head">
            <h2 className="rh-settings-card__title">{str('activities.join_card_title')}</h2>
            <p className="rh-settings-card__subtitle">{str('activities.join_card_subtitle')}</p>
          </div>
          <div className="rh-plans__join-row">
            <TextField label={str('activities.field_group_id')} value={joinId} onChange={(e) => setJoinId(e.target.value)} />
            <Button
              type="button"
              variant="secondary"
              className="rh-plans__join-btn"
              loading={joinBusy}
              disabled={!joinId.trim() || !viewUserId}
              onClick={handleJoin}
            >
              {!joinBusy && <RhIcon as={UserPlus} size={18} strokeWidth={RH_ICON_STROKE} />}
              {str('activities.join_submit')}
            </Button>
          </div>
          <div className="rh-plans__join-explore">
            <Link className="ui-btn ui-btn--secondary rh-plans__explore-link" to={exploreHref}>
              <RhIcon as={Compass} size={18} strokeWidth={RH_ICON_STROKE} />
              {str('activities.link_explore_public')}
            </Link>
          </div>
        </section>
      )}

      {saved.length > 0 ? (
        <section className="rh-plans__saved">
          <h2 className="rh-plans__saved-title">{str('activities.section_yours')}</h2>
          <ul className="rh-plans__saved-list">
            {saved.map((row) => (
              <li key={row.id} className="rh-plans__saved-card">
                <div className="rh-plans__saved-head">
                  <div className="rh-plans__saved-head-main">
                    <strong>{row.name}</strong>
                    <span className="rh-plans__saved-badges">
                      <span className="rh-plans__saved-badge">
                        {row.activityVisibility === 'public' ? str('activities.badge_public') : str('activities.badge_private')}
                      </span>
                      <span className="rh-plans__saved-badge">{roleLabel(row.activityRole)}</span>
                      <span className="rh-plans__saved-badge">{activityKindLabel(row.activityKind)}</span>
                      <span className="rh-plans__saved-badge">
                        {activityFormatLabel(row.activityFormat, 'short')}
                      </span>
                    </span>
                  </div>
                </div>
                {row.description && <p className="rh-plans__saved-desc">{row.description}</p>}
                <ul className="rh-plans__saved-vols rh-plans__saved-vols--activity-details">
                  {row.startAt && (
                    <li>
                      {str('activities.card_line_start')}{' '}
                      <time dateTime={String(row.startAt)}>{formatActivityDateTimeAr(row.startAt)}</time>
                    </li>
                  )}
                  {row.endAt && (
                    <li>
                      {str('activities.card_line_end')}{' '}
                      <time dateTime={String(row.endAt)}>{formatActivityDateTimeAr(row.endAt)}</time>
                    </li>
                  )}
                  {row.location && (
                    <li>
                      {str('activities.card_line_location')} {row.location}
                    </li>
                  )}
                  <li>
                    {str('activities.card_line_audience')} {activityAudienceLabel(row.targetAudience)}
                  </li>
                  {row.registrationDeadline && (
                    <li>
                      {str('activities.card_line_registration')}{' '}
                      <time dateTime={String(row.registrationDeadline)}>
                        {formatActivityDateTimeAr(row.registrationDeadline)}
                      </time>
                    </li>
                  )}
                  {row.maxParticipants != null && row.maxParticipants > 0 && (
                    <li>
                      {str('activities.card_line_max_participants')} {row.maxParticipants}
                    </li>
                  )}
                  {row.feeInfo && (
                    <li>
                      {str('activities.card_line_fee')} {row.feeInfo}
                    </li>
                  )}
                  {row.requirements && (
                    <li>
                      {str('activities.card_line_requirements')} {row.requirements}
                    </li>
                  )}
                  {(row.contactName || row.contactPhone) && (
                    <li>
                      {str('activities.card_line_contact')}{' '}
                      {[row.contactName, row.contactPhone].filter(Boolean).join(' — ')}
                    </li>
                  )}
                </ul>
                <p className="rh-plans__saved-meta">
                  {str('activities.card_meta_id')} <code className="rh-plans__plan-id">{row.id}</code>
                </p>
                <div className="rh-plans__saved-actions no-print">
                  {activityCanManageMembers(row) && can(PA, 'activity_card_members') && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => setMembersModal(row)}>
                      <RhIcon as={Users} size={16} strokeWidth={RH_ICON_STROKE} />
                      {str('activities.card_btn_members')}
                    </Button>
                  )}
                  {activityCanEdit(row) && can(PA, 'activity_card_edit') && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)}>
                      <RhIcon as={Pencil} size={16} strokeWidth={RH_ICON_STROKE} />
                      {str('activities.card_btn_edit')}
                    </Button>
                  )}
                  {can(PA, 'activity_card_delete_leave') && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(row)}>
                      <RhIcon as={Trash2} size={16} strokeWidth={RH_ICON_STROKE} />
                      {leavingUserDeletesWholeGroup(viewUserId, row.ownerUid, row.activityRole, HALAKA_MEMBER_ROLES)
                        ? str('activities.card_btn_delete')
                        : str('activities.card_btn_leave')}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="rh-plans__empty">{str('activities.empty_list')}</p>
      )}

      <Modal
        open={editorOpen}
        title={editingId ? str('activities.modal_title_edit') : str('activities.modal_title_new')}
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
          <TextField label={str('activities.form_name_label')} value={name} onChange={(e) => setName(e.target.value)} required />
          <TextAreaField
            label={str('activities.form_description_label')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <SearchableSelect
            label={str('activities.form_kind_label')}
            options={ACTIVITY_KIND_OPTIONS}
            value={activityKind}
            onChange={setActivityKind}
            placeholder={str('activities.form_kind_placeholder')}
            searchPlaceholder={str('activities.ui_select_search_ph')}
            emptyText={str('activities.ui_select_empty')}
          />
          <div className="ui-field">
            <span className="ui-field__label">{str('activities.form_format_section_label')}</span>
            <div className="rh-segment rh-segment--plans rh-plans__segment-tight">
              {['onsite', 'online', 'hybrid'].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={['rh-segment__btn', activityFormat === v ? 'rh-segment__btn--active' : ''].join(' ')}
                  onClick={() => setActivityFormat(v)}
                >
                  <span className="rh-segment__label">{activityFormatLabel(v, 'long')}</span>
                </button>
              ))}
            </div>
          </div>
          <SearchableSelect
            label={str('activities.form_audience_label')}
            options={ACTIVITY_AUDIENCE_OPTIONS}
            value={targetAudience}
            onChange={setTargetAudience}
            placeholder={str('activities.form_audience_placeholder')}
            searchPlaceholder={str('activities.ui_select_search_ph')}
            emptyText={str('activities.ui_select_empty')}
          />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="act-start">
              {str('activities.form_start_label')}
            </label>
            <input
              id="act-start"
              type="datetime-local"
              className="ui-input"
              value={startAtLocal}
              onChange={(e) => setStartAtLocal(e.target.value)}
            />
          </div>
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="act-end">
              {str('activities.form_end_label')}
            </label>
            <input
              id="act-end"
              type="datetime-local"
              className="ui-input"
              value={endAtLocal}
              onChange={(e) => setEndAtLocal(e.target.value)}
            />
          </div>
          <TextField
            label={str('activities.form_location_label')}
            placeholder={str('activities.form_location_placeholder')}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="act-reg">
              {str('activities.form_registration_label')}
            </label>
            <input
              id="act-reg"
              type="datetime-local"
              className="ui-input"
              value={registrationDeadlineLocal}
              onChange={(e) => setRegistrationDeadlineLocal(e.target.value)}
            />
          </div>
          <TextField
            label={str('activities.form_max_participants_label')}
            type="number"
            min={0}
            inputMode="numeric"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            hint={str('activities.form_max_participants_hint')}
          />
          <TextField label={str('activities.form_fee_label')} value={feeInfo} onChange={(e) => setFeeInfo(e.target.value)} />
          <TextAreaField
            label={str('activities.form_requirements_label')}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={3}
          />
          <TextField
            label={str('activities.form_coordinator_label')}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <TextField
            label={str('activities.form_phone_label')}
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            inputMode="tel"
          />
          <p className="rh-plans__field-label">{str('activities.field_visibility')}</p>
          <div className="rh-segment rh-segment--plans">
            <button
              type="button"
              className={['rh-segment__btn', activityVisibility === 'private' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => setActivityVisibility('private')}
            >
              <span className="rh-segment__label">{str('activities.visibility_private_btn')}</span>
            </button>
            <button
              type="button"
              className={['rh-segment__btn', activityVisibility === 'public' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => setActivityVisibility('public')}
            >
              <span className="rh-segment__label">{str('activities.visibility_public_btn')}</span>
            </button>
          </div>
          <div className="rh-plans__editor-actions">
            <Button type="button" variant="primary" loading={saveBusy} onClick={handleSave}>
              {str('activities.modal_save')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={saveBusy}
              onClick={() => {
                setEditorOpen(false)
                setEditingId(null)
              }}
            >
              {str('activities.modal_cancel')}
            </Button>
          </div>
        </ScrollArea>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        title={deleting ? str('activities.delete_confirm_title') : ''}
        onClose={() => {
          if (!deleteBusy) setDeleting(null)
        }}
        closeOnBackdrop={!deleteBusy}
        closeOnEsc={!deleteBusy}
        showClose={!deleteBusy}
      >
        <p>
          {deleting &&
          leavingUserDeletesWholeGroup(viewUserId, deleting.ownerUid, deleting.activityRole, HALAKA_MEMBER_ROLES)
            ? str('activities.delete_confirm_owner')
            : str('activities.delete_confirm_leave')}
        </p>
        <div className="rh-plans__editor-actions">
          <Button type="button" variant="danger" loading={deleteBusy} onClick={doDelete}>
            {str('activities.delete_confirm_submit')}
          </Button>
          <Button type="button" variant="ghost" disabled={deleteBusy} onClick={() => setDeleting(null)}>
            {str('activities.modal_cancel')}
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(membersModal)}
        title={membersModal ? str('activities.members_modal_title', { name: membersModal.name || '' }) : ''}
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
            {str('activities.card_meta_id')} <code className="rh-plans__plan-id">{membersModal?.id}</code>
          </p>
          {membersModal && (
            <div className="rh-exam-members-volumes">
              <p className="rh-plan-members-modal__heading">{str('activities.members_summary_heading')}</p>
              <ul className="rh-plans__saved-vols">
                <li>
                  {activityKindLabel(membersModal.activityKind)} ·{' '}
                  {activityFormatLabel(membersModal.activityFormat, 'short')}
                </li>
                {membersModal.startAt && (
                  <li>
                    {str('activities.card_line_start')} {formatActivityDateTimeAr(membersModal.startAt)}
                  </li>
                )}
                {membersModal.location && (
                  <li>
                    {str('activities.explore.meta_location')} {membersModal.location}
                  </li>
                )}
              </ul>
            </div>
          )}
          {can(PA, 'activity_member_add') && (
            <section className="rh-plan-members-modal__section">
              <h3 className="rh-plan-members-modal__heading">{str('activities.members_add_heading')}</h3>
              <p className="rh-plan-members-modal__hint">{str('activities.members_add_hint')}</p>
              <SearchField
                label={str('activities.members_search_label')}
                value={memberPickerQuery}
                onChange={(e) => setMemberPickerQuery(e.target.value)}
              />
              <ScrollArea className="rh-plan-members-picker" padded maxHeight="min(14rem, 36vh)">
                {mergedDirectoryUsers.length === 0 ? (
                  <p className="rh-plan-members-picker__empty">{str('activities.members_picker_loading')}</p>
                ) : filteredPickerUsers.length === 0 ? (
                  <p className="rh-plan-members-picker__empty">{str('activities.members_picker_empty')}</p>
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
                                await addUserToActivity(user, membersModal.id, u.uid, user)
                                toast.success(str('activities.toast_member_add_ok'), str('activities.toast_ok_title'))
                                refreshMembers()
                              } catch (e) {
                                if (e?.message === 'ALREADY_MEMBER')
                                  toast.info(str('activities.toast_member_already_short'), '')
                                else toast.warning(str('activities.toast_member_add_fail'), '')
                              } finally {
                                setAddingMemberUid('')
                              }
                            }}
                          >
                            <span className="rh-plan-members-pick__name">{u.displayName || u.uid}</span>
                            {added && <span className="rh-plan-members-pick__badge">{str('activities.members_badge_added')}</span>}
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
            <h3 className="rh-plan-members-modal__heading">{str('activities.members_list_heading')}</h3>
            {membersLoading ? (
              <p>{str('activities.members_loading')}</p>
            ) : (
              <ul className="rh-members-chat-list">
                {membersList.map((row) => {
                  const isOwner = row.role === HALAKA_MEMBER_ROLES.OWNER
                  const actorRole = normalizeRole(membersModal?.activityRole)
                  return (
                    <li key={row.userId} className="rh-members-chat__item">
                      <div className="rh-members-chat__main">
                        <strong>{row.displayName || row.userId}</strong>
                        <span className="rh-plans__saved-badge">{roleLabel(row.role)}</span>
                      </div>
                      {!isOwner && (
                        <div className="rh-members-chat__actions">
                          {can(PA, 'activity_member_promote') && (
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
                                    await setActivityMemberRole(
                                      user,
                                      membersModal.id,
                                      row.userId,
                                      HALAKA_MEMBER_ROLES.STUDENT,
                                      user,
                                    )
                                    refreshMembers()
                                  } catch {
                                    toast.warning(str('activities.toast_role_change_fail'), '')
                                  } finally {
                                    setMemberRowBusy(null)
                                  }
                                }}
                              >
                                {str('activities.role_btn_student')}
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
                                    await setActivityMemberRole(
                                      user,
                                      membersModal.id,
                                      row.userId,
                                      HALAKA_MEMBER_ROLES.TEACHER,
                                      user,
                                    )
                                    refreshMembers()
                                  } catch {
                                    toast.warning(str('activities.toast_role_change_fail'), '')
                                  } finally {
                                    setMemberRowBusy(null)
                                  }
                                }}
                              >
                                {str('activities.role_btn_teacher')}
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
                                    await setActivityMemberRole(
                                      user,
                                      membersModal.id,
                                      row.userId,
                                      HALAKA_MEMBER_ROLES.SUPERVISOR,
                                      user,
                                    )
                                    refreshMembers()
                                  } catch {
                                    toast.warning(str('activities.toast_role_change_fail'), '')
                                  } finally {
                                    setMemberRowBusy(null)
                                  }
                                }}
                              >
                                {str('activities.role_btn_supervisor')}
                              </Button>
                            </>
                          )}
                          {can(PA, 'activity_member_remove') && (
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
                                  await removeActivityMember(user, membersModal.id, row.userId)
                                  refreshMembers()
                                } catch {
                                  toast.warning(str('activities.toast_member_remove_fail'), '')
                                } finally {
                                  setMemberRowBusy(null)
                                }
                              }}
                            >
                              {str('activities.members_remove_btn')}
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
