import { useEffect, useMemo, useState } from 'react'
import { SITE_TITLE } from '../config/site.js'
import { useAuth } from '../context/useAuth.js'
import { loadPlans, subscribePlans } from '../utils/plansStorage.js'
import { addWird, subscribeAwrad } from '../utils/awradStorage.js'
import { Button, NumberStepField, TextField, useToast } from '../ui/index.js'

function asDate(v) {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ar-SA')
}

function pct(done, total) {
  if (!total || total <= 0) return 0
  return Math.min(100, (done / total) * 100)
}

const WEEKDAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default function AwradPage() {
  const { user } = useAuth()
  const toast = useToast()

  const [plans, setPlans] = useState([])
  const [awrad, setAwrad] = useState([])
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [mode, setMode] = useState('count') // count | range
  const [pagesCount, setPagesCount] = useState(1)
  const [fromPage, setFromPage] = useState(1)
  const [toPage, setToPage] = useState(1)

  const applyPlanDefaults = (planId, srcPlans) => {
    const p = srcPlans.find((x) => x.id === planId)
    const min = Math.max(1, Number(p?.dailyPages) || 1)
    setPagesCount(min)
    setFromPage(1)
    setToPage(min)
  }

  useEffect(() => {
    document.title = `الأوراد — ${SITE_TITLE}`
  }, [])

  useEffect(() => {
    if (!user?.uid) return
    loadPlans(user.uid).then((v) => {
      setPlans(v)
      if (v[0]?.id) {
        setSelectedPlanId((x) => {
          const next = x || v[0].id
          if (!x) applyPlanDefaults(next, v)
          return next
        })
      }
    })
    const unsubPlans = subscribePlans(user.uid, (v) => {
      setPlans(v)
      if (!selectedPlanId && v[0]?.id) {
        setSelectedPlanId(v[0].id)
        applyPlanDefaults(v[0].id, v)
      }
    })
    const unsubAwrad = subscribeAwrad(user.uid, setAwrad)
    return () => {
      unsubPlans()
      unsubAwrad()
    }
  }, [user?.uid, selectedPlanId])

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  )

  const planAwrad = useMemo(
    () => awrad.filter((w) => w.planId === selectedPlanId),
    [awrad, selectedPlanId],
  )

  const achievedPages = useMemo(
    () => planAwrad.reduce((sum, w) => sum + (Number(w.pagesCount) || 0), 0),
    [planAwrad],
  )

  const targetPages = selectedPlan?.totalTargetPages || 0
  const progressPercent = pct(achievedPages, targetPages)
  const remainingPages = Math.max(0, targetPages - achievedPages)

  const minDaily = Math.max(1, Number(selectedPlan?.dailyPages) || 1)
  const computedPages = mode === 'count' ? pagesCount : Math.max(0, toPage - fromPage + 1)
  const todayIdx = new Date().getDay()
  const todayLabel = WEEKDAY_AR[todayIdx]
  const requiredDaysLabel =
    selectedPlan?.useWeekdayFilter && selectedPlan?.weekdayLabels
      ? selectedPlan.weekdayLabels
      : 'كل الأيام'

  const submitWird = async () => {
    if (!selectedPlan) {
      toast.warning('اختر خطة أولاً.', 'تنبيه')
      return
    }
    if (mode === 'range' && toPage < fromPage) {
      toast.warning('صفحة النهاية يجب أن تكون بعد صفحة البداية.', 'تنبيه')
      return
    }
    if (computedPages < minDaily) {
      toast.warning(`الورد المسجل يجب ألا يقل عن ${minDaily} صفحات حسب الخطة.`, 'تنبيه')
      return
    }

    await addWird(
      user?.uid,
      {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        mode,
        pagesCount: computedPages,
        fromPage: mode === 'range' ? fromPage : null,
        toPage: mode === 'range' ? toPage : null,
      },
      user ?? {},
    )

    const nextAchieved = achievedPages + computedPages
    const nextPercent = pct(nextAchieved, targetPages)
    toast.success(
      `تم تسجيل ${computedPages} صفحات. وصلت إلى ${nextAchieved}/${targetPages || '—'} (${nextPercent.toFixed(1)}%).`,
      'تم تسجيل الورد',
    )
  }

  return (
    <div className="rh-awrad">
      <header className="rh-awrad__hero card">
        <h1 className="rh-awrad__title">الأوراد حسب الخطط</h1>
        <p className="rh-awrad__desc">
          سجّل وِردك يوميًا وفق خطتك: بعدد صفحات مباشر أو من صفحة إلى صفحة، مع تتبع نسبة الإنجاز وما تحقق.
        </p>
      </header>

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">اختيار الخطة والتسجيل</h2>
          <p className="rh-settings-card__subtitle">يمكنك الزيادة على الورد المحدد في الخطة، لكن لا يمكن التسجيل بأقل منه.</p>
        </div>

        <div className="ui-field">
          <label className="ui-field__label" htmlFor="wird-plan">الخطة</label>
          <select
            id="wird-plan"
            className="ui-input"
            value={selectedPlanId}
            onChange={(e) => {
              const nextId = e.target.value
              setSelectedPlanId(nextId)
              applyPlanDefaults(nextId, plans)
            }}
          >
            <option value="">اختر خطة...</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {selectedPlan && (
          <>
            <div className="rh-awrad__stats">
              <div className="rh-awrad__stat"><strong>اليوم:</strong> {todayLabel}</div>
              <div className="rh-awrad__stat"><strong>الحد الأدنى اليومي:</strong> {minDaily} صفحات</div>
              <div className="rh-awrad__stat"><strong>أيام الخطة:</strong> {requiredDaysLabel}</div>
              <div className="rh-awrad__stat"><strong>المنجز:</strong> {achievedPages} / {targetPages}</div>
              <div className="rh-awrad__stat"><strong>المتبقي:</strong> {remainingPages} صفحة</div>
            </div>

            <div className="rh-awrad__progress">
              <div className="rh-awrad__progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="rh-awrad__progress-text">نسبة الإنجاز: {progressPercent.toFixed(1)}%</p>

            <div className="rh-segment rh-awrad__mode">
              <button
                type="button"
                className={['rh-segment__btn', mode === 'count' ? 'rh-segment__btn--active' : ''].join(' ')}
                onClick={() => setMode('count')}
              >
                <span className="rh-segment__label">تحديد عدد الصفحات</span>
              </button>
              <button
                type="button"
                className={['rh-segment__btn', mode === 'range' ? 'rh-segment__btn--active' : ''].join(' ')}
                onClick={() => setMode('range')}
              >
                <span className="rh-segment__label">من صفحة إلى صفحة</span>
              </button>
            </div>

            {mode === 'count' ? (
              <NumberStepField
                label="عدد الصفحات"
                value={pagesCount}
                onChange={setPagesCount}
                min={minDaily}
                max={999}
              />
            ) : (
              <div className="rh-awrad__range">
                <NumberStepField label="من صفحة" value={fromPage} onChange={setFromPage} min={1} max={9999} />
                <NumberStepField label="إلى صفحة" value={toPage} onChange={setToPage} min={1} max={9999} />
                <TextField label="المجموع المحسوب" value={String(computedPages)} readOnly />
              </div>
            )}

            <div className="rh-awrad__actions">
              <Button type="button" onClick={submitWird}>تسجيل الورد</Button>
            </div>
          </>
        )}
      </section>

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">سجل الأوراد</h2>
          <p className="rh-settings-card__subtitle">آخر ما تم تسجيله على الخطة الحالية.</p>
        </div>
        <ul className="rh-awrad__list">
          {planAwrad.length === 0 ? (
            <li className="rh-awrad__empty">لا يوجد تسجيل بعد.</li>
          ) : (
            planAwrad.map((w) => (
              <li key={w.id} className="rh-awrad__item">
                <strong>{w.pagesCount} صفحات</strong>
                <span>{asDate(w.recordedAt)}</span>
                {w.mode === 'range' && w.fromPage && w.toPage && (
                  <span>من {w.fromPage} إلى {w.toPage}</span>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
