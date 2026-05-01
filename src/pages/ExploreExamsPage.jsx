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
  filterPublicExamsBySearch,
  sortPublicExams,
  subscribePublicExamsForExplore,
} from '../services/exploreExamsService.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import {
  formatExamVolumeSpecsSummaryLines,
  totalResolvedPagesFromExamVolumeSpecs,
} from '../utils/examVolumeSpec.js'
import { joinPublicExam, loadExams } from '../utils/examsStorage.js'
import { Button, ScrollArea, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const PE = PERMISSION_PAGE_IDS.exams_explore

export default function ExploreExamsPage() {
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
    document.title = `استكشاف الاختبارات — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    if (!viewUserId) return undefined
    loadExams(viewUserId).then((rows) => {
      setMyIds(new Set((rows || []).map((p) => p.id).filter(Boolean)))
    })
  }, [viewUserId])

  useEffect(() => {
    const unsub = subscribePublicExamsForExplore(
      (rows) => setRawRows(rows),
      () => setRawRows([]),
    )
    return () => unsub()
  }, [])

  const displayed = useMemo(() => {
    const filtered = filterPublicExamsBySearch(rawRows, searchQ)
    return sortPublicExams(filtered, sortValue)
  }, [rawRows, searchQ, sortValue])

  const handleJoinById = async () => {
    const id = joinId.trim()
    if (!id || !viewUserId || !user) return
    setJoinByIdLoading(true)
    try {
      await joinPublicExam(viewUserId, id, user)
      setJoinId('')
      setMyIds((prev) => new Set(prev).add(id))
      toast.success('تم الانضمام.', 'تم')
    } catch (e) {
      const m = e?.message
      if (m === 'EXAM_NOT_PUBLIC') toast.warning('هذه المجموعة ليست عامة.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else if (m === 'EXAM_NOT_FOUND') toast.warning('لم يُعثر على مجموعة بهذا المعرف.', '')
      else toast.warning('تعذّر الانضمام.', '')
    } finally {
      setJoinByIdLoading(false)
    }
  }

  const handleJoinCard = async (examId) => {
    if (!viewUserId || !user) return
    setJoiningCardId(examId)
    try {
      await joinPublicExam(viewUserId, examId, user)
      setMyIds((prev) => new Set(prev).add(examId))
      toast.success('تم الانضمام.', 'تم')
    } catch (e) {
      const m = e?.message
      if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else toast.warning('تعذّر الانضمام.', '')
    } finally {
      setJoiningCardId(null)
    }
  }

  const crossItems = useMemo(() => {
    const base = [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/exams'), label: str('layout.nav_exams') },
      { to: appLink('/app/halakat'), label: str('layout.nav_halakat') },
      { to: appLink('/app/plans'), label: str('layout.nav_plans') },
    ]
    if (canAccessPage('leave_request')) {
      base.push({ to: appLink('/app/leave-request'), label: str('layout.nav_leave_request') })
    }
    base.push({ to: appLink('/app/settings'), label: str('layout.nav_settings') })
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
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
              استكشاف مجموعات الاختبار العامة
            </h1>
            <p className="rh-plans__desc">
              مجموعات معلنة كعامة. ابحث وانضمّ بزر أو بمعرّف المجموعة.
              {actingAsUser && ' أنت تعمل نيابة عن مستخدم آخر.'}
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <Link className="ui-btn ui-btn--secondary rh-explore-plans__to-mine" to={appLink('/app/exams')}>
            مجموعاتي
          </Link>
        </div>
      </header>

      <section className="rh-settings-card rh-explore-plans__toolbar">
        <div className="rh-explore-plans__toolbar-grid">
          <TextField
            label="بحث"
            hint="الاسم، الوصف، المعرف، المنشئ، أسماء المجلدات"
            placeholder="ابحث…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="explore-exams-sort">
              الترتيب
            </label>
            <select
              id="explore-exams-sort"
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
              label="انضمام بمعرف المجموعة"
              placeholder="الصق المعرف…"
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
          ? `${rawRows.length} مجموعة عامة`
          : `${displayed.length} من ${rawRows.length} مجموعة`}
      </p>

      {displayed.length === 0 ? (
        <section className="rh-settings-card rh-plans__empty">
          <h2 className="rh-settings-card__title">لا توجد نتائج</h2>
          <p className="rh-settings-card__subtitle">
            {rawRows.length === 0
              ? 'لا توجد مجموعات عامة بعد، أو لا تملك صلاحية القراءة من Firestore.'
              : 'جرّب تغيير البحث أو الترتيب.'}
          </p>
        </section>
      ) : (
        <ScrollArea className="rh-explore-plans__scroll" padded>
          <ul className="rh-explore-plans__list">
            {displayed.map((p) => {
              const inItem = myIds.has(p.id)
              const volLines = formatExamVolumeSpecsSummaryLines(p.examVolumeSpecs)
              const volTotal = totalResolvedPagesFromExamVolumeSpecs(p.examVolumeSpecs)
              return (
                <li key={p.id} className="rh-explore-plans__card">
                  <div className="rh-explore-plans__card-head">
                    <div className="rh-explore-plans__card-title-block">
                      <strong className="rh-explore-plans__card-name">{p.name || 'مجموعة بدون اسم'}</strong>
                      <span className="rh-plans__saved-badges">
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
                        {inItem ? 'منضم' : 'انضمام'}
                      </Button>
                    ) : (
                      <span className="rh-plans__saved-badge">{inItem ? 'منضم' : 'عرض فقط'}</span>
                    )}
                  </div>

                  {p.description ? <p className="rh-plans__saved-desc">{p.description}</p> : null}

                  {volLines.length > 0 ? (
                    <>
                      <ul className="rh-plans__saved-vols">
                        {volLines.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                      {volTotal > 0 ? (
                        <p className="rh-plans__saved-meta rh-exam-volumes-total">
                          المجموع التقريبي: <strong>{volTotal}</strong> صفحة
                        </p>
                      ) : null}
                    </>
                  ) : null}

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
                    </div>
                  </div>

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
