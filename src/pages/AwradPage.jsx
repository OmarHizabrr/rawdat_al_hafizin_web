import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { SITE_TITLE } from '../config/site.js'
import { useAuth } from '../context/useAuth.js'
import { loadPlans, subscribePlans } from '../utils/plansStorage.js'
import { addWird, deleteWird, subscribeAwrad, updateWird } from '../utils/awradStorage.js'
import { Button, Modal, NumberStepField, ScrollArea, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

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
  const [editingWirdId, setEditingWirdId] = useState(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [deletingWird, setDeletingWird] = useState(null)

  const applyPlanDefaults = useCallback((planId, srcPlans, srcAwrad = awrad) => {
    const p = srcPlans.find((x) => x.id === planId)
    const min = Math.max(1, Number(p?.dailyPages) || 1)
    const last = srcAwrad
      .filter((w) => w.planId === planId)
      .sort((a, b) => Date.parse(b.recordedAt || 0) - Date.parse(a.recordedAt || 0))[0]
    const span = Math.max(min, Number(last?.pagesCount) || min)
    const nextFrom = Math.max(1, Number(last?.toPage) || 0) + 1
    setPagesCount(span)
    setFromPage(nextFrom)
    setToPage(nextFrom + span - 1)
  }, [awrad])

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
        applyPlanDefaults(v[0].id, v, awrad)
      }
    })
    const unsubAwrad = subscribeAwrad(user.uid, setAwrad)
    return () => {
      unsubPlans()
      unsubAwrad()
    }
  }, [user?.uid, selectedPlanId, awrad, applyPlanDefaults])

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  )

  const planAwrad = useMemo(
    () => awrad.filter((w) => w.planId === selectedPlanId),
    [awrad, selectedPlanId],
  )

  const planAwradAsc = useMemo(
    () => [...planAwrad].sort((a, b) => Date.parse(a.recordedAt || 0) - Date.parse(b.recordedAt || 0)),
    [planAwrad],
  )

  const achievedPages = useMemo(
    () => planAwrad.reduce((sum, w) => sum + (Number(w.pagesCount) || 0), 0),
    [planAwrad],
  )

  const reachedPage = useMemo(() => {
    let cursor = 0
    for (const w of planAwradAsc) {
      const pages = Math.max(0, Number(w.pagesCount) || 0)
      if (w.fromPage && w.toPage) {
        cursor = Math.max(cursor, Number(w.toPage) || 0)
      } else {
        cursor += pages
      }
    }
    return cursor
  }, [planAwradAsc])

  const targetPages = selectedPlan?.totalTargetPages || 0
  const progressPercent = pct(achievedPages, targetPages)
  const remainingPages = Math.max(0, targetPages - achievedPages)

  const minDaily = Math.max(1, Number(selectedPlan?.dailyPages) || 1)
  const computedPages = mode === 'count' ? pagesCount : Math.max(0, toPage - fromPage + 1)
  const nextFromPage = reachedPage + 1
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
    if (mode === 'range' && fromPage !== nextFromPage && !editingWirdId) {
      toast.warning(`لا يمكن تكرار المدى. يجب البدء من صفحة ${nextFromPage}.`, 'تنبيه')
      return
    }
    if (computedPages < minDaily) {
      toast.warning(`الورد المسجل يجب ألا يقل عن ${minDaily} صفحات حسب الخطة.`, 'تنبيه')
      return
    }

    const resolvedFrom = mode === 'range' ? fromPage : nextFromPage
    const resolvedTo = mode === 'range' ? toPage : nextFromPage + computedPages - 1
    const payload = {
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      mode,
      pagesCount: computedPages,
      fromPage: resolvedFrom,
      toPage: resolvedTo,
    }

    if (editingWirdId) {
      await updateWird(user?.uid, editingWirdId, payload, user ?? {})
      toast.success('تم تعديل تسجيل الورد.', 'تم')
      setEditingWirdId(null)
    } else {
      await addWird(user?.uid, payload, user ?? {})
    }

    const nextAchieved = achievedPages + computedPages
    const nextPercent = pct(nextAchieved, targetPages)
    toast.success(
      `تم تسجيل ${computedPages} صفحات. وصلت إلى ${nextAchieved}/${targetPages || '—'} (${nextPercent.toFixed(1)}%).`,
      'تم تسجيل الورد',
    )
    const nextSpan = Math.max(minDaily, computedPages)
    setPagesCount(nextSpan)
    setFromPage(resolvedTo + 1)
    setToPage(resolvedTo + nextSpan)
    setIsEditorOpen(false)
  }

  const startEdit = (wird) => {
    setEditingWirdId(wird.id)
    setMode(wird.mode || 'count')
    setPagesCount(Math.max(1, Number(wird.pagesCount) || 1))
    setFromPage(Math.max(1, Number(wird.fromPage) || 1))
    setToPage(Math.max(1, Number(wird.toPage) || Math.max(1, Number(wird.pagesCount) || 1)))
    setIsEditorOpen(true)
  }

  const cancelEdit = () => {
    setEditingWirdId(null)
    setMode('count')
    applyPlanDefaults(selectedPlanId, plans)
    setIsEditorOpen(false)
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
          <h2 className="rh-settings-card__title">تسجيل الأوراد</h2>
          <p className="rh-settings-card__subtitle">يمكنك الزيادة على الورد المحدد في الخطة، مع حفظ التسلسل تلقائيًا.</p>
        </div>
        <div className="rh-awrad__actions">
          <Button
            type="button"
            onClick={() => {
              setEditingWirdId(null)
              setMode('count')
              applyPlanDefaults(selectedPlanId || plans[0]?.id || '', plans)
              setIsEditorOpen(true)
            }}
          >
            <RhIcon as={Plus} size={16} strokeWidth={RH_ICON_STROKE} />
            إضافة ورد
          </Button>
        </div>

        {selectedPlan && (
          <>
            <div className="rh-awrad__stats">
              <div className="rh-awrad__stat"><strong>اليوم:</strong> {todayLabel}</div>
              <div className="rh-awrad__stat"><strong>الحد الأدنى اليومي:</strong> {minDaily} صفحات</div>
              <div className="rh-awrad__stat"><strong>أيام الخطة:</strong> {requiredDaysLabel}</div>
              <div className="rh-awrad__stat"><strong>آخر صفحة وصلت لها:</strong> {reachedPage || 0}</div>
              <div className="rh-awrad__stat"><strong>البداية التالية:</strong> {nextFromPage}</div>
              <div className="rh-awrad__stat"><strong>المنجز:</strong> {achievedPages} / {targetPages}</div>
              <div className="rh-awrad__stat"><strong>المتبقي:</strong> {remainingPages} صفحة</div>
            </div>
            <div className="rh-awrad__progress">
              <div className="rh-awrad__progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="rh-awrad__progress-text">نسبة الإنجاز: {progressPercent.toFixed(1)}%</p>
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
                <span className="rh-awrad__item-actions">
                  <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(w)}>تعديل</Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeletingWird(w)}
                  >
                    حذف
                  </Button>
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <Modal
        open={isEditorOpen}
        title={editingWirdId ? 'تعديل تسجيل الورد' : 'إضافة ورد جديد'}
        onClose={cancelEdit}
        size="md"
      >
        <ScrollArea className="rh-plans__editor-scroll" padded>
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
              hint={`سيتم التسجيل تلقائيًا من صفحة ${nextFromPage}`}
              value={pagesCount}
              onChange={setPagesCount}
              min={minDaily}
              max={999}
            />
          ) : (
            <div className="rh-awrad__range">
              <NumberStepField
                label="من صفحة"
                value={fromPage}
                onChange={setFromPage}
                min={nextFromPage}
                max={9999}
              />
              <NumberStepField label="إلى صفحة" value={toPage} onChange={setToPage} min={1} max={9999} />
              <TextField label="المجموع المحسوب" value={String(computedPages)} readOnly />
            </div>
          )}

          <div className="rh-awrad__actions">
            <Button type="button" onClick={submitWird}>
              {!editingWirdId && <RhIcon as={Plus} size={16} strokeWidth={RH_ICON_STROKE} />}
              {editingWirdId ? 'حفظ التعديل' : 'إضافة الورد'}
            </Button>
            <Button type="button" variant="ghost" onClick={cancelEdit}>
              إلغاء
            </Button>
          </div>
        </ScrollArea>
      </Modal>

      <Modal
        open={Boolean(deletingWird)}
        title="تأكيد حذف تسجيل الورد"
        onClose={() => setDeletingWird(null)}
        size="sm"
      >
        <p className="rh-plans__warn rh-plans__warn--confirm">
          سيتم حذف هذا التسجيل نهائياً. هل أنت متأكد؟
        </p>
        <div className="rh-awrad__actions">
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              if (!deletingWird) return
              await deleteWird(user?.uid, deletingWird.id)
              if (editingWirdId === deletingWird.id) cancelEdit()
              setDeletingWird(null)
              toast.info('تم حذف تسجيل الورد.', '')
            }}
          >
            نعم، حذف
          </Button>
          <Button type="button" variant="ghost" onClick={() => setDeletingWird(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
