import { ClipboardPaste, Compass, Pencil, Plus, Trash2, UserPlus, Users, Video } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { MeetingProviderLaunchRow } from '../components/MeetingProviderLaunchRow.jsx'
import { RemoteTasmeeProviderIcon } from '../components/RemoteTasmeeProviderIcon.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { subscribeAllUsers } from '../services/adminUsersService.js'
import { HALAKA_MEMBER_ROLES } from '../utils/halakatStorage.js'
import { leavingUserDeletesWholeGroup } from '../utils/groupMembership.js'
import { mergeUserDirectoryRows } from '../utils/userDirectoryMerge.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import {
  formatExamVolumeSpecsSummaryLines,
  totalResolvedPagesFromExamVolumeSpecs,
} from '../utils/examVolumeSpec.js'
import { loadExams } from '../utils/examsStorage.js'
import { remoteTasmeeProviderBrandSuffix } from '../utils/remoteTasmeeProviderIcons.js'
import {
  REMOTE_TASMEE_MEDIA,
  REMOTE_TASMEE_PROVIDER,
  addUserToRemoteTasmee,
  joinPublicRemoteTasmee,
  loadRemoteTasmeeBroadcasts,
  loadRemoteTasmeeMembersWithProfiles,
  normalizeMeetingUrl,
  normalizeRemoteTasmeeMedia,
  normalizeRemoteTasmeeProvider,
  remoteTasmeeMediaLabelAr,
  remoteTasmeeProviderLabelAr,
  removeRemoteTasmeeForUser,
  removeRemoteTasmeeMember,
  saveRemoteTasmeeBroadcast,
  setRemoteTasmeeMemberRole,
  subscribeRemoteTasmeeBroadcasts,
} from '../utils/remoteTasmeeStorage.js'
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
  return firestoreApi.getNewId('remote_tasmee')
}

const PH = PERMISSION_PAGE_IDS.remote_tasmee

function broadcastCanEdit(b) {
  return b?.broadcastRole !== HALAKA_MEMBER_ROLES.STUDENT
}

