import { ArrowRight, Copy, Link2, Users, Video } from 'lucide-react'
import { RemoteTasmeeProviderIcon } from '../components/RemoteTasmeeProviderIcon.jsx'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import {
  HALAKA_MEMBER_ROLES,
  normalizeHalakaRole,
} from '../utils/halakatStorage.js'
import {
  joinPublicRemoteTasmee,
  loadRemoteTasmeeCanonical,
  remoteTasmeeMediaLabelAr,
  remoteTasmeeProviderLabelAr,
} from '../utils/remoteTasmeeStorage.js'
import { Button, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function roleLabel(role) {
  if (role === HALAKA_MEMBER_ROLES.OWNER) return 'مالك'
  if (role === HALAKA_MEMBER_ROLES.SUPERVISOR) return 'مشرف'
  if (role === HALAKA_MEMBER_ROLES.TEACHER) return 'معلم'
  return 'طالب'
}

export default function RemoteTasmeeBroadcastPage() {
  const { broadcastId: rawId } = useParams()
  const broadcastId = String(rawId || '').trim()
  const { user } = useAuth()
  const { ready, canAccessPage, firstAccessiblePath } = usePermissions()
  const { branding, str } = useSiteContent()
  const toast = useToast()
  const { search } = useLocation()
  const impersonateUid = getImpersonateUid(user, search)
  const appLink = useCallback((path) => withImpersonationQuery(path, impersonateUid), [impersonateUid])

  const [loading, setLoading] = useState(true)
  const [canon, setCanon] = useState(null)
  const [myRole, setMyRole] = useState(null)
  const [joinBusy, setJoinBusy] = useState(false)

  const mayAccess =
    !ready ||
    canAccessPage('remote_tasmee') ||
    canAccessPage('remote_tasmee_explore')

  useEffect(() => {
    document.title = canon?.title
      ? `${canon.title} — ${branding.siteTitle}`
      : `بث عن بعد — ${branding.siteTitle}`
  }, [canon?.title, branding.siteTitle])

  useEffect(() => {
    if (!broadcastId || !user?.uid) {
      setLoading(false)
      setCanon(null)
      setMyRole(null)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const c = await loadRemoteTasmeeCanonical(broadcastId)
        const mem = await firestoreApi.getData(firestoreApi.getPlanMemberDoc(broadcastId, user.uid))
        if (cancelled) return
        setCanon(c)
        setMyRole(mem ? normalizeHalakaRole(mem.role) : null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [broadcastId, user?.uid])

  const isMember = Boolean(myRole)
  const isPublic = canon?.remoteTasmeeVisibility === 'public'
  const showLink = isMember
  const meetingUrl = String(canon?.meetingUrl || '').trim()

  const crossItems = useMemo(() => {
    const items = [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/remote-tasmee'), label: str('layout.nav_remote_tasmee') },
    ]
    if (canAccessPage('remote_tasmee_explore')) {
      items.push({ to: appLink('/app/remote-tasmee/explore'), label: str('layout.nav_remote_tasmee_explore') })
    }
    items.push({ to: appLink('/app/settings'), label: str('layout.nav_settings') })
    return items
  }, [str, appLink, canAccessPage])

  const copyUrl = async () => {
    if (!meetingUrl) return
    try {
      await navigator.clipboard.writeText(meetingUrl)
      toast.success('تم نسخ الرابط.', 'تم')
    } catch {
      toast.warning('تعذّر النسخ. انسخ يدوياً.', '')
    }
  }

  const openMeeting = () => {
    if (!meetingUrl) return
    window.open(meetingUrl, '_blank', 'noopener,noreferrer')
  }

  const handleJoin = async () => {
    if (!user?.uid || !broadcastId) return
    setJoinBusy(true)
    try {
      await joinPublicRemoteTasmee(user.uid, broadcastId, user)
      const mem = await firestoreApi.getData(firestoreApi.getPlanMemberDoc(broadcastId, user.uid))
      setMyRole(mem ? normalizeHalakaRole(mem.role) : HALAKA_MEMBER_ROLES.STUDENT)
      toast.success('تم الانضمام. يمكنك الآن فتح الرابط.', 'تم')
    } catch (e) {
      const m = e?.message
      if (m === 'ALREADY_MEMBER') {
        const mem = await firestoreApi.getData(firestoreApi.getPlanMemberDoc(broadcastId, user.uid))
        setMyRole(mem ? normalizeHalakaRole(mem.role) : HALAKA_MEMBER_ROLES.STUDENT)
        toast.info('أنت بالفعل عضو.', '')
      } else if (m === 'REMOTE_TASMEE_NOT_PUBLIC') toast.warning('هذا البث ليس عاماً.', '')
      else toast.warning('تعذّر الانضمام.', '')
    } finally {
      setJoinBusy(false)
    }
  }

  if (!ready) {
    return (
      <div className="rh-auth-loading" role="status" aria-live="polite">
        <div className="rh-spinner" />
        <p>جاري التحميل…</p>
      </div>
    )
  }

  if (!mayAccess) {
    return <Navigate to={firstAccessiblePath()} replace />
  }

  if (!broadcastId) {
    return <Navigate to={appLink('/app/remote-tasmee')} replace />
  }

  if (!loading && !canon) {
    return (
      <div className="rh-plans">
        <p className="rh-plans__empty">لم يُعثر على هذا البث.</p>
        <Link to={appLink('/app/remote-tasmee')}>العودة للقائمة</Link>
      </div>
    )
  }

  if (!loading && !isMember && !isPublic) {
    return (
      <div className="rh-plans">
        <header className="rh-plans__hero">
          <h1 className="rh-plans__title">بث خاص</h1>
          <p className="rh-plans__desc">يجب أن تكون عضواً لرؤية التفاصيل والرابط.</p>
          <CrossNav items={crossItems} className="rh-plans__cross" />
        </header>
      </div>
    )
  }

  return (
    <div className="rh-plans">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title">
              {loading ? (
                <RhIcon as={Video} size={28} strokeWidth={RH_ICON_STROKE} style={{ verticalAlign: 'middle' }} />
              ) : (
                <RemoteTasmeeProviderIcon
                  provider={canon?.provider}
                  size={28}
                  style={{ verticalAlign: 'middle' }}
                  aria-hidden
                />
              )}{' '}
              {loading ? '…' : canon?.title || 'بث عن بعد'}
            </h1>
            <p className="rh-plans__desc">
              {loading
                ? 'جاري التحميل…'
                : `${remoteTasmeeMediaLabelAr(canon?.mediaType)} · ${remoteTasmeeProviderLabelAr(canon?.provider)}${
                    isMember ? ` · دورك: ${roleLabel(myRole)}` : ''
                  }`}
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <Link className="ui-btn ui-btn--secondary" to={appLink('/app/remote-tasmee')}>
            <RhIcon as={Users} size={18} strokeWidth={RH_ICON_STROKE} />
            كل البثوث
          </Link>
        </div>
      </header>

      {!loading && canon?.description ? (
        <section className="rh-settings-card" style={{ marginBottom: '1.25rem' }}>
          <p className="rh-plans__saved-desc" style={{ margin: 0 }}>
            {canon.description}
          </p>
        </section>
      ) : null}

      {!loading && canon?.linkedExamId ? (
        <section className="rh-settings-card" style={{ marginBottom: '1.25rem' }}>
          <h2 className="rh-settings-card__title">اختبار مرتبط</h2>
          <p className="rh-plans__saved-meta">
            {canon.linkedExamTitle ? <strong>{canon.linkedExamTitle}</strong> : null}
            {canon.linkedExamTitle ? ' · ' : null}
            <code className="rh-plans__plan-id">{canon.linkedExamId}</code>
          </p>
          {canAccessPage('exams') ? (
            <Link className="ui-btn ui-btn--secondary ui-btn--sm" to={appLink('/app/exams')} style={{ marginTop: '0.5rem' }}>
              صفحة الاختبارات
            </Link>
          ) : null}
        </section>
      ) : null}

      {!loading && !isMember && isPublic && (
        <section className="rh-settings-card rh-plans__join-card">
          <h2 className="rh-settings-card__title">انضم لرؤية رابط الاجتماع</h2>
          <p className="rh-settings-card__subtitle">بعد الانضمام يظهر الرابط وأزرار النسخ والفتح.</p>
          <Button type="button" variant="primary" loading={joinBusy} onClick={handleJoin}>
            انضمام للبث
          </Button>
        </section>
      )}

      {showLink && meetingUrl && (
        <section className="rh-settings-card">
          <h2 className="rh-settings-card__title">رابط الاجتماع</h2>
          <p className="rh-plans__saved-meta" style={{ wordBreak: 'break-all' }}>
            <code className="rh-plans__plan-id">{meetingUrl}</code>
          </p>
          {canon?.meetingCode ? (
            <p className="rh-plans__saved-meta">
              <strong>رمز الاجتماع:</strong> <code className="rh-plans__plan-id">{canon.meetingCode}</code>
            </p>
          ) : null}
          <div className="rh-plans__saved-actions" style={{ marginTop: '1rem' }}>
            <Button type="button" variant="primary" onClick={openMeeting}>
              <RhIcon as={ArrowRight} size={18} strokeWidth={RH_ICON_STROKE} />
              فتح في تبويب جديد
            </Button>
            <Button type="button" variant="secondary" onClick={copyUrl}>
              <RhIcon as={Copy} size={18} strokeWidth={RH_ICON_STROKE} />
              نسخ الرابط
            </Button>
          </div>
        </section>
      )}

      {showLink && !meetingUrl && !loading && (
        <p className="rh-plans__empty">لا يوجد رابط محفوظ بعد. يمكن لمن يملك صلاحية التعديل تحديث البث من القائمة.</p>
      )}

      {!loading && (
        <p className="rh-plans__saved-meta" style={{ marginTop: '1.25rem' }}>
          <RhIcon as={Link2} size={16} strokeWidth={RH_ICON_STROKE} aria-hidden /> معرف البث:{' '}
          <code className="rh-plans__plan-id">{broadcastId}</code>
        </p>
      )}
    </div>
  )
}
