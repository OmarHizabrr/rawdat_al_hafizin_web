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
  HALAKA_MEMBER_ROLES,
  addUserToHalaka,
  joinPublicHalaka,
  loadHalakat,
  loadHalakatMembersWithProfiles,
  removeHalakaForUser,
  removeHalakaMember,
  saveHalakat,
  setHalakaMemberRole,
  subscribeHalakat,
} from '../utils/halakatStorage.js'
import { combineHijriYmdAndHHmm } from '../utils/hijriDates.js'
import {
  defaultHalakaSessionDates,
  halakaSessionDisplay,
  halakaSessionDurationAr,
} from '../utils/datePeriodAr.js'
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
  RhDateTimePickerField,
  useToast,
} from '../ui/index.js'
import { formatYmd } from '../ui/rhPickerUtils.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const WEEKDAYS = [
  { d: 0, label: 'الأحد' },
  { d: 1, label: 'الإثنين' },
  { d: 2, label: 'الثلاثاء' },
  { d: 3, label: 'الأربعاء' },
  { d: 4, label: 'الخميس' },
  { d: 5, label: 'الجمعة' },
  { d: 6, label: 'السبت' },
]

function newId() {
  return firestoreApi.getNewId('halakat')
}

function halakaCanEdit(h) {
  return h?.halakaRole !== HALAKA_MEMBER_ROLES.MEMBER
}

function halakaCanManageMembers(h) {
  const r = h?.halakaRole
  return r === HALAKA_MEMBER_ROLES.OWNER || r === HALAKA_MEMBER_ROLES.ADMIN
}

function roleLabel(role) {
  if (role === HALAKA_MEMBER_ROLES.OWNER) return 'مالك'
  if (role === HALAKA_MEMBER_ROLES.ADMIN) return 'مشرف'
  return 'عضو'
}

function weekdayArrLabel(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0 || arr.length >= 7) return 'كل الأيام'
  return [...arr]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAYS.find((w) => w.d === d)?.label || d)
    .join('، ')
}

function localHHmm(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return '18:00'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function legacyTimesToSessionDates(startTime, endTime) {
  const { sessionStart: defS, sessionEnd: defE } = defaultHalakaSessionDates()
  const parse = (raw, fallback) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(raw || '').trim())
    const d = new Date(defS)
    if (!m) return new Date(fallback)
    d.setHours(Number(m[1]), Number(m[2]), 0, 0)
    return d
  }
  return {
    sessionStart: parse(startTime, defS),
    sessionEnd: parse(endTime, defE),
  }
}

const PH = PERMISSION_PAGE_IDS.halakat

const SESSION_PERIOD = { CUSTOM: 'custom', MORNING: 'morning', EVENING: 'evening' }