function broadcastCanManageMembers(b) {
  const r = b?.broadcastRole
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

const PROVIDER_OPTIONS = [
  { value: REMOTE_TASMEE_PROVIDER.GOOGLE_MEET, label: 'جوجل ميت' },
  { value: REMOTE_TASMEE_PROVIDER.ZOOM, label: 'زووم' },
  { value: REMOTE_TASMEE_PROVIDER.TEAMS, label: 'مايكروسوفت تيمز' },
  { value: REMOTE_TASMEE_PROVIDER.JITSI, label: 'جيتسي' },
  { value: REMOTE_TASMEE_PROVIDER.DISCORD, label: 'ديسكورد' },
  { value: REMOTE_TASMEE_PROVIDER.WEBEX, label: 'Webex' },
  { value: REMOTE_TASMEE_PROVIDER.OTHER, label: 'أخرى / رابط مباشر' },
]

export default function RemoteTasmeePage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
  const { branding, str } = useSiteContent()
  const toast = useToast()
  const { search } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
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
  const exploreHref = appLink('/app/remote-tasmee/explore')

  const [saved, setSaved] = useState([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mediaType, setMediaType] = useState(REMOTE_TASMEE_MEDIA.VIDEO)
  const [provider, setProvider] = useState(REMOTE_TASMEE_PROVIDER.GOOGLE_MEET)
  const [meetingUrl, setMeetingUrl] = useState('')
  const [meetingCode, setMeetingCode] = useState('')
  const [remoteVisibility, setRemoteVisibility] = useState('private')
  const [saveBusy, setSaveBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [joinId, setJoinId] = useState('')
  const [joinBusy, setJoinBusy] = useState(false)

  const [linkedExamId, setLinkedExamId] = useState('')
  const [linkedExamTitle, setLinkedExamTitle] = useState('')
  const processedFromExamRef = useRef('')

  const fromExamParam = searchParams.get('fromExam')?.trim() || ''

  const [membersModal, setMembersModal] = useState(null)
  const [membersList, setMembersList] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [directoryUsers, setDirectoryUsers] = useState([])
  const [memberPickerQuery, setMemberPickerQuery] = useState('')
  const [addingMemberUid, setAddingMemberUid] = useState('')
  const [memberRowBusy, setMemberRowBusy] = useState(null)

  useEffect(() => {
    document.title = readOnly
      ? `التسميع عن بعد (عرض) — ${branding.siteTitle}`
      : actingAsUser
        ? `التسميع عن بعد (نيابة) — ${branding.siteTitle}`
        : `التسميع عن بعد — ${branding.siteTitle}`
  }, [readOnly, actingAsUser, branding.siteTitle])

  useEffect(() => {
    if (!viewUserId) return undefined
    let mounted = true
    loadRemoteTasmeeBroadcasts(viewUserId).then((rows) => {
      if (mounted) setSaved(rows)
    })
    const unsub = subscribeRemoteTasmeeBroadcasts(viewUserId, (rows) => {
      if (mounted) setSaved(rows)
    })
    return () => {
      mounted = false
      unsub()
    }
  }, [viewUserId])

  useEffect(() => {
    if (!fromExamParam) processedFromExamRef.current = ''
  }, [fromExamParam])

  useEffect(() => {
    if (!fromExamParam || !viewUserId || readOnly) return undefined
    if (processedFromExamRef.current === fromExamParam) return undefined
    let cancelled = false
    loadExams(viewUserId).then((rows) => {
      if (cancelled) return
      const ex = rows.find((r) => r.id === fromExamParam)
      if (!ex) {
        toast.warning('لم نعثر على الاختبار أو لست عضواً فيه.', '')
        processedFromExamRef.current = fromExamParam
        setSearchParams(
          (prev) => {
            const n = new URLSearchParams(prev)
            n.delete('fromExam')
            return n
          },
          { replace: true },
        )
        return
      }
      setTitle(`تسميع — ${ex.name || 'اختبار'}`)
      const lines = formatExamVolumeSpecsSummaryLines(ex.examVolumeSpecs)
      const total = totalResolvedPagesFromExamVolumeSpecs(ex.examVolumeSpecs)
      const block =
        lines.length > 0
          ? ['— مجلدات الاختبار —', ...lines, total ? `المجموع التقريبي: ${total} صفحة` : '']
              .filter(Boolean)
              .join('\n')
          : ''
      const baseDesc = (ex.description || '').trim()
      setDescription(baseDesc ? (block ? `${baseDesc}\n\n${block}` : baseDesc) : block)
      setLinkedExamId(ex.id)
      setLinkedExamTitle(ex.name || '')
      setEditorOpen(true)
      processedFromExamRef.current = fromExamParam
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev)
          n.delete('fromExam')
          return n
        },
        { replace: true },
      )
    })
    return () => {
      cancelled = true
    }
  }, [fromExamParam, viewUserId, readOnly, setSearchParams, toast])

  useEffect(() => {
    if (!membersModal?.id || !user?.uid) return undefined
    let cancelled = false
    setMembersLoading(true)
    loadRemoteTasmeeMembersWithProfiles(membersModal.id)
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
    loadRemoteTasmeeMembersWithProfiles(membersModal.id)
      .then(setMembersList)
      .finally(() => setMembersLoading(false))
  }

  const openAdd = () => {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setMediaType(REMOTE_TASMEE_MEDIA.VIDEO)
    setProvider(REMOTE_TASMEE_PROVIDER.GOOGLE_MEET)
    setMeetingUrl('')
    setMeetingCode('')
    setRemoteVisibility('private')
    setLinkedExamId('')
    setLinkedExamTitle('')
    setEditorOpen(true)
  }

  const openEdit = (b) => {
    if (!broadcastCanEdit(b)) return
    setEditingId(b.id)
    setTitle(b.title || '')
    setDescription(b.description || '')
    setMediaType(normalizeRemoteTasmeeMedia(b.mediaType))
    setProvider(normalizeRemoteTasmeeProvider(b.provider))
    setMeetingUrl(b.meetingUrl || '')
    setMeetingCode(b.meetingCode || '')
    setRemoteVisibility(b.remoteTasmeeVisibility === 'public' ? 'public' : 'private')
    setLinkedExamId(b.linkedExamId || '')
    setLinkedExamTitle(b.linkedExamTitle || '')
    setEditorOpen(true)
  }

  const handleSave = async () => {
    if (!viewUserId) return
    const url = normalizeMeetingUrl(meetingUrl)
    if (!url) {
      toast.warning('أدخل رابط الاجتماع (مثل رابط جوجل ميت أو زووم).', '')
      return
    }
    const nowIso = new Date().toISOString()
    const row = {
      id: editingId || newId(),
      createdAt: editingId ? saved.find((x) => x.id === editingId)?.createdAt ?? nowIso : nowIso,
      updatedAt: nowIso,
      title: title.trim() || `بث عن بعد ${new Date().toLocaleDateString('ar-SA')}`,
      description: description.trim(),
      mediaType: normalizeRemoteTasmeeMedia(mediaType),
      provider: normalizeRemoteTasmeeProvider(provider),
      meetingUrl: url,
      meetingCode: meetingCode.trim(),
      remoteTasmeeVisibility: remoteVisibility,
      linkedExamId: linkedExamId.trim(),
      linkedExamTitle: linkedExamTitle.trim(),
    }
    const next = editingId ? saved.map((x) => (x.id === editingId ? { ...x, ...row } : x)) : [row, ...saved]
    setSaveBusy(true)
    try {
      await saveRemoteTasmeeBroadcast(viewUserId, next, user ?? {})
      toast.success(editingId ? 'تم تحديث البث.' : 'تم إنشاء البث.', 'تم')
      setEditorOpen(false)
      setEditingId(null)
    } catch (e) {
      if (e?.message === 'REMOTE_TASMEE_URL_REQUIRED') toast.warning('الرابط مطلوب.', '')
      else toast.warning('تعذّر الحفظ.', 'تنبيه')
    } finally {
      setSaveBusy(false)
    }
  }

  const doDelete = async () => {
    if (!deleting?.id) return
    setDeleteBusy(true)
    let outcome = 'noop'
    try {
      outcome = await removeRemoteTasmeeForUser(viewUserId, deleting.id)
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
    toast.info(outcome === 'deletedFully' ? 'حُذف البث للجميع.' : 'غادرت البث.', '')
    setDeleting(null)
  }

  const onMeetingProviderLaunched = useCallback(
    (mode) => {
      if (mode === 'filled') {
        toast.success('تم إنشاء رابط جيتسي وملء الحقل ونسخه إلى الحافظة.', 'تم')
      } else {
        toast.info(
          'تم فتح التطبيق في تبويب جديد. بعد ظهور رابط الاجتماع انسخه والصقه في حقل «رابط الاجتماع».',
          '',
        )
      }
    },
    [toast],
  )

  const pasteMeetingUrlFromClipboard = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      toast.warning('المتصفح لا يدعم قراءة الحافظة. استخدم لصق يدوي (Ctrl+V).', '')
      return
    }
    try {
      const raw = (await navigator.clipboard.readText()).trim()
      if (!raw) {
        toast.info('الحافظة فارغة.', '')
        return
      }
      setMeetingUrl(normalizeMeetingUrl(raw))
      toast.success('تم لصق الرابط في الحقل.', 'تم')
    } catch {
      toast.warning(
        'تعذّر قراءة الحافظة. امنح الموقع إذن اللصق من المتصفح، أو الصق الرابط يدوياً في الحقل.',
        '',
      )
    }
  }, [toast])

  const handleJoin = async () => {
    const id = joinId.trim()
    if (!id || !viewUserId || !user) return
    setJoinBusy(true)
    try {
      await joinPublicRemoteTasmee(viewUserId, id, user)
      setJoinId('')
      toast.success('تم الانضمام.', 'تم')
    } catch (e) {
      const m = e?.message
      if (m === 'REMOTE_TASMEE_NOT_PUBLIC') toast.warning('البث ليس عاماً.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else if (m === 'REMOTE_TASMEE_NOT_FOUND') toast.warning('لم يُعثر على بث بهذا المعرف.', '')
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
      { to: exploreHref, label: str('layout.nav_remote_tasmee_explore') },
      ...(canAccessPage('exams') ? [{ to: appLink('/app/exams'), label: str('layout.nav_exams') }] : []),
      ...(canAccessPage('exams_explore')
        ? [{ to: appLink('/app/exams/explore'), label: str('layout.nav_exams_explore') }]
        : []),
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
            <h1 className="rh-plans__title">{readOnly ? 'التسميع عن بعد (عرض)' : 'التسميع عن بعد'}</h1>
            <p className="rh-plans__desc">
              {readOnly
                ? 'عرض للقراءة فقط.'
                : 'أنشئ جلسة تسميع عن بعد (صوتية أو مرئية)، اربطها بتطبيق اجتماعات (جوجل ميت، زووم، تيمز…)، وأضف الأعضاء ليصلهم الرابط والتفاصيل بسهولة. من صفحة الاختبارات يمكنك «بث تسميع» لربط البث بمجموعة الاختبار ونسخ مجلداتها إلى الوصف.'}
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          {!readOnly && can(PH, 'remote_tasmee_create') && (
            <div className="rh-plans__hero-actions">
              <Button type="button" variant="primary" className="rh-plans__add-btn" onClick={openAdd}>
                <RhIcon as={Plus} size={18} strokeWidth={RH_ICON_STROKE} />
                بث جديد
              </Button>
            </div>
          )}
        </div>
      </header>

      {!readOnly && can(PH, 'remote_tasmee_join_public') && (
        <section className="rh-settings-card rh-plans__join-card">
          <div className="rh-settings-card__head">
            <h2 className="rh-settings-card__title">الانضمام لبث عام</h2>
            <p className="rh-settings-card__subtitle">أدخل معرف البث إن كان معروضاً كعام.</p>
          </div>
          <div className="rh-plans__join-row">
            <TextField label="معرف البث" value={joinId} onChange={(e) => setJoinId(e.target.value)} />
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
              استكشاف البث العام
            </Link>
          </div>
        </section>
      )}

      {saved.length > 0 ? (
        <section className="rh-plans__saved">
          <h2 className="rh-plans__saved-title">بثوثك والجلسات المضافة</h2>
          <ul className="rh-plans__saved-list">
            {saved.map((b) => (
              <li key={b.id} className="rh-plans__saved-card">
                <div className="rh-plans__saved-head">
                  <div className="rh-plans__saved-head-main">
                    <div className="rh-plans__saved-head-titlerow">
                      <span
                        className={[
                          'rh-remote-tasmee-provider-mark',
                          `rh-remote-tasmee-provider-mark--${remoteTasmeeProviderBrandSuffix(b.provider)}`,
                        ].join(' ')}
                        title={remoteTasmeeProviderLabelAr(b.provider)}
                        aria-label={remoteTasmeeProviderLabelAr(b.provider)}
                      >
                        <RemoteTasmeeProviderIcon provider={b.provider} size={18} aria-hidden />
                      </span>
                      <div className="rh-plans__saved-head-text">
                        <strong>{b.title}</strong>
                        <span className="rh-plans__saved-badges">
                          <span className="rh-plans__saved-badge">
                            {b.remoteTasmeeVisibility === 'public' ? 'عام' : 'خاص'}
                          </span>
                          <span className="rh-plans__saved-badge">{roleLabel(b.broadcastRole)}</span>
                          <span className="rh-plans__saved-badge">{remoteTasmeeMediaLabelAr(b.mediaType)}</span>
                          <span className="rh-plans__saved-badge">{remoteTasmeeProviderLabelAr(b.provider)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="rh-plans__saved-meta">
                  <RhIcon as={Video} size={16} strokeWidth={RH_ICON_STROKE} aria-hidden style={{ verticalAlign: 'middle' }} />{' '}
                  افتح صفحة البث لنسخ الرابط والانضمام السريع.
                </p>
                {b.description && <p className="rh-plans__saved-desc">{b.description}</p>}
                {b.linkedExamId ? (
                  <p className="rh-plans__saved-meta">
                    مرتبط باختبار: {b.linkedExamTitle ? <strong>{b.linkedExamTitle}</strong> : null}
                    {b.linkedExamTitle ? ' · ' : null}
                    <code className="rh-plans__plan-id">{b.linkedExamId}</code>
                  </p>
                ) : null}
                <p className="rh-plans__saved-meta">
                  المعرف: <code className="rh-plans__plan-id">{b.id}</code>
                </p>
                <div className="rh-plans__saved-actions">
                  <Link
                    to={appLink(`/app/remote-tasmee/${encodeURIComponent(b.id)}`)}
                    className="ui-btn ui-btn--secondary ui-btn--sm"
                  >
                    <RemoteTasmeeProviderIcon provider={b.provider} size={16} aria-hidden />
                    صفحة البث
                  </Link>
                  {broadcastCanManageMembers(b) && can(PH, 'remote_tasmee_card_members') && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => setMembersModal(b)}>
                      <RhIcon as={Users} size={16} strokeWidth={RH_ICON_STROKE} />
                      الأعضاء
                    </Button>
                  )}
                  {broadcastCanEdit(b) && can(PH, 'remote_tasmee_card_edit') && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(b)}>
                      <RhIcon as={Pencil} size={16} strokeWidth={RH_ICON_STROKE} />
                      تعديل
                    </Button>
                  )}
                  {can(PH, 'remote_tasmee_card_delete_leave') && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(b)}>
                      <RhIcon as={Trash2} size={16} strokeWidth={RH_ICON_STROKE} />
                      {leavingUserDeletesWholeGroup(viewUserId, b.ownerUid, b.broadcastRole, HALAKA_MEMBER_ROLES)
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
        <p className="rh-plans__empty">لا توجد جلسات عن بعد بعد. أنشئ بثاً أو انضم لبث عام.</p>
      )}

      <Modal
        open={editorOpen}
        title={editingId ? 'تعديل البث' : 'بث تسميع عن بعد جديد'}
        onClose={() => {
          if (!saveBusy) {
            setEditorOpen(false)
            setEditingId(null)
            setLinkedExamId('')
            setLinkedExamTitle('')
          }
        }}
        size="lg"
        closeOnBackdrop={!saveBusy}
        closeOnEsc={!saveBusy}
        showClose={!saveBusy}
      >
        <ScrollArea className="rh-plans__editor-scroll" padded>
          <TextField label="عنوان الجلسة" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextAreaField label="وصف (اختياري)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          {linkedExamId ? (
            <div className="rh-remote-tasmee-linked-exam">
              <p className="rh-plans__field-label">مرتبط بمجموعة اختبار</p>
              <p className="rh-plans__saved-meta">
                {linkedExamTitle ? <strong>{linkedExamTitle}</strong> : null}
                {linkedExamTitle ? ' · ' : null}
                <code className="rh-plans__plan-id">{linkedExamId}</code>
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLinkedExamId('')
                  setLinkedExamTitle('')
                }}
              >
                إلغاء الربط
              </Button>
            </div>
          ) : null}
          <p className="rh-plans__field-label">نوع البث</p>
          <div className="rh-segment rh-segment--plans">
            <button
              type="button"
              className={['rh-segment__btn', mediaType === REMOTE_TASMEE_MEDIA.VIDEO ? 'rh-segment__btn--active' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => setMediaType(REMOTE_TASMEE_MEDIA.VIDEO)}
            >
              <span className="rh-segment__label">مرئي</span>
            </button>
            <button
              type="button"
              className={['rh-segment__btn', mediaType === REMOTE_TASMEE_MEDIA.AUDIO ? 'rh-segment__btn--active' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => setMediaType(REMOTE_TASMEE_MEDIA.AUDIO)}
            >
              <span className="rh-segment__label">صوتي</span>
            </button>
          </div>
          <label className="rh-plans__field-label" htmlFor="remote-provider">
            تطبيق الاجتماع
          </label>
          <MeetingProviderLaunchRow
            mediaType={mediaType}
            setMeetingUrl={setMeetingUrl}
            setProvider={setProvider}
            onLaunched={onMeetingProviderLaunched}
            disabled={saveBusy}
          />
          <select
            id="remote-provider"
            className="ui-input"
            style={{ width: '100%', marginBottom: '1rem' }}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {PROVIDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="rh-plans__join-row">
            <TextField
              id="remote-meeting-url"
              label="رابط الاجتماع"
              hint="بعد نسخ الرابط من التطبيق استخدم «لصق من الحافظة» أو Ctrl+V."
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/… أو رابط زووم / تيمز"
            />
            <Button
              type="button"
              variant="secondary"
              className="rh-plans__join-btn"
              disabled={saveBusy}
              onClick={() => {
                void pasteMeetingUrlFromClipboard()
              }}
            >
              <RhIcon as={ClipboardPaste} size={18} strokeWidth={RH_ICON_STROKE} />
              لصق من الحافظة
            </Button>
          </div>
          <TextField
            label="رمز الاجتماع (اختياري)"
            value={meetingCode}
            onChange={(e) => setMeetingCode(e.target.value)}
            placeholder="مثال: 123 456 7890"
          />
          <p className="rh-plans__field-label">الظهور</p>
          <div className="rh-segment rh-segment--plans">
            <button
              type="button"
              className={['rh-segment__btn', remoteVisibility === 'private' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => setRemoteVisibility('private')}
            >
              <span className="rh-segment__label">خاص (أعضاء فقط يرون الرابط)</span>
            </button>
            <button
              type="button"
              className={['rh-segment__btn', remoteVisibility === 'public' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => setRemoteVisibility('public')}
            >
              <span className="rh-segment__label">عام (يمكن الانضمام من الاستكشاف)</span>
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
                setLinkedExamId('')
                setLinkedExamTitle('')
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
          leavingUserDeletesWholeGroup(viewUserId, deleting.ownerUid, deleting.broadcastRole, HALAKA_MEMBER_ROLES)
            ? 'حذف البث نهائياً لجميع الأعضاء؟'
            : 'مغادرة هذا البث؟'}
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
          {can(PH, 'remote_tasmee_member_add') && (
            <section className="rh-plan-members-modal__section">
              <h3 className="rh-plan-members-modal__heading">إضافة عضو</h3>
              <p className="rh-plan-members-modal__hint">
                يستطيع الأعضاء المضافون رؤية رابط الاجتماع وتفاصيل البث في صفحة البث.
              </p>
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
                                await addUserToRemoteTasmee(user, membersModal.id, u.uid, user)
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
                  const actorRole = normalizeRole(membersModal?.broadcastRole)
                  return (
                    <li key={row.userId} className="rh-members-chat__item">
                      <div className="rh-members-chat__main">
                        <strong>{row.displayName || row.userId}</strong>
                        <span className="rh-plans__saved-badge">{roleLabel(row.role)}</span>
                      </div>
                      {!isOwner && (
                        <div className="rh-members-chat__actions">
                          {can(PH, 'remote_tasmee_member_promote') && (
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
                                    await setRemoteTasmeeMemberRole(
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
                                    await setRemoteTasmeeMemberRole(
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
                                    await setRemoteTasmeeMemberRole(
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
                          {can(PH, 'remote_tasmee_member_remove') && (
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
                                  await removeRemoteTasmeeMember(user, membersModal.id, row.userId)
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
