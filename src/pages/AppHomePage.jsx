import { BookOpen, CheckCircle2, ChevronDown, Coffee, Flame, Loader2, NotebookPen, Sparkles, Sunrise, Bird } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useSiteContent } from '../context/useSiteContent.js'
import { HomeWirdCheckInModal } from '../components/HomeWirdCheckInModal.jsx'
import { HomeWirdModal } from '../components/HomeWirdModal.jsx'
import { pickHomeMotivationQuote } from '../data/homeMotivationQuotes.js'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { loadRecentStudentFeelings } from '../services/studentFeelingsService.js'
import { setUserDefaultPlanId } from '../services/userService.js'
import { useOnClickOutside } from '../ui/hooks/useOnClickOutside.js'
import { loadPlans, subscribePlans } from '../utils/plansStorage.js'
import { subscribeAwrad } from '../utils/awradStorage.js'
import { buildAutoDefaultWirdAddRequest } from '../utils/autoLogDefaultWird.js'
import {
  getHomeWirdDashboardInsight,
  getHomeWirdDayStatus,
  shouldShowHomeLogWirdCumulative,
} from '../utils/homeWirdStatus.js'
import {
  isCheckinDismissedForDay,
  isCheckinSnoozed,
  setCheckinDismissNo,
  setCheckinSnooze,
} from '../utils/homeWirdCheckinStorage.js'
import { localYmd } from '../utils/planDailyQuota.js'
import { computePlanProgress } from '../utils/planProgress.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'
import { FEELINGS_FLIGHT_MODE, readFeelingsFlightMode } from '../utils/feelingsFlightPrefs.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

const PH = PERMISSION_PAGE_IDS.home

const MOOD_BADGE_LABEL = {
  rest: 'يوم راحة',
  done: 'ممتاز!',
  steady: 'ثابت',
  catchup: 'لنلحق التأخر',
  late: 'حان التعويض',
}

function HomeDashMoodIcon({ mood }) {
  const common = { size: 36, strokeWidth: 1.65 }
  switch (mood) {
    case 'rest':
      return <Coffee {...common} />
    case 'done':
      return <CheckCircle2 {...common} />
    case 'late':
      return <Flame {...common} />
    case 'catchup':
      return <Sunrise {...common} />
    default:
      return <BookOpen {...common} />
  }
}

function hashSeed(text) {
  let h = 0
  const s = String(text || '')
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33 + s.charCodeAt(i)) % 1000003
  }
  return h
}

function flightStyleFromFeeling(feeling, idx, mode) {
  const seed = hashSeed(`${feeling?.id || ''}:${feeling?.ownerUid || ''}:${idx}`)
  const baseDuration = 16 + (seed % 11)
  const duration =
    mode === FEELINGS_FLIGHT_MODE.FAST
      ? Math.max(8, baseDuration * 0.68)
      : mode === FEELINGS_FLIGHT_MODE.CALM
        ? baseDuration * 1.45
        : baseDuration
  const delay = -1 * (seed % 13)
  const y1 = -10 - (seed % 18)
  const y2 = 8 + ((seed >> 2) % 26)
  const y3 = -12 - ((seed >> 4) % 22)
  const scale = 0.92 + ((seed % 16) / 100)
  return {
    '--flight-duration': `${duration}s`,
    '--flight-delay': `${delay}s`,
    '--flight-y1': `${y1}px`,
    '--flight-y2': `${y2}px`,
    '--flight-y3': `${y3}px`,
    '--bird-scale': `${scale.toFixed(2)}`,
  }
}