export default function HalakatPage() {
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

  const exploreHref = appLink('/app/halakat/explore')

  const [saved, setSaved] = useState([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [halakaVisibility, setHalakaVisibility] = useState('private')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [genderType, setGenderType] = useState('men')
  const [sessionStart, setSessionStart] = useState(() => new Date(defaultHalakaSessionDates().sessionStart))
  const [sessionEnd, setSessionEnd] = useState(() => new Date(defaultHalakaSessionDates().sessionEnd))
  const [sessionPeriod, setSessionPeriod] = useState(SESSION_PERIOD.EVENING)
  const [tasmeeDays, setTasmeeDays] = useState(() => new Set())
  const [reviewDays, setReviewDays] = useState(() => new Set())
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
      ? `حلقات المستخدم — ${branding.siteTitle}`
      : actingAsUser
        ? `الحلقات (نيابة) — ${branding.siteTitle}`
        : `الحلقات — ${branding.siteTitle}`
  }, [readOnly, actingAsUser, branding.siteTitle])

  useEffect(() => {
    if (!viewUserId) return undefined
    let mounted = true
    loadHalakat(viewUserId).then((rows) => {
      if (mounted) setSaved(rows)
    })
    const unsub = subscribeHalakat(viewUserId, (rows) => {
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
    loadHalakatMembersWithProfiles(membersModal.id)
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

  const durationLabel = useMemo(
    () => (sessionStart && sessionEnd ? halakaSessionDurationAr(sessionStart, sessionEnd) : '—'),
    [sessionStart, sessionEnd],
  )

  const applySessionPeriod = useCallback((period) => {
    const ymd = formatYmd(sessionStart)
    if (!ymd) return
    if (period === SESSION_PERIOD.MORNING) {
      setSessionStart(combineHijriYmdAndHHmm(ymd, '08:00'))
      setSessionEnd(combineHijriYmdAndHHmm(ymd, '12:00'))
    } else if (period === SESSION_PERIOD.EVENING) {
      setSessionStart(combineHijriYmdAndHHmm(ymd, '18:00'))
      setSessionEnd(combineHijriYmdAndHHmm(ymd, '20:00'))
    }
    setSessionPeriod(period)
  }, [sessionStart])

  const onSessionStartChange = useCallback((d) => {
    if (!d) return
    setSessionStart(d)
    setSessionPeriod(SESSION_PERIOD.CUSTOM)
  }, [])

  const onSessionEndChange = useCallback((d) => {
    if (!d) return
    setSessionEnd(d)
    setSessionPeriod(SESSION_PERIOD.CUSTOM)
  }, [])

  const toWeekdayArr = (set) => {
    if (set.size === 0 || set.size >= 7) return null
    return [...set].sort((a, b) => a - b)
  }

  const openAdd = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setLocation('')
    setHalakaVisibility('private')
    setGenderType('men')
    const { sessionStart: s, sessionEnd: e } = defaultHalakaSessionDates()
    setSessionStart(s)
    setSessionEnd(e)
    setSessionPeriod(SESSION_PERIOD.EVENING)
    setTasmeeDays(new Set())
    setReviewDays(new Set())
    setEditorOpen(true)
  }

  const openEdit = (h) => {
    if (!halakaCanEdit(h)) return
    setEditingId(h.id)
    setName(h.name || '')
    setDescription(h.description || '')
    setLocation(h.location || '')
    setHalakaVisibility(h.halakaVisibility === 'public' ? 'public' : 'private')
    setGenderType(h.genderType === 'women' ? 'women' : 'men')
    if (h.sessionStartAt && h.sessionEndAt) {
      const a = new Date(h.sessionStartAt)
      const b = new Date(h.sessionEndAt)
      if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) {
        setSessionStart(a)
        setSessionEnd(b)
      } else {
        const leg = legacyTimesToSessionDates(h.startTime, h.endTime)
        setSessionStart(leg.sessionStart)
        setSessionEnd(leg.sessionEnd)
      }
    } else {
      const leg = legacyTimesToSessionDates(h.startTime, h.endTime)
      setSessionStart(leg.sessionStart)
      setSessionEnd(leg.sessionEnd)
    }
    const t = h.tasmeeWeekdays
    setTasmeeDays(
      t && Array.isArray(t) && t.length > 0 && t.length < 7 ? new Set(t) : new Set(),
    )
    const r = h.reviewWeekdays
    setReviewDays(
      r && Array.isArray(r) && r.length > 0 && r.length < 7 ? new Set(r) : new Set(),
    )
    const per = h.sessionDayPeriod
    setSessionPeriod(
      per === SESSION_PERIOD.MORNING || per === SESSION_PERIOD.EVENING || per === SESSION_PERIOD.CUSTOM
        ? per
        : SESSION_PERIOD.CUSTOM,
    )
    setEditorOpen(true)
  }

  const toggleDay = (setFn, d) => {
    setFn((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  const handleSave = async () => {
    if (!viewUserId) return
    if (!sessionStart || !sessionEnd || sessionEnd.getTime() <= sessionStart.getTime()) {
      toast.warning('تاريخ ووقت نهاية الحلقة يجب أن يكونا بعد البداية.', '')
      return
    }
    const tasmeeWeekdays = toWeekdayArr(tasmeeDays)
    const reviewWeekdays = toWeekdayArr(reviewDays)
    const nowIso = new Date().toISOString()
    const halaka = {
      id: editingId || newId(),
      createdAt: editingId ? saved.find((x) => x.id === editingId)?.createdAt ?? nowIso : nowIso,
      updatedAt: nowIso,
      halakaVisibility,
      name: name.trim() || `حلقة ${new Date().toLocaleDateString('ar-SA')}`,
      description: description.trim(),
      location: location.trim(),
      genderType,
      sessionStartAt: sessionStart.toISOString(),
      sessionEndAt: sessionEnd.toISOString(),
      startTime: localHHmm(sessionStart),
      endTime: localHHmm(sessionEnd),
      tasmeeWeekdays,
      reviewWeekdays,
      tasmeeWeekdayLabels: weekdayArrLabel(tasmeeWeekdays),
      reviewWeekdayLabels: weekdayArrLabel(reviewWeekdays),
      sessionDayPeriod: sessionPeriod,
    }
    const next = editingId ? saved.map((x) => (x.id === editingId ? halaka : x)) : [halaka, ...saved]
    setSaveBusy(true)
    try {
      await saveHalakat(viewUserId, next, user ?? {})
      toast.success(editingId ? 'تم تحديث الحلقة.' : 'تم إنشاء الحلقة.', 'تم')
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
    let outcome = 'noop'
    try {
      outcome = await removeHalakaForUser(viewUserId, deleting.id)
    } catch {
      toast.warning('تعذّر التنفيذ.', 'تنبيه')
      setDeleting(null)
      return
    } finally {
      setDeleteBusy(false)
    }
    if (outcome === 'noop') {
      toast.warning('تعذّر إكمال العملية. تحقق من أنك ما زلت عضواً في الحلقة.', 'تنبيه')
      setDeleting(null)
      return
    }
    toast.info(outcome === 'deletedFully' ? 'حُذفت الحلقة للجميع.' : 'غادرت الحلقة.', '')
    setDeleting(null)
  }

  const handleJoin = async () => {
    const id = joinId.trim()
    if (!id || !viewUserId || !user) return
    setJoinBusy(true)
    try {
      await joinPublicHalaka(viewUserId, id, user)
      setJoinId('')
      toast.success('تم الانضمام.', 'تم')
    } catch (e) {
      const m = e?.message
      if (m === 'HALAKA_NOT_PUBLIC') toast.warning('الحلقة ليست عامة.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else if (m === 'HALAKA_NOT_FOUND') toast.warning('لم يُعثر على حلقة بهذا المعرف.', '')
      else toast.warning('تعذّر الانضمام.', '')
    } finally {
      setJoinBusy(false)
    }
  }

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
    loadHalakatMembersWithProfiles(membersModal.id)
      .then(setMembersList)
      .finally(() => setMembersLoading(false))
  }

  const crossItems = useMemo(() => {
    const items = [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/plans'), label: str('layout.nav_plans') },
      { to: exploreHref, label: str('layout.nav_halakat_explore') },
      { to: appLink('/app/dawrat'), label: str('layout.nav_dawrat') },
    ]
    if (canAccessPage('leave_request')) {
      items.push({ to: appLink('/app/leave-request'), label: str('layout.nav_leave_request') })
    }
    if (canAccessPage('certificates')) {
      items.push({ to: appLink('/app/certificates'), label: str('layout.nav_certificates') })
    }
    items.push({ to: appLink('/app/settings'), label: str('layout.nav_settings') })
    return items
  }, [str, exploreHref, appLink, canAccessPage])

  return (
    <div className="rh-plans">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">{readOnly ? 'حلقات المستخدم' : 'الحلقات'}</h1>
            <p className="rh-plans__desc">
              {readOnly
                ? 'عرض للقراءة فقط.'
                : 'حلقات التسميع والمراجعة: الاسم والوصف والمكان وأيام التسميع والمراجعة وأوقات الانعقاد ونوع الحلقة (رجال/نساء)، مع أعضاء بنفس نظام الخطط.'}
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          {!readOnly && can(PH, 'halaka_create') && (
            <div className="rh-plans__hero-actions">
              <Button type="button" variant="primary" className="rh-plans__add-btn" onClick={openAdd}>
                <RhIcon as={Plus} size={18} strokeWidth={RH_ICON_STROKE} />
                إضافة حلقة
              </Button>
            </div>
          )}
        </div>
      </header>

      {!readOnly && can(PH, 'halaka_join_public') && (
        <section className="rh-settings-card rh-plans__join-card">
          <div className="rh-settings-card__head">
            <h2 className="rh-settings-card__title">الانضمام لحلقة عامة</h2>
            <p className="rh-settings-card__subtitle">أدخل معرف الحلقة إن كانت معروضة كعامة.</p>
          </div>
          <div className="rh-plans__join-row">
            <TextField label="معرف الحلقة" value={joinId} onChange={(e) => setJoinId(e.target.value)} />
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
              استكشاف الحلقات العامة
            </Link>
          </div>
        </section>
      )}

      {saved.length > 0 ? (
        <section className="rh-plans__saved">
          <h2 className="rh-plans__saved-title">حلقاتك</h2>
          <ul className="rh-plans__saved-list">
            {saved.map((h) => (
              <li key={h.id} className="rh-plans__saved-card">
                <div className="rh-plans__saved-head">
                  <div className="rh-plans__saved-head-main">
                    <strong>{h.name}</strong>
                    <span className="rh-plans__saved-badges">
                      <span className="rh-plans__saved-badge">
                        {h.halakaVisibility === 'public' ? 'عامة' : 'خاصة'}
                      </span>
                      <span className="rh-plans__saved-badge">{roleLabel(h.halakaRole)}</span>
                      <span className="rh-plans__saved-badge">
                        {h.genderType === 'women' ? 'نساء' : 'رجال'}
                      </span>
                    </span>
                  </div>
                </div>
                <p className="rh-plans__saved-meta">
                  {h.location && (
                    <>
                      <strong>المكان:</strong> {h.location}
                      <br />
                    </>
                  )}
                  <strong>التسميع:</strong> {h.tasmeeWeekdayLabels || weekdayArrLabel(h.tasmeeWeekdays)}
                  <br />
                  <strong>المراجعة:</strong> {h.reviewWeekdayLabels || weekdayArrLabel(h.reviewWeekdays)}
                  <br />
                  <strong>موعد الحلقة:</strong>{' '}
                  {(() => {
                    const disp = halakaSessionDisplay(h)
                    if (!disp) return '—'
                    return (
                      <>
                        {disp.startLabel} — {disp.endLabel} ({disp.durationLabel})
                      </>
                    )
                  })()}
                </p>
                {h.description && <p className="rh-plans__saved-desc">{h.description}</p>}
                <p className="rh-plans__saved-meta">
                  المعرف: <code className="rh-plans__plan-id">{h.id}</code>
                </p>
                <div className="rh-plans__saved-actions">
                  {halakaCanManageMembers(h) && can(PH, 'halaka_card_members') && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => setMembersModal(h)}>
                      <RhIcon as={Users} size={16} strokeWidth={RH_ICON_STROKE} />
                      الأعضاء
                    </Button>
                  )}
                  {halakaCanEdit(h) && can(PH, 'halaka_card_edit') && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(h)}>
                      <RhIcon as={Pencil} size={16} strokeWidth={RH_ICON_STROKE} />
                      تعديل
                    </Button>
                  )}
                  {can(PH, 'halaka_card_delete_leave') && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(h)}>
                      <RhIcon as={Trash2} size={16} strokeWidth={RH_ICON_STROKE} />
                      {leavingUserDeletesWholeGroup(viewUserId, h.ownerUid, h.halakaRole, HALAKA_MEMBER_ROLES)
                        ? 'حذف'
                        : 'مغادرة'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="rh-plans__empty">لا توجد حلقات بعد. أضف حلقة أو انضم لحلقة عامة.</p>
      )}

      <Modal
        open={editorOpen}
        title={editingId ? 'تعديل الحلقة' : 'حلقة جديدة'}
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
          <TextField label="اسم الحلقة" value={name} onChange={(e) => setName(e.target.value)} />
          <TextAreaField label="الوصف" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <TextField label="المكان" value={location} onChange={(e) => setLocation(e.target.value)} />
          <p className="rh-plans__field-label">الظهور</p>
          <div className="rh-segment rh-segment--plans">
            <button
              type="button"
              className={['rh-segment__btn', halakaVisibility === 'private' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => setHalakaVisibility('private')}
            >
              <span className="rh-segment__label">خاصة</span>
            </button>
            <button
              type="button"
              className={['rh-segment__btn', halakaVisibility === 'public' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => setHalakaVisibility('public')}
            >
              <span className="rh-segment__label">عامة</span>
            </button>
          </div>
          <p className="rh-plans__field-label">نوع الحلقة</p>
          <div className="rh-segment rh-segment--plans">
            <button
              type="button"
              className={['rh-segment__btn', genderType === 'men' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => setGenderType('men')}
            >
              <span className="rh-segment__label">رجال</span>
            </button>
            <button
              type="button"
              className={['rh-segment__btn', genderType === 'women' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => setGenderType('women')}
            >
              <span className="rh-segment__label">نساء</span>
            </button>
          </div>
          <p className="rh-plans__field-label">أيام التسميع (فارغ = كل الأيام)</p>
          <div className="rh-plans__weekdays">
            {WEEKDAYS.map(({ d, label }) => (
              <button
                key={d}
                type="button"
                className={['rh-plans__weekday', tasmeeDays.has(d) ? 'rh-plans__weekday--on' : ''].join(' ')}
                onClick={() => toggleDay(setTasmeeDays, d)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="rh-plans__field-label">أيام المراجعة (فارغ = كل الأيام)</p>
          <div className="rh-plans__weekdays">
            {WEEKDAYS.map(({ d, label }) => (
              <button
                key={d}
                type="button"
                className={['rh-plans__weekday', reviewDays.has(d) ? 'rh-plans__weekday--on' : ''].join(' ')}
                onClick={() => toggleDay(setReviewDays, d)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="rh-plans__field-label">فترة الحلقة (الوقت)</p>
          <p className="ui-field__hint" style={{ marginTop: 0, marginBottom: '0.4rem' }}>
            صباحاً أو مساءً تضبط الأوقات على <strong>نفس يوم</strong> بداية الحلقة (هجرياً). «مخصص» لأي تاريخ ومدة. إن
            زادت المدة عن 12 ساعة تُعرض كـ «مدة مفتوحة» في البطاقة.
          </p>
          <div className="rh-segment rh-segment--plans" style={{ marginBottom: 'var(--rh-space-3)' }}>
            <button
              type="button"
              className={[
                'rh-segment__btn',
                sessionPeriod === SESSION_PERIOD.MORNING ? 'rh-segment__btn--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => applySessionPeriod(SESSION_PERIOD.MORNING)}
            >
              <span className="rh-segment__label">صباحاً</span>
            </button>
            <button
              type="button"
              className={[
                'rh-segment__btn',
                sessionPeriod === SESSION_PERIOD.EVENING ? 'rh-segment__btn--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => applySessionPeriod(SESSION_PERIOD.EVENING)}
            >
              <span className="rh-segment__label">مساءً</span>
            </button>
            <button
              type="button"
              className={['rh-segment__btn', sessionPeriod === SESSION_PERIOD.CUSTOM ? 'rh-segment__btn--active' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSessionPeriod(SESSION_PERIOD.CUSTOM)}
            >
              <span className="rh-segment__label">مخصص</span>
            </button>
          </div>
          <p className="rh-plans__field-label">بداية ونهاية الحلقة (تاريخ ووقت)</p>
          <div className="rh-plans__dates-grid">
            <RhDateTimePickerField
              label="البداية"
              selected={sessionStart}
              onChange={onSessionStartChange}
              maxDate={sessionEnd || undefined}
              timeIntervals={5}
            />
            <RhDateTimePickerField
              label="النهاية"
              selected={sessionEnd}
              onChange={onSessionEndChange}
              minDate={sessionStart || undefined}
              timeIntervals={5}
            />
          </div>
          <p className="ui-field__hint">المدة: {durationLabel}</p>
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
          {deleting &&
          leavingUserDeletesWholeGroup(
            viewUserId,
            deleting.ownerUid,
            deleting.halakaRole,
            HALAKA_MEMBER_ROLES,
          )
            ? 'حذف الحلقة نهائياً عن الجميع؟'
            : 'مغادرة الحلقة من قائمتك فقط؟'}
        </p>
        <div className="rh-plans__actions">
          <Button type="button" variant="danger" loading={deleteBusy} onClick={doDelete}>
            {deleting &&
            leavingUserDeletesWholeGroup(
              viewUserId,
              deleting.ownerUid,
              deleting.halakaRole,
              HALAKA_MEMBER_ROLES,
            )
              ? 'نعم، حذف للجميع'
              : 'نعم، مغادرة'}
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
          {can(PH, 'halaka_member_add') && (
            <section className="rh-plan-members-modal__section">
              <h3 className="rh-plan-members-modal__heading">إضافة عضو</h3>
              <p className="rh-plan-members-modal__hint">
                تظهر القائمة من مستخدمي المنصة مع دمج حسابك والأعضاء المعروضين أدناه (بمن فيهم مديرو النظام) حتى لا يُستبعد
                أحد.
              </p>
              <SearchField
                label="بحث"
                value={memberPickerQuery}
                onChange={(e) => setMemberPickerQuery(e.target.value)}
              />
              <ScrollArea className="rh-plan-members-picker" padded maxHeight="min(14rem, 36vh)">
                {mergedDirectoryUsers.length === 0 ? (
                  <p className="rh-plan-members-picker__empty">
                    جاري تحميل المستخدمين… إن بقيت فارغة فتحقق من صلاحيات قراءة مجموعة users في Firestore.
                  </p>
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
                              await addUserToHalaka(user, membersModal.id, u.uid, user)
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
                  return (
                    <li key={row.userId} className="rh-members-chat__item">
                      <div className="rh-members-chat__main">
                        <strong>{row.displayName || row.userId}</strong>
                        <span className="rh-plans__saved-badge">{roleLabel(row.role)}</span>
                      </div>
                      {!isOwner && (
                        <div className="rh-members-chat__actions">
                          {can(PH, 'halaka_member_promote') && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              loading={memberRowBusy?.uid === row.userId && memberRowBusy?.kind === 'admin'}
                              disabled={Boolean(memberRowBusy)}
                              onClick={async () => {
                                if (!user || !membersModal?.id) return
                                const next =
                                  row.role === HALAKA_MEMBER_ROLES.ADMIN
                                    ? HALAKA_MEMBER_ROLES.MEMBER
                                    : HALAKA_MEMBER_ROLES.ADMIN
                                setMemberRowBusy({ uid: row.userId, kind: 'admin' })
                                try {
                                  await setHalakaMemberRole(user, membersModal.id, row.userId, next, user)
                                  refreshMembers()
                                } catch {
                                  toast.warning('تعذّر تغيير الدور.', '')
                                } finally {
                                  setMemberRowBusy(null)
                                }
                              }}
                            >
                              {row.role === HALAKA_MEMBER_ROLES.ADMIN ? 'إلغاء مشرف' : 'مشرف'}
                            </Button>
                          )}
                          {can(PH, 'halaka_member_remove') && (
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
                                  await removeHalakaMember(user, membersModal.id, row.userId)
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
