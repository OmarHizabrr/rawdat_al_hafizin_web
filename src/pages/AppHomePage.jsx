import { BookOpen, ChevronDown, ListOrdered, NotebookPen, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE_NAME, SITE_TITLE } from '../config/site.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { setUserDefaultPlanId } from '../services/userService.js'
import { useOnClickOutside } from '../ui/hooks/useOnClickOutside.js'
import { loadPlans, subscribePlans } from '../utils/plansStorage.js'
import { subscribeAwrad } from '../utils/awradStorage.js'
import { computePlanProgress } from '../utils/planProgress.js'

const PLAN_TYPES = [
  { value: 'hifz', label: 'حفظ' },
  { value: 'murajaah', label: 'مراجعة' },
  { value: 'qiraah', label: 'قراءة' },
]

function typeLabel(v) {
  return PLAN_TYPES.find((t) => t.value === v)?.label ?? v
}

export default function AppHomePage() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [awrad, setAwrad] = useState([])
  const [planMenuOpen, setPlanMenuOpen] = useState(false)
  const planMenuRef = useRef(null)

  useOnClickOutside(planMenuRef, () => setPlanMenuOpen(false), planMenuOpen)

  useEffect(() => {
    document.title = `الرئيسية — ${SITE_TITLE}`
  }, [])

  useEffect(() => {
    if (!user?.uid) return
    loadPlans(user.uid).then(setPlans)
    const unsubP = subscribePlans(user.uid, setPlans)
    const unsubA = subscribeAwrad(user.uid, setAwrad)
    return () => {
      unsubP()
      unsubA()
    }
  }, [user?.uid])

  const activePlanId = useMemo(() => {
    const def = user?.defaultPlanId
    if (def && plans.some((p) => p.id === def)) return def
    return plans[0]?.id ?? ''
  }, [user?.defaultPlanId, plans])

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
      await setUserDefaultPlanId(user, planId)
      setPlanMenuOpen(false)
    },
    [user],
  )

  const name = user?.displayName?.trim() || 'ضيفنا الكريم'
  const pct = progress?.progressPercent ?? 0

  const homeCrossItems = useMemo(() => {
    const base = [
      { to: '/app/plans', label: 'الخطط' },
      { to: '/app/awrad', label: 'كل الأوراد' },
      { to: '/app/welcome', label: 'البداية' },
      { to: '/app/settings', label: 'الإعدادات' },
    ]
    if (isAdmin(user)) base.push({ to: '/app/admin/users', label: 'المستخدمون' })
    return base
  }, [user])

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
          {SITE_NAME} معك خطوة بخطوة — تابع خطتك اليوم، وسجّل وردك بضغطة واحدة.
        </p>
        <CrossNav items={homeCrossItems} className="rh-app-home__cross" />
      </section>

      {activePlan && progress ? (
        <section className="rh-home-focus card">
          <div className="rh-home-focus__head">
            <p className="rh-home-focus__eyebrow">خطتك الآن</p>
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
                          to={`/app/awrad?plan=${encodeURIComponent(p.id)}`}
                          onClick={() => setPlanMenuOpen(false)}
                        >
                          أوراد
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
              <span className="rh-home-focus__pct-label">إنجاز الخطة</span>
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
                to={`/app/awrad?plan=${encodeURIComponent(activePlan.id)}`}
                title="تسجيل الورد"
              >
                <NotebookPen size={22} strokeWidth={1.75} />
                <span>ورد</span>
              </Link>
              <Link className="rh-home-quick-icon" to="/app/plans" title="إدارة الخطط">
                <ListOrdered size={22} strokeWidth={1.75} />
                <span>الخطط</span>
              </Link>
              <Link className="rh-home-quick-icon" to="/app/welcome" title="صفحة البداية داخل المنصة">
                <BookOpen size={22} strokeWidth={1.75} />
                <span>البداية</span>
              </Link>
            </div>
            <p className="rh-app-home__quick-extra">
              <Link to="/app/awrad">عرض صفحة الأوراد كاملة</Link>
              {' · '}
              <Link to="/app/plans">تعديل الخطط وتعيين الافتراضية</Link>
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
            <Link className="rh-home-empty-focus__link" to="/app/plans">
              الانتقال إلى الخطط
            </Link>
            <Link className="rh-home-empty-focus__link" to="/app/welcome">
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