export default function AppHomePage() {
  const { user } = useAuth()
  const { can, canAccessPage } = usePermissions()
  const { typeLabel, branding, str } = useSiteContent()
  const { search } = useLocation()
  const [searchParams] = useSearchParams()
  const uidParam = searchParams.get('uid')?.trim() || ''

  const contextUserId = useMemo(() => {
    if (!user?.uid) return ''
    if (uidParam && isAdmin(user)) return uidParam
    return user.uid
  }, [user, uidParam])

  const actingAsUser = Boolean(user?.uid && contextUserId && contextUserId !== user.uid)
  const impersonateUid = getImpersonateUid(user, search)

  const appPath = useCallback(
    (path) => withImpersonationQuery(path, impersonateUid),
    [impersonateUid],
  )

  const [plans, setPlans] = useState([])
  const [awrad, setAwrad] = useState([])
  const [subjectProfile, setSubjectProfile] = useState(null)
  const [planMenuOpen, setPlanMenuOpen] = useState(false)
  const [selectPlanLoadingId, setSelectPlanLoadingId] = useState(null)
  const planSwitchBusyRef = useRef(false)
  const planMenuRef = useRef(null)
  const [homeWirdOpen, setHomeWirdOpen] = useState(false)
  const [homeWirdCheckInOpen, setHomeWirdCheckInOpen] = useState(false)
  const [homeNow, setHomeNow] = useState(() => new Date())
  const [recentFeelings, setRecentFeelings] = useState([])
  const [feelingsFlightMode, setFeelingsFlightMode] = useState(() => readFeelingsFlightMode())
  const prevShouldOfferCheckInRef = useRef(false)

  useOnClickOutside(planMenuRef, () => setPlanMenuOpen(false), planMenuOpen)

  useEffect(() => {
    const id = window.setInterval(() => setHomeNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    document.title = actingAsUser
      ? `الرئيسية (نيابة) — ${branding.siteTitle}`
      : `الرئيسية — ${branding.siteTitle}`
  }, [actingAsUser, branding.siteTitle])

  useEffect(() => {
    if (!actingAsUser || !contextUserId) return undefined
    let cancelled = false
    firestoreApi.getData(firestoreApi.getUserDoc(contextUserId)).then((d) => {
      if (!cancelled) setSubjectProfile(d ? { ...d } : {})
    })
    return () => {
      cancelled = true
    }
  }, [actingAsUser, contextUserId])

  useEffect(() => {
    let cancelled = false
    loadRecentStudentFeelings(10)
      .then((rows) => {
        if (!cancelled) setRecentFeelings(rows)
      })
      .catch(() => {
        if (!cancelled) setRecentFeelings([])
      })
    return () => {
      cancelled = true
    }
  }, [awrad.length, plans.length])

  const impersonatedSubject = actingAsUser && contextUserId ? subjectProfile : null

  useEffect(() => {
    if (!contextUserId) return undefined
    loadPlans(contextUserId).then(setPlans)
    const unsubP = subscribePlans(contextUserId, setPlans)
    const unsubA = subscribeAwrad(contextUserId, setAwrad)
    return () => {
      unsubP()
      unsubA()
    }
  }, [contextUserId])

  const activePlanId = useMemo(() => {
    const def = actingAsUser ? impersonatedSubject?.defaultPlanId : user?.defaultPlanId
    if (def && plans.some((p) => p.id === def)) return def
    return plans[0]?.id ?? ''
  }, [actingAsUser, impersonatedSubject?.defaultPlanId, user?.defaultPlanId, plans])

  const activePlan = useMemo(
    () => plans.find((p) => p.id === activePlanId) ?? null,
    [plans, activePlanId],
  )

  const progress = useMemo(
    () => computePlanProgress(activePlan, awrad),
    [activePlan, awrad],
  )

  const selectPlan = useCallback(
    async (planId) => {
      if (!user || !planId || planSwitchBusyRef.current) return
      planSwitchBusyRef.current = true
      setSelectPlanLoadingId(planId)
      try {
        await setUserDefaultPlanId(user, planId, { targetUid: actingAsUser ? contextUserId : undefined })
        if (actingAsUser) {
          setSubjectProfile((p) => ({ ...(p || {}), defaultPlanId: planId }))
        }
        setPlanMenuOpen(false)
      } catch {
        /* يبقى الاختيار السابق */
      } finally {
        planSwitchBusyRef.current = false
        setSelectPlanLoadingId(null)
      }
    },
    [user, actingAsUser, contextUserId],
  )

  const name = actingAsUser
    ? impersonatedSubject?.displayName?.trim() || str('app.home_greeting_user_fallback')
    : user?.displayName?.trim() || str('app.home_greeting_fallback')
  const pct = progress?.progressPercent ?? 0

  const homeWirdStatus = useMemo(
    () => getHomeWirdDayStatus(activePlan, awrad, homeNow),
    [activePlan, awrad, homeNow],
  )
  const showHomeLogWirdCumulative = useMemo(
    () => shouldShowHomeLogWirdCumulative(activePlan, awrad, homeWirdStatus.todayYmd),
    [activePlan, awrad, homeWirdStatus.todayYmd],
  )
  const dashInsight = useMemo(
    () => getHomeWirdDashboardInsight(activePlan, awrad, homeWirdStatus),
    [activePlan, awrad, homeWirdStatus],
  )
  const homeMotivationQuote = useMemo(
    () => pickHomeMotivationQuote(homeWirdStatus.todayYmd),
    [homeWirdStatus.todayYmd],
  )

  const shouldOfferCheckIn = useMemo(() => {
    homeNow.getTime()
    if (!activePlan || !progress || !contextUserId) return false
    if (!can(PH, 'home_log_wird')) return false
    if (!showHomeLogWirdCumulative) return false
    if (homeWirdOpen) return false
    if (!homeWirdStatus.appliesToday || homeWirdStatus.isComplete) return false
    const ymd = homeWirdStatus.todayYmd
    const planId = activePlan.id
    if (isCheckinDismissedForDay(contextUserId, ymd, planId)) return false
    if (isCheckinSnoozed(contextUserId, ymd, planId)) return false
    if (!buildAutoDefaultWirdAddRequest(activePlan, awrad, localYmd()).ok) return false
    return true
  }, [
    activePlan,
    progress,
    contextUserId,
    can,
    homeWirdOpen,
    showHomeLogWirdCumulative,
    homeWirdStatus.appliesToday,
    homeWirdStatus.isComplete,
    homeWirdStatus.todayYmd,
    awrad,
    homeNow,
  ])

  useEffect(() => {
    if (!shouldOfferCheckIn) {
      setHomeWirdCheckInOpen(false)
      prevShouldOfferCheckInRef.current = false
      return undefined
    }
    if (!prevShouldOfferCheckInRef.current) {
      prevShouldOfferCheckInRef.current = true
      const t = window.setTimeout(() => setHomeWirdCheckInOpen(true), 550)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [shouldOfferCheckIn])

  const awradHref = appPath(`/app/awrad?plan=${encodeURIComponent(activePlan?.id || '')}`)
  const canVisitFeelings = canAccessPage('feelings')
  const canRenderFlights =
    canVisitFeelings &&
    recentFeelings.length > 0 &&
    feelingsFlightMode !== FEELINGS_FLIGHT_MODE.OFF
  const flyingFeelings = useMemo(
    () => recentFeelings.slice(0, feelingsFlightMode === FEELINGS_FLIGHT_MODE.CALM ? 5 : 8),
    [recentFeelings, feelingsFlightMode],
  )

  useEffect(() => {
    const onStorage = (e) => {
      if (e?.key && e.key !== 'rh.feelingsFlightMode') return
      setFeelingsFlightMode(readFeelingsFlightMode())
    }
    const onCustom = (e) => {
      const next = e?.detail
      if (next === 'off' || next === 'calm' || next === 'fast') setFeelingsFlightMode(next)
      else setFeelingsFlightMode(readFeelingsFlightMode())
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('rh:feelings-flight-mode', onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('rh:feelings-flight-mode', onCustom)
    }
  }, [])

  return (
    <div className="rh-app-home rh-app-home--dash">
      <header className="rh-home-dash__top rh-home-dash__top--app card">
        <div className="rh-home-dash__top-row">
          <div>
            <p className="rh-home-dash__hello">
              مرحباً، <strong>{name}</strong>
            </p>
            <p className="rh-home-dash__tagline">
              {actingAsUser ? str('app.home_lead_impersonate') : str('app.home_lead_normal')}
            </p>
          </div>
          <span className="rh-home-dash__sparkle" aria-hidden>
            <Sparkles size={24} strokeWidth={1.75} />
          </span>
        </div>
        {actingAsUser && (
          <p className="rh-plans__admin-banner rh-app-home__impersonation">
            <Link to="/app/admin/users">{str('app.home_impersonation_users')}</Link>
            {' · '}
            <Link to={`/app/plans?uid=${encodeURIComponent(contextUserId)}`}>{str('app.home_impersonation_plans')}</Link>
            {' · '}
            <Link to={`/app/halakat?uid=${encodeURIComponent(contextUserId)}`}>{str('app.home_impersonation_halakat')}</Link>
            {' · '}
            <Link to={`/app/dawrat?uid=${encodeURIComponent(contextUserId)}`}>{str('app.home_impersonation_dawrat')}</Link>
            {' · '}
            <Link to={`/app/awrad?uid=${encodeURIComponent(contextUserId)}`}>{str('app.home_impersonation_awrad')}</Link>
            {' · '}
            <Link to="/app">{str('app.home_impersonation_my_account')}</Link>
          </p>
        )}
      </header>

      {canRenderFlights ? (
        <ul
          className={['rh-home-feelings-birds__overlay', `rh-home-feelings-birds__overlay--${feelingsFlightMode}`].join(' ')}
          aria-label="طيور المشاعر المتدفقة"
        >
            {flyingFeelings.map((f, i) => (
              <li
                key={`${f.ownerUid}-${f.id}`}
                className="rh-home-feelings-birds__flight"
                style={flightStyleFromFeeling(f, i, feelingsFlightMode)}
              >
                <article className="rh-home-feelings-birds__bird-card">
                  <span className="rh-home-feelings-birds__bird" aria-hidden>
                    {f.bird || '🐦'}
                  </span>
                  <header className="rh-home-feelings-birds__who">
                    {f.photoURL ? (
                      <img
                        src={f.photoURL}
                        alt=""
                        width={28}
                        height={28}
                        className="rh-home-feelings-birds__avatar"
                      />
                    ) : (
                      <span className="rh-home-feelings-birds__avatar rh-home-feelings-birds__avatar--fallback">
                        {(f.displayName || 'ط').charAt(0)}
                      </span>
                    )}
                    <strong>{f.displayName || 'طالب'}</strong>
                  </header>
                  <p className="rh-home-feelings-birds__text">{f.text}</p>
                  <span className="rh-home-feelings-birds__meta">{'★'.repeat(Math.max(1, f.rating || 1))}</span>
                </article>
              </li>
            ))}
        </ul>
      ) : null}

      {activePlan && progress ? (
        <section className={`rh-home-dash rh-home-dash--app card rh-home-dash--mood-${dashInsight.mood}`}>
          <div className="rh-home-dash__glow" aria-hidden />
          <div className="rh-home-dash__sparkles" aria-hidden />

          <div className="rh-home-dash__head">
            <p className="rh-home-dash__eyebrow">{actingAsUser ? str('app.home_plan_now_other') : str('app.home_plan_now_you')}</p>
            <div className="rh-home-dash__picker-wrap" ref={planMenuRef}>
              {can(PH, 'home_switch_plan') ? (
                <>
                  <button
                    type="button"
                    className="rh-home-dash__picker"
                    onClick={() => setPlanMenuOpen((o) => !o)}
                    aria-expanded={planMenuOpen}
                    aria-haspopup="listbox"
                  >
                    <span className="rh-home-dash__picker-name">{activePlan.name}</span>
                    <span className="rh-home-dash__picker-meta">
                      {typeLabel(activePlan.planType)} · {activePlan.dailyPages} ص/يوم
                    </span>
                    <ChevronDown
                      size={20}
                      strokeWidth={2}
                      className={['rh-home-dash__chevron', planMenuOpen ? 'rh-home-dash__chevron--open' : ''].join(' ')}
                    />
                  </button>
                  {planMenuOpen && (
                    <ul className="rh-home-dash__menu" role="listbox">
                      {plans.map((p) => (
                        <li key={p.id} role="option" aria-selected={p.id === activePlanId}>
                          <button
                            type="button"
                            className={[
                              'rh-home-dash__menu-item',
                              p.id === activePlanId ? 'rh-home-dash__menu-item--active' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            disabled={selectPlanLoadingId !== null}
                            aria-busy={selectPlanLoadingId === p.id || undefined}
                            onClick={() => selectPlan(p.id)}
                          >
                            {selectPlanLoadingId === p.id ? (
                              <RhIcon as={Loader2} size={20} strokeWidth={RH_ICON_STROKE} className="ui-btn__spinner" />
                            ) : null}
                            <strong>{p.name}</strong>
                            <span>
                              {typeLabel(p.planType)} — {p.totalTargetPages} صفحة
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <div className="rh-home-dash__picker rh-home-dash__picker--static">
                  <span className="rh-home-dash__picker-name">{activePlan.name}</span>
                  <span className="rh-home-dash__picker-meta">
                    {typeLabel(activePlan.planType)} · {activePlan.dailyPages} ص/يوم
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rh-home-dash__hero">
            <div className="rh-home-dash__hero-icon-wrap">
              <span className="rh-home-dash__hero-ring" aria-hidden />
              <div className="rh-home-dash__hero-icon" aria-hidden>
                <HomeDashMoodIcon mood={dashInsight.mood} />
              </div>
            </div>
            <div className="rh-home-dash__hero-body">
              <span className={`rh-home-dash__mood-badge rh-home-dash__mood-badge--${dashInsight.mood}`}>
                {MOOD_BADGE_LABEL[dashInsight.mood]}
              </span>
              {dashInsight.mood === 'rest' || dashInsight.owedPages <= 0 ? (
                <div className="rh-home-dash__metric rh-home-dash__metric--soft">
                  <span className="rh-home-dash__metric-val">{pct.toFixed(0)}%</span>
                  <span className="rh-home-dash__metric-label">إنجاز الخطة الكلي</span>
                </div>
              ) : (
                <div
                  className={[
                    'rh-home-dash__metric',
                    dashInsight.mood === 'late' ? 'rh-home-dash__metric--pulse' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="rh-home-dash__metric-val">{dashInsight.owedPages}</span>
                  <span className="rh-home-dash__metric-label">صفحة متأخرة تراكمياً</span>
                </div>
              )}
              <h2 className="rh-home-dash__title">{dashInsight.headline}</h2>
              {dashInsight.detailLines.length > 0 ? (
                <ul className="rh-home-dash__bullets">
                  {dashInsight.detailLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {(dashInsight.yesterdayApplies || dashInsight.todayApplies) && (
            <div className="rh-home-dash__timeline">
              {dashInsight.yesterdayApplies ? (
                <div className="rh-home-dash__daychip">
                  <span className="rh-home-dash__daychip-label">أمس</span>
                  <span className="rh-home-dash__daychip-val">
                    {dashInsight.yesterdayLogged} / {dashInsight.dailyPages} صفحة
                  </span>
                </div>
              ) : null}
              {dashInsight.todayApplies ? (
                <div className="rh-home-dash__daychip rh-home-dash__daychip--today">
                  <span className="rh-home-dash__daychip-label">اليوم</span>
                  <span className="rh-home-dash__daychip-val">
                    {dashInsight.todayLogged} / {dashInsight.dailyPages} صفحة
                  </span>
                </div>
              ) : null}
            </div>
          )}

          <div className="rh-home-dash__progress">
            <div className="rh-home-dash__progress-head">
              <span className="rh-home-dash__progress-pct">{pct.toFixed(1)}%</span>
              <span className="rh-home-dash__progress-label">{str('app.home_progress_label')}</span>
            </div>
            <div className="rh-home-dash__bar">
              <div className="rh-home-dash__bar-fill" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <div className="rh-home-dash__stats">
              <div>
                <span className="rh-home-dash__stat-num">
                  {progress.achievedPages} / {progress.targetPages || '—'}
                </span>
                <span className="rh-home-dash__stat-key">منجز</span>
              </div>
              <div>
                <span className="rh-home-dash__stat-num">{progress.remainingPages}</span>
                <span className="rh-home-dash__stat-key">متبقٍ</span>
              </div>
              <div>
                <span className="rh-home-dash__stat-num">{progress.reachedPage || 0}</span>
                <span className="rh-home-dash__stat-key">آخر صفحة</span>
              </div>
              <div>
                <span className="rh-home-dash__stat-num">{progress.nextFromPage}</span>
                <span className="rh-home-dash__stat-key">التالي من</span>
              </div>
            </div>
          </div>

          <p className="rh-home-dash__quote" role="note">
            «{homeMotivationQuote}»
          </p>

          <div className="rh-home-dash__actions">
            {can(PH, 'home_log_wird') && showHomeLogWirdCumulative ? (
              <button
                type="button"
                className="rh-home-dash__btn rh-home-dash__btn--primary rh-home-dash__btn--pulse-hint"
                onClick={() => setHomeWirdOpen(true)}
              >
                <NotebookPen size={22} strokeWidth={1.75} />
                تسجيل الورد السريع
              </button>
            ) : null}
            <Link className="rh-home-dash__btn rh-home-dash__btn--secondary" to={awradHref}>
              صفحة الأوراد — تفاصيل كاملة
            </Link>
            {canVisitFeelings ? (
              <Link className="rh-home-dash__btn rh-home-dash__btn--secondary" to={appPath('/app/feelings')}>
                <Bird size={20} strokeWidth={1.75} />
                مشاعر الطلاب
              </Link>
            ) : null}
            {can(PH, 'home_footer_plans_link') ? (
              <Link className="rh-home-dash__link-quiet" to={appPath('/app/plans')}>
                إدارة الخطط والافتراضية
              </Link>
            ) : null}
          </div>

          <HomeWirdModal
            open={homeWirdOpen && can(PH, 'home_log_wird') && showHomeLogWirdCumulative}
            onClose={() => setHomeWirdOpen(false)}
            activePlan={activePlan}
            awrad={awrad}
            contextUserId={contextUserId}
            user={user}
          />
          <HomeWirdCheckInModal
            open={homeWirdCheckInOpen && shouldOfferCheckIn && can(PH, 'home_log_wird')}
            onClose={() => setHomeWirdCheckInOpen(false)}
            activePlan={activePlan}
            awrad={awrad}
            contextUserId={contextUserId}
            user={user}
            onSnooze={() => {
              setCheckinSnooze(contextUserId, homeWirdStatus.todayYmd, activePlan.id)
            }}
            onDismissNo={() => {
              setCheckinDismissNo(contextUserId, homeWirdStatus.todayYmd, activePlan.id)
            }}
          />
        </section>
      ) : (
        <section className="card rh-home-dash-empty rh-home-dash-empty--app">
          <div className="rh-home-dash-empty__inner">
            <h2 className="rh-home-dash-empty__title">ابدأ بخطة ورد</h2>
            <p className="rh-home-dash-empty__text">
              عند إنشاء خطة حفظ أو مراجعة تظهر هنا لوحة تفاعلية: التأخر التراكمي، أمس واليوم، ونسبة الإنجاز.
            </p>
            <Link className="rh-home-dash__btn rh-home-dash__btn--primary" to={appPath('/app/plans')}>
              الانتقال إلى الخطط
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
