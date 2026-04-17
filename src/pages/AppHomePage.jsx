import { BookOpen, ChevronDown, ListOrdered, NotebookPen, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useSiteContent } from '../context/useSiteContent.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { firestoreApi } from '../services/firestoreApi.js'
import { setUserDefaultPlanId } from '../services/userService.js'
import { useOnClickOutside } from '../ui/hooks/useOnClickOutside.js'
import { loadPlans, subscribePlans } from '../utils/plansStorage.js'
import { subscribeAwrad } from '../utils/awradStorage.js'
import { computePlanProgress } from '../utils/planProgress.js'
import { getImpersonateUid, withImpersonationQuery } from '../utils/impersonation.js'

export default function AppHomePage() {
  const { user } = useAuth()
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
  const planMenuRef = useRef(null)

  useOnClickOutside(planMenuRef, () => setPlanMenuOpen(false), planMenuOpen)

  useEffect(() => {
    document.title = actingAsUser
      ? `الرئيسية (نيابة) — ${branding.siteTitle}`
      : `الرئيسية — ${branding.siteTitle}`
  }, [actingAsUser, branding.siteTitle])

  useEffect(() => {
    if (!actingAsUser || !contextUserId) {
      setSubjectProfile(null)
      return undefined
    }
    let cancelled = false
    firestoreApi.getData(firestoreApi.getUserDoc(contextUserId)).then((d) => {
      if (!cancelled) setSubjectProfile(d ? { ...d } : {})
    })
    return () => {
      cancelled = true
    }
  }, [actingAsUser, contextUserId])

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
    const def = actingAsUser ? subjectProfile?.defaultPlanId : user?.defaultPlanId
    if (def && plans.some((p) => p.id === def)) return def
    return plans[0]?.id ?? ''
  }, [actingAsUser, subjectProfile?.defaultPlanId, user?.defaultPlanId, plans])

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
      if (!user || !planId) return
      await setUserDefaultPlanId(user, planId, { targetUid: actingAsUser ? contextUserId : undefined })
      if (actingAsUser) {
        setSubjectProfile((p) => ({ ...(p || {}), defaultPlanId: planId }))
      }
      setPlanMenuOpen(false)
    },
    [user, actingAsUser, contextUserId],
  )

  const name = actingAsUser
    ? subjectProfile?.displayName?.trim() || str('app.home_greeting_user_fallback')
    : user?.displayName?.trim() || str('app.home_greeting_fallback')
  const pct = progress?.progressPercent ?? 0

  const homeCrossItems = useMemo(() => {
    const base = [
      { to: '/app/plans', label: str('app.home_cross_plans') },
      { to: '/app/awrad', label: str('app.home_cross_awrad') },
      { to: '/app/welcome', label: str('app.home_cross_welcome') },
      { to: '/app/settings', label: str('app.home_cross_settings') },
    ]
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
      base.push({ to: '/app/admin/users', label: str('app.home_cross_users') })
    }
    return base
  }, [user, str])

  return (
    <div className="rh-app-home">
      <section className="card rh-app-home__hero">
        <div className="rh-app-home__hero-top">
          <h2>مرحباً، {name}</h2>
          <span className="rh-app-home__sparkle" aria-hidden>
            <Sparkles size={22} strokeWidth={1.75} />
          </span>
        </div>
        <p className="lead rh-app-home__lead">
          {actingAsUser ? str('app.home_lead_impersonate') : str('app.home_lead_normal')}
        </p>
        {actingAsUser && (
          <p className="rh-plans__admin-banner rh-app-home__impersonation">
            <Link to="/app/admin/users">{str('app.home_impersonation_users')}</Link>
            {' · '}
            <Link to={`/app/plans?uid=${encodeURIComponent(contextUserId)}`}>{str('app.home_impersonation_plans')}</Link>
            {' · '}
            <Link to={`/app/awrad?uid=${encodeURIComponent(contextUserId)}`}>{str('app.home_impersonation_awrad')}</Link>
            {' · '}
            <Link to="/app">{str('app.home_impersonation_my_account')}</Link>
          </p>
        )}
        <CrossNav items={homeCrossItems} className="rh-app-home__cross" />
      </section>

      {activePlan && progress ? (
        <section className="rh-home-focus card">
          <div className="rh-home-focus__head">
            <p className="rh-home-focus__eyebrow">{actingAsUser ? str('app.home_plan_now_other') : str('app.home_plan_now_you')}</p>
            <div className="rh-home-focus__picker-wrap" ref={planMenuRef}>
              <button
                type="button"
                className="rh-home-focus__picker-trigger"
                onClick={() => setPlanMenuOpen((o) => !o)}
                aria-expanded={planMenuOpen}
                aria-haspopup="listbox"
              >
                <span className="rh-home-focus__picker-title">{activePlan.name}</span>
                <span className="rh-home-focus__picker-meta">
                  {typeLabel(activePlan.planType)} · {activePlan.dailyPages} ص/يوم
                </span>
                <ChevronDown
                  size={20}
                  strokeWidth={2}
                  className={['rh-home-focus__chevron', planMenuOpen ? 'rh-home-focus__chevron--open' : ''].join(' ')}
                />
              </button>
              {planMenuOpen && (
                <ul className="rh-home-focus__menu" role="listbox">
                  {plans.map((p) => (
                    <li key={p.id} role="option" aria-selected={p.id === activePlanId}>
                      <div className="rh-home-focus__menu-row">
                        <button
                          type="button"
                          className={[
                            'rh-home-focus__menu-item',
                            p.id === activePlanId ? 'rh-home-focus__menu-item--active' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => selectPlan(p.id)}
                        >
                          <strong>{p.name}</strong>
                          <span>
                            {typeLabel(p.planType)} — {p.totalTargetPages} صفحة
                          </span>
                        </button>
                        <Link
                          className="rh-home-focus__menu-peek"
                          to={appPath(`/app/awrad?plan=${encodeURIComponent(p.id)}`)}
                          onClick={() => setPlanMenuOpen(false)}
                        >
                          {str('app.home_menu_awrad_link')}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rh-home-focus__progress-block">
            <div className="rh-home-focus__progress-top">
              <span className="rh-home-focus__pct">{pct.toFixed(1)}%</span>
              <span className="rh-home-focus__pct-label">{str('app.home_progress_label')}</span>
            </div>
            <div className="rh-home-focus__bar">
              <div className="rh-home-focus__bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="rh-home-focus__stats">
              <div>
                <span className="rh-home-focus__stat-val">
                  {progress.achievedPages} / {progress.targetPages || '—'}
                </span>
                <span className="rh-home-focus__stat-key">صفحات منجزة</span>
              </div>
              <div>
                <span className="rh-home-focus__stat-val">{progress.remainingPages}</span>
                <span className="rh-home-focus__stat-key">متبقية</span>
              </div>
              <div>
                <span className="rh-home-focus__stat-val">{progress.reachedPage || 0}</span>
                <span className="rh-home-focus__stat-key">آخر صفحة</span>
              </div>
              <div>
                <span className="rh-home-focus__stat-val">{progress.nextFromPage}</span>
                <span className="rh-home-focus__stat-key">ابدأ التالي من</span>
              </div>
            </div>
          </div>

          <div className="rh-home-focus__quick">
            <p className="rh-home-focus__quick-label">سجّل اليوم</p>
            <div className="rh-home-focus__quick-btns">
              <Link
                className="rh-home-quick-icon"
                to={appPath(`/app/awrad?plan=${encodeURIComponent(activePlan.id)}`)}
                title="تسجيل الورد"
              >
                <NotebookPen size={22} strokeWidth={1.75} />
                <span>ورد</span>
              </Link>
              <Link className="rh-home-quick-icon" to={appPath('/app/plans')} title="إدارة الخطط">
                <ListOrdered size={22} strokeWidth={1.75} />
                <span>الخطط</span>
              </Link>
              <Link className="rh-home-quick-icon" to={appPath('/app/welcome')} title="صفحة البداية داخل المنصة">
                <BookOpen size={22} strokeWidth={1.75} />
                <span>البداية</span>
              </Link>
            </div>
            <p className="rh-app-home__quick-extra">
              <Link to={appPath('/app/awrad')}>عرض صفحة الأوراد كاملة</Link>
              {' · '}
              <Link to={appPath('/app/plans')}>تعديل الخطط وتعيين الافتراضية</Link>
            </p>
          </div>
        </section>
      ) : (
        <section className="card rh-home-empty-focus">
          <h3 className="rh-home-empty-focus__title">ابدأ بخطة</h3>
          <p className="rh-home-empty-focus__text">
            أنشئ خطة حفظ أو مراجعة لتظهر هنا نسبة الإنجاز والورد اليومي، ويمكنك تعيين خطة افتراضية من صفحة
            الخطط.
          </p>
          <div className="rh-home-empty-focus__links">
            <Link className="rh-home-empty-focus__link" to={appPath('/app/plans')}>
              الانتقال إلى الخطط
            </Link>
            <Link className="rh-home-empty-focus__link" to={appPath('/app/welcome')}>
              صفحة البداية
            </Link>
          </div>
          <CrossNav items={homeCrossItems} className="rh-app-home__cross rh-app-home__cross--empty" />
        </section>
      )}

      <section className="card rh-app-home__hint">
        <h3 className="rh-app-home__hint-title">لماذا الصفحة الرئيسية؟</h3>
        <p className="lead rh-app-home__hint-text">
          لحظة سريعة تذكّرك بما أنجزت وتدفعك للمتابعة — غيّر الخطة المعروضة من القائمة فوق متى شئت؛ الخطة
          الافتراضية تُحدَّد من صفحة «الخطط» بنجمة الرئيسية. من قائمة الخطط أو أيقونة «أوراد» تنتقل مباشرة
          لصفحة الأوراد لتلك الخطة دون فقدان الترابط بين الصفحات.
        </p>
      </section>
    </div>
  )
}
