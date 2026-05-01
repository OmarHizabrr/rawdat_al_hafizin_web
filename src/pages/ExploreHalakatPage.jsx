import { Compass, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CrossNav } from '../components/CrossNav.jsx'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { useSiteContent } from '../context/useSiteContent.js'
import {
  EXPLORE_SORT_OPTIONS,
  filterPublicHalakatBySearch,
  sortPublicHalakat,
  subscribePublicHalakatForExplore,
} from '../services/exploreHalakatService.js'
import { halakaSessionDisplay } from '../utils/datePeriodAr.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { joinPublicHalaka, loadHalakat } from '../utils/halakatStorage.js'
import { Button, ScrollArea, TextField, useToast } from '../ui/index.js'
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

function weekdayArrLabel(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0 || arr.length >= 7) return 'كل الأيام'
  return [...arr]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAYS.find((w) => w.d === d)?.label || d)
    .join('، ')
}

const PE = PERMISSION_PAGE_IDS.halakat_explore

export default function ExploreHalakatPage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
  const { search } = useLocation()
  const { branding, str } = useSiteContent()
  const toast = useToast()
  const impersonateUid = getImpersonateUid(user, search)
  const viewUserId = impersonateUid || user?.uid || ''
  const actingAsUser = Boolean(user?.uid && impersonateUid && impersonateUid !== user.uid)

  const [rawRows, setRawRows] = useState([])
  const [searchQ, setSearchQ] = useState('')
  const [sortValue, setSortValue] = useState('newest')
  const [joinId, setJoinId] = useState('')
  const [myIds, setMyIds] = useState(() => new Set())
  const [joinByIdLoading, setJoinByIdLoading] = useState(false)
  const [joiningCardId, setJoiningCardId] = useState(null)

  const appLink = useCallback(
    (path) => withImpersonationQuery(path, impersonateUid),
    [impersonateUid],
  )

  useEffect(() => {
    document.title = `استكشاف الحلقات العامة — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    if (!viewUserId) return undefined
    loadHalakat(viewUserId).then((rows) => {
      setMyIds(new Set((rows || []).map((p) => p.id).filter(Boolean)))
    })
  }, [viewUserId])

  useEffect(() => {
    const unsub = subscribePublicHalakatForExplore(
      (rows) => setRawRows(rows),
      () => setRawRows([]),
    )
    return () => unsub()
  }, [])

  const displayed = useMemo(() => {
    const filtered = filterPublicHalakatBySearch(rawRows, searchQ)
    return sortPublicHalakat(filtered, sortValue)
  }, [rawRows, searchQ, sortValue])

  const handleJoinById = async () => {
    const id = joinId.trim()
    if (!id || !viewUserId || !user) return
    setJoinByIdLoading(true)
    try {
      await joinPublicHalaka(viewUserId, id, user)
      setJoinId('')
      setMyIds((prev) => new Set(prev).add(id))
      toast.success('تم الانضمام إلى الحلقة.', 'تم')
    } catch (e) {
      const m = e?.message
      if (m === 'HALAKA_NOT_PUBLIC') toast.warning('هذه الحلقة ليست عامة.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else if (m === 'HALAKA_NOT_FOUND') toast.warning('لم يُعثر على حلقة بهذا المعرف.', '')
      else toast.warning('تعذر الانضمام.', '')
    } finally {
      setJoinByIdLoading(false)
    }
  }

  const handleJoinCard = async (halakaId) => {
    if (!viewUserId || !user) return
    setJoiningCardId(halakaId)
    try {
      await joinPublicHalaka(viewUserId, halakaId, user)
      setMyIds((prev) => new Set(prev).add(halakaId))
      toast.success('تم الانضمام إلى الحلقة.', 'تم')
    } catch (e) {
      const m = e?.message
      if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else toast.warning('تعذر الانضمام.', '')
    } finally {
      setJoiningCardId(null)
    }
  }

  const crossItems = useMemo(() => {
    const base = [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/halakat'), label: str('layout.nav_halakat') },
    ]
    if (canAccessPage('remote_tasmee')) {
      base.push({ to: appLink('/app/remote-tasmee'), label: str('layout.nav_remote_tasmee') })
    }
    if (canAccessPage('remote_tasmee_explore')) {
      base.push({
        to: appLink('/app/remote-tasmee/explore'),
        label: str('layout.nav_remote_tasmee_explore'),
      })
    }
    if (canAccessPage('exams')) {
      base.push({ to: appLink('/app/exams'), label: str('layout.nav_exams') })
    }
    if (canAccessPage('exams_explore')) {
      base.push({ to: appLink('/app/exams/explore'), label: str('layout.nav_exams_explore') })
    }
    base.push(
      { to: appLink('/app/plans'), label: str('layout.nav_plans') },
      { to: appLink('/app/dawrat'), label: str('layout.nav_dawrat') },
    )
    if (canAccessPage('leave_request')) {
      base.push({ to: appLink('/app/leave-request'), label: str('layout.nav_leave_request') })
    }
    if (canAccessPage('certificates')) {
      base.push({ to: appLink('/app/certificates'), label: str('layout.nav_certificates') })
    }
    base.push({ to: appLink('/app/settings'), label: str('layout.nav_settings') })
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
      base.push({ to: '/app/admin/users', label: str('layout.nav_users') })
    }
    return base
  }, [user, str, appLink, canAccessPage])

  return (
    <div className="rh-explore-plans">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title rh-explore-plans__title">
              <RhIcon as={Compass} size={28} strokeWidth={RH_ICON_STROKE} className="rh-explore-plans__title-icon" />
              استكشاف الحلقات العامة
            </h1>
            <p className="rh-plans__desc">
              حلقات معلنة كعامة. يمكنك البحث والفرز، ثم الانضمام بزر واحد أو بمعرف الحلقة.
              {actingAsUser && ' أنت تعمل نيابة عن مستخدم: الانضمام يُسجَّل لحسابه.'}
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <Link className="ui-btn ui-btn--secondary rh-explore-plans__to-mine" to={appLink('/app/halakat')}>
            حلقاتي
          </Link>
        </div>
      </header>

      <section className="rh-settings-card rh-explore-plans__toolbar">
        <div className="rh-explore-plans__toolbar-grid">
          <TextField
            label="بحث"
            hint="الاسم، الوصف، المكان، المعرف، أو المنشئ"
            placeholder="ابحث…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="explore-halakat-sort">
              الترتيب
            </label>
            <select
              id="explore-halakat-sort"
              className="ui-input"
              value={sortValue}
              onChange={(e) => setSortValue(e.target.value)}
            >
              {EXPLORE_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {can(PE, 'explore_join_by_id') && (
          <div className="rh-explore-plans__join-inline">
            <TextField
              label="انضمام بمعرف الحلقة"
              placeholder="الصق معرف الحلقة…"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
            <Button
              type="button"
              variant="primary"
              onClick={handleJoinById}
              loading={joinByIdLoading}
              disabled={!joinId.trim() || !viewUserId || joinByIdLoading}
            >
              {!joinByIdLoading && <RhIcon as={UserPlus} size={18} strokeWidth={RH_ICON_STROKE} />}
              انضمام
            </Button>
          </div>
        )}
      </section>

      <p className="rh-explore-plans__count">
        {displayed.length === rawRows.length
          ? `${rawRows.length} حلقة عامة`
          : `${displayed.length} من ${rawRows.length} حلقة`}
      </p>

      {displayed.length === 0 ? (
        <section className="rh-settings-card rh-plans__empty">
          <h2 className="rh-settings-card__title">لا توجد نتائج</h2>
          <p className="rh-settings-card__subtitle">
            {rawRows.length === 0
              ? 'لا توجد حلقات عامة بعد، أو لا تملك صلاحية قراءتها من Firestore.'
              : 'جرّب تغيير عبارة البحث أو الترتيب.'}
          </p>
        </section>
      ) : (
        <ScrollArea className="rh-explore-plans__scroll" padded>
          <ul className="rh-explore-plans__list">
            {displayed.map((p) => {
              const inItem = myIds.has(p.id)
              const sessionDisp = halakaSessionDisplay(p)
              return (
                <li key={p.id} className="rh-explore-plans__card">
                  <div className="rh-explore-plans__card-head">
                    <div className="rh-explore-plans__card-title-block">
                      <strong className="rh-explore-plans__card-name">{p.name || 'حلقة بدون اسم'}</strong>
                      <span className="rh-plans__saved-badges">
                        <span className="rh-plans__saved-badge">{p.genderType === 'women' ? 'نساء' : 'رجال'}</span>
                        <span className="rh-plans__saved-badge">{p.memberCount ?? 0} عضواً</span>
                      </span>
                    </div>
                    {can(PE, 'explore_join_card') ? (
                      <Button
                        type="button"
                        variant={inItem ? 'secondary' : 'primary'}
                        size="sm"
                        loading={joiningCardId === p.id}
                        disabled={inItem || joiningCardId !== null}
                        onClick={() => !inItem && handleJoinCard(p.id)}
                      >
                        {inItem ? 'أنت منضم' : 'انضمام'}
                      </Button>
                    ) : (
                      <span className="rh-plans__saved-badge">{inItem ? 'منضم' : 'عرض فقط'}</span>
                    )}
                  </div>

                  {p.description ? <p className="rh-plans__saved-desc">{p.description}</p> : null}

                  <p className="rh-plans__saved-meta">
                    <span className="rh-explore-plans__label">المعرف:</span>{' '}
                    <code className="rh-plans__plan-id">{p.id}</code>
                  </p>

                  <div className="rh-explore-plans__creator">
                    {p.creatorPhoto ? (
                      <img src={p.creatorPhoto} alt="" className="rh-explore-plans__avatar" />
                    ) : (
                      <div className="rh-explore-plans__avatar rh-explore-plans__avatar--placeholder" aria-hidden />
                    )}
                    <div>
                      <p className="rh-explore-plans__creator-label">المنشئ</p>
                      <p className="rh-explore-plans__creator-name">{p.creatorDisplayName}</p>
                      {p.creatorEmail && <p className="rh-explore-plans__creator-email">{p.creatorEmail}</p>}
                      <p className="rh-explore-plans__creator-uid">
                        <span className="rh-explore-plans__label">uid:</span>{' '}
                        <code className="rh-plans__plan-id">{p.creatorUid || '—'}</code>
                      </p>
                    </div>
                  </div>

                  <ul className="rh-explore-plans__facts">
                    {p.location ? (
                      <li>
                        <strong>المكان:</strong> {p.location}
                      </li>
                    ) : null}
                    <li>
                      <strong>أيام التسميع:</strong> {weekdayArrLabel(p.tasmeeWeekdays)}
                    </li>
                    <li>
                      <strong>أيام المراجعة:</strong> {weekdayArrLabel(p.reviewWeekdays)}
                    </li>
                    {sessionDisp && (
                      <li>
                        <strong>موعد الحلقة:</strong> {sessionDisp.startLabel} — {sessionDisp.endLabel} (
                        {sessionDisp.durationLabel})
                      </li>
                    )}
                  </ul>

                  <p className="rh-explore-plans__meta-muted">
                    أُنشئت: {p.createdAt ? String(p.createdAt) : '—'} · حُدّثت:{' '}
                    {p.updatedAt ? String(p.updatedAt) : '—'}
                  </p>
                </li>
              )
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  )
}
