import { Compass, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { useSiteContent } from '../context/useSiteContent.js'
import { isAdmin } from '../config/roles.js'
import {
  EXPLORE_SORT_OPTIONS,
  filterPublicPlansBySearch,
  sortPublicPlans,
  subscribePublicPlansForExplore,
} from '../services/explorePlansService.js'
import { DAILY_LOGGING_STRICT_CARRYOVER } from '../utils/planDailyQuota.js'
import { joinPublicPlan, loadPlans } from '../utils/plansStorage.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { Button, ScrollArea, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'
import { CrossNav } from '../components/CrossNav.jsx'

function formatReminderAr(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return hhmm
  const d = new Date()
  d.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return d.toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit' })
}

export default function ExplorePlansPage() {
  const { user } = useAuth()
  const { search } = useLocation()
  const { typeLabel, branding, str } = useSiteContent()
  const toast = useToast()
  const impersonateUid = getImpersonateUid(user, search)
  const viewUserId = impersonateUid || user?.uid || ''
  const actingAsUser = Boolean(user?.uid && impersonateUid && impersonateUid !== user.uid)

  const [rawPlans, setRawPlans] = useState([])
  const [searchQ, setSearchQ] = useState('')
  const [sortValue, setSortValue] = useState('newest')
  const [joinId, setJoinId] = useState('')
  const [myPlanIds, setMyPlanIds] = useState(() => new Set())

  const appLink = useCallback(
    (path) => withImpersonationQuery(path, impersonateUid),
    [impersonateUid],
  )

  useEffect(() => {
    document.title = `استكشاف الخطط العامة — ${branding.siteTitle}`
  }, [branding.siteTitle])

  useEffect(() => {
    if (!viewUserId) return undefined
    loadPlans(viewUserId).then((plans) => {
      setMyPlanIds(new Set((plans || []).map((p) => p.id).filter(Boolean)))
    })
  }, [viewUserId])

  useEffect(() => {
    const unsub = subscribePublicPlansForExplore(
      (rows) => setRawPlans(rows),
      () => setRawPlans([]),
    )
    return () => unsub()
  }, [])

  const displayed = useMemo(() => {
    const filtered = filterPublicPlansBySearch(rawPlans, searchQ)
    return sortPublicPlans(filtered, sortValue)
  }, [rawPlans, searchQ, sortValue])

  const handleJoinById = async () => {
    const id = joinId.trim()
    if (!id || !viewUserId || !user) return
    try {
      await joinPublicPlan(viewUserId, id, user)
      setJoinId('')
      setMyPlanIds((prev) => new Set(prev).add(id))
      toast.success('تم الانضمام إلى الخطة.', 'تم')
    } catch (e) {
      const m = e?.message
      if (m === 'PLAN_NOT_PUBLIC') toast.warning('هذه الخطة ليست عامة.', '')
      else if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else if (m === 'PLAN_NOT_FOUND') toast.warning('لم يُعثر على خطة بهذا المعرف.', '')
      else toast.warning('تعذر الانضمام.', '')
    }
  }

  const handleJoinCard = async (planId) => {
    if (!viewUserId || !user) return
    try {
      await joinPublicPlan(viewUserId, planId, user)
      setMyPlanIds((prev) => new Set(prev).add(planId))
      toast.success('تم الانضمام إلى الخطة.', 'تم')
    } catch (e) {
      const m = e?.message
      if (m === 'ALREADY_MEMBER') toast.info('أنت مضاف مسبقاً.', '')
      else toast.warning('تعذر الانضمام.', '')
    }
  }

  const crossItems = useMemo(() => {
    const base = [
      { to: appLink('/app'), label: str('layout.nav_home') },
      { to: appLink('/app/plans'), label: str('layout.nav_plans') },
      { to: appLink('/app/awrad'), label: str('layout.nav_awrad') },
      { to: appLink('/app/welcome'), label: str('layout.nav_welcome') },
      { to: appLink('/app/settings'), label: str('layout.nav_settings') },
    ]
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
      base.push({ to: '/app/admin/users', label: str('layout.nav_users') })
    }
    return base
  }, [user, str, appLink])

  return (
    <div className="rh-explore-plans">
      <header className="rh-plans__hero">
        <div className="rh-plans__hero-head">
          <div>
            <h1 className="rh-plans__title rh-explore-plans__title">
              <RhIcon as={Compass} size={28} strokeWidth={RH_ICON_STROKE} className="rh-explore-plans__title-icon" />
              استكشاف الخطط العامة
            </h1>
            <p className="rh-plans__desc">
              خطط معلنة كعامة من قبل المستخدمين. يمكنك البحث والفرز، ثم الانضمام بزر واحد أو بمعرف الخطة.
              {actingAsUser && ' أنت تعمل نيابة عن مستخدم: الانضمام يُسجَّل لحسابه.'}
            </p>
            <CrossNav items={crossItems} className="rh-plans__cross" />
          </div>
          <Link className="ui-btn ui-btn--secondary rh-explore-plans__to-mine" to={appLink('/app/plans')}>
            خططي
          </Link>
        </div>
      </header>

      <section className="rh-settings-card rh-explore-plans__toolbar">
        <div className="rh-explore-plans__toolbar-grid">
          <TextField
            label="بحث"
            hint="الاسم، المعرف، نوع الخطة، المجلدات، أو المنشئ"
            placeholder="ابحث…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="explore-sort">
              الترتيب
            </label>
            <select
              id="explore-sort"
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
        <div className="rh-explore-plans__join-inline">
          <TextField
            label="انضمام بمعرف الخطة"
            placeholder="الصق معرف الخطة…"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
          />
          <Button type="button" variant="primary" onClick={handleJoinById} disabled={!joinId.trim() || !viewUserId}>
            <RhIcon as={UserPlus} size={18} strokeWidth={RH_ICON_STROKE} />
            انضمام
          </Button>
        </div>
      </section>

      <p className="rh-explore-plans__count">
        {displayed.length === rawPlans.length
          ? `${rawPlans.length} خطة عامة`
          : `${displayed.length} من ${rawPlans.length} خطة`}
      </p>

      {displayed.length === 0 ? (
        <section className="rh-settings-card rh-plans__empty">
          <h2 className="rh-settings-card__title">لا توجد نتائج</h2>
          <p className="rh-settings-card__subtitle">
            {rawPlans.length === 0
              ? 'لا توجد خطط عامة بعد، أو لا تملك صلاحية قراءتها من Firestore.'
              : 'جرّب تغيير عبارة البحث أو الترتيب.'}
          </p>
        </section>
      ) : (
        <ScrollArea className="rh-explore-plans__scroll" padded>
          <ul className="rh-explore-plans__list">
            {displayed.map((p) => {
              const typeLbl = typeLabel(p.planType)
              const inPlan = myPlanIds.has(p.id)
              return (
                <li key={p.id} className="rh-explore-plans__card">
                  <div className="rh-explore-plans__card-head">
                    <div className="rh-explore-plans__card-title-block">
                      <strong className="rh-explore-plans__card-name">{p.name || 'خطة بدون اسم'}</strong>
                      <span className="rh-plans__saved-badges">
                        <span className="rh-plans__saved-badge">{typeLbl}</span>
                        <span className="rh-plans__saved-badge">{p.memberCount ?? 0} عضواً</span>
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant={inPlan ? 'secondary' : 'primary'}
                      size="sm"
                      disabled={inPlan}
                      onClick={() => !inPlan && handleJoinCard(p.id)}
                    >
                      {inPlan ? 'أنت منضم' : 'انضمام'}
                    </Button>
                  </div>

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
                    <li>
                      <strong>الورد اليومي:</strong> {p.dailyPages ?? '—'} صفحة
                    </li>
                    <li>
                      <strong>سياسة التسجيل:</strong>{' '}
                      {p.dailyLoggingMode === DAILY_LOGGING_STRICT_CARRYOVER
                        ? 'تراكمي (لا تجاوز يومي إلا بتعويض الغياب)'
                        : 'تجاوز يومي مسموح'}
                    </li>
                    <li>
                      <strong>تاريخ الورد:</strong>{' '}
                      {p.allowCustomRecordingDate
                        ? 'يمكن اختيار يوم التسجيل في النموذج'
                        : 'دائماً اليوم المحلي عند التسجيل'}
                    </li>
                    <li>
                      <strong>إجمالي الصفحات:</strong> {p.totalTargetPages ?? '—'}
                    </li>
                    {p.reminderTime && (
                      <li>
                        <strong>التذكير:</strong> {formatReminderAr(p.reminderTime)}
                      </li>
                    )}
                    {p.useDateRange && p.dateStart && p.dateEnd && (
                      <li>
                        <strong>الفترة:</strong> {p.dateStart} → {p.dateEnd}
                      </li>
                    )}
                    {p.weekdayLabels && (
                      <li>
                        <strong>أيام الأسبوع:</strong> {p.weekdayLabels}
                      </li>
                    )}
                  </ul>

                  {Array.isArray(p.volumes) && p.volumes.length > 0 && (
                    <div className="rh-explore-plans__volumes">
                      <p className="rh-explore-plans__label">المجلدات</p>
                      <ul className="rh-plans__saved-vols">
                        {p.volumes.map((v) => (
                          <li key={v.id}>
                            {v.label || v.id}: {v.pagesTarget ?? v.pages ?? '—'} صفحة
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

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
