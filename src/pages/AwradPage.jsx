import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useSiteContent } from '../context/useSiteContent.js'
import { PERMISSION_PAGE_IDS } from '../config/permissionRegistry.js'
import { isAdmin } from '../config/roles.js'
import { useAuth } from '../context/useAuth.js'
import { usePermissions } from '../context/usePermissions.js'
import { loadPlans, subscribePlans } from '../utils/plansStorage.js'
import { addWird, deleteWird, subscribeAwrad, updateWird } from '../utils/awradStorage.js'
import { clampProgressPercent, computePlanProgress } from '../utils/planProgress.js'
import {
  DAILY_LOGGING_STRICT_CARRYOVER,
  assertValidRecordingYmd,
  getPlanDailyLoggingMode,
  isoFromLocalYmd,
  localYmd,
  maxAdditionalPagesForRecordingDay,
  minPagesPerWirdEntry,
  planAllowsBelowDailyPages,
  planAllowsCustomRecordingDate,
  planScheduleStartYmd,
  recordingYmdForEditorQuota,
  ymdFromRecordedAt,
} from '../utils/planDailyQuota.js'
import { CrossNav } from '../components/CrossNav.jsx'
import { Button, DateField, Modal, NumberStepField, ScrollArea, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

function asDate(v) {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ar-SA')
}

const WEEKDAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const PA = PERMISSION_PAGE_IDS.awrad

export default function AwradPage() {
  const { user } = useAuth()
  const { can } = usePermissions()
  const { branding, str } = useSiteContent()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planFromUrl = searchParams.get('plan')
  const uidFromUrl = searchParams.get('uid')?.trim() || ''
  const clearedDeepLinkRef = useRef(false)

  const contextUserId = useMemo(() => {
    if (!user?.uid) return ''
    if (uidFromUrl && isAdmin(user)) return uidFromUrl
    return user.uid
  }, [user, uidFromUrl])

  const actingAsUser = Boolean(user?.uid && contextUserId && contextUserId !== user.uid)
  const viewOnly = Boolean(actingAsUser && !isAdmin(user))

  const awradCrossItems = useMemo(() => {
    const base = [
      { to: '/app', label: str('layout.nav_home') },
      { to: '/app/plans', label: str('layout.nav_plans') },
      { to: '/app/welcome', label: str('layout.nav_welcome') },
      { to: '/app/settings', label: str('layout.nav_settings') },
    ]
    if (isAdmin(user)) {
      base.push({ to: '/app/admin', label: str('layout.nav_dashboard') })
      base.push({ to: '/app/admin/users', label: str('layout.nav_users') })
    }
    return base
  }, [user, str])

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
  const [formRecordingYmd, setFormRecordingYmd] = useState(() => localYmd())
  const [wirdSubmitting, setWirdSubmitting] = useState(false)
  const [wirdDeleteSubmitting, setWirdDeleteSubmitting] = useState(false)

  const applyPlanDefaults = useCallback((planId, srcPlans, srcAwrad = awrad, opts = {}) => {
    const p = srcPlans.find((x) => x.id === planId)
    const min = Math.max(1, Number(p?.dailyPages) || 1)
    const strict = getPlanDailyLoggingMode(p) === DAILY_LOGGING_STRICT_CARRYOVER
    const last = srcAwrad
      .filter((w) => w.planId === planId)
      .sort((a, b) => Date.parse(b.recordedAt || 0) - Date.parse(a.recordedAt || 0))[0]
    const recordingYmd = recordingYmdForEditorQuota(p, opts.formRecordingYmd)
    const maxAdd = strict
      ? maxAdditionalPagesForRecordingDay(p, srcAwrad, recordingYmd, {})
      : 999999
    const minP = minPagesPerWirdEntry(p, {
      strictCarryover: strict,
      maxExtra: maxAdd,
      minDaily: min,
    })
    const baseSpan = Math.max(min, Number(last?.pagesCount) || min)
    const span = strict
      ? maxAdd > 0
        ? Math.max(minP, Math.min(Math.max(min, baseSpan), maxAdd))
        : 1
      : planAllowsBelowDailyPages(p)
        ? Math.max(1, Number(last?.pagesCount) || min)
        : Math.max(minP, baseSpan)
    const nextFrom = Math.max(1, Number(last?.toPage) || 0) + 1
    setPagesCount(span)
    setFromPage(nextFrom)
    setToPage(nextFrom + span - 1)
  }, [awrad])

  useEffect(() => {
    if (viewOnly) document.title = `أوراد المستخدم — ${branding.siteTitle}`
    else if (actingAsUser) document.title = `الأوراد (نيابة) — ${branding.siteTitle}`
    else document.title = `الأوراد — ${branding.siteTitle}`
  }, [viewOnly, actingAsUser, branding.siteTitle])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSelectedPlanId('')
      setAwrad([])
    }, 0)
    return () => window.clearTimeout(t)
  }, [contextUserId])

  useEffect(() => {
    clearedDeepLinkRef.current = false
  }, [planFromUrl, contextUserId])

  useEffect(() => {
    if (!planFromUrl || !plans.length) return
    if (!plans.some((p) => p.id === planFromUrl)) return
    const id = planFromUrl
    const t = window.setTimeout(() => {
      setSelectedPlanId(id)
      const y = localYmd()
      setFormRecordingYmd(y)
      applyPlanDefaults(id, plans, awrad, { formRecordingYmd: y })
      if (!clearedDeepLinkRef.current) {
        clearedDeepLinkRef.current = true
        const next = new URLSearchParams()
        if (uidFromUrl && isAdmin(user)) next.set('uid', uidFromUrl)
        const s = next.toString()
        navigate({ pathname: '/app/awrad', search: s ? `?${s}` : '' }, { replace: true })
      }
    }, 0)
    return () => window.clearTimeout(t)
  }, [planFromUrl, plans, awrad, applyPlanDefaults, navigate, uidFromUrl, user])

  useEffect(() => {
    if (!contextUserId) return
    loadPlans(contextUserId).then((v) => {
      setPlans(v)
      const initialId =
        planFromUrl && v.some((p) => p.id === planFromUrl) ? planFromUrl : v[0]?.id || ''
      if (initialId) {
        setSelectedPlanId((x) => {
          const next = x || initialId
          if (!x) {
            const y = localYmd()
            setFormRecordingYmd(y)
            applyPlanDefaults(next, v, undefined, { formRecordingYmd: y })
          }
          return next
        })
      }
    })
    const unsubPlans = subscribePlans(contextUserId, (v) => {
      setPlans(v)
      const pick =
        planFromUrl && v.some((p) => p.id === planFromUrl) ? planFromUrl : v[0]?.id || ''
      if (!selectedPlanId && pick) {
        setSelectedPlanId(pick)
        const y = localYmd()
        setFormRecordingYmd(y)
        applyPlanDefaults(pick, v, awrad, { formRecordingYmd: y })
      }
    })
    const unsubAwrad = subscribeAwrad(contextUserId, setAwrad)
    return () => {
      unsubPlans()
      unsubAwrad()
    }
  }, [contextUserId, selectedPlanId, awrad, applyPlanDefaults, planFromUrl])

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  )

  const planAwrad = useMemo(
    () => awrad.filter((w) => w.planId === selectedPlanId),
    [awrad, selectedPlanId],
  )

  const progress = useMemo(
    () => computePlanProgress(selectedPlan, awrad),
    [selectedPlan, awrad],
  )

  const achievedPages = progress?.achievedPages ?? 0
  const reachedPage = progress?.reachedPage ?? 0
  const targetPages = progress?.targetPages ?? 0
  const progressPercent = progress?.progressPercent ?? 0
  const remainingPages = progress?.remainingPages ?? 0
  const nextFromPage = progress?.nextFromPage ?? 1
  const minDaily = progress?.minDaily ?? 1
  const customDateOn = Boolean(selectedPlan && planAllowsCustomRecordingDate(selectedPlan))
  const allowBelowDaily = Boolean(selectedPlan && planAllowsBelowDailyPages(selectedPlan))
  const quotaYmd = useMemo(() => {
    if (!isEditorOpen || !selectedPlan) return localYmd()
    return recordingYmdForEditorQuota(selectedPlan, formRecordingYmd)
  }, [isEditorOpen, selectedPlan, formRecordingYmd])
  const strictQuota =
    selectedPlan && getPlanDailyLoggingMode(selectedPlan) === DAILY_LOGGING_STRICT_CARRYOVER
  const maxPagesToday = useMemo(
    () =>
      strictQuota && selectedPlan
        ? maxAdditionalPagesForRecordingDay(selectedPlan, awrad, quotaYmd, {
            excludeWirdId: editingWirdId || undefined,
          })
        : 999,
    [strictQuota, selectedPlan, awrad, editingWirdId, quotaYmd],
  )

  const minPagesForEntry = useMemo(
    () =>
      selectedPlan
        ? minPagesPerWirdEntry(selectedPlan, {
            strictCarryover: strictQuota,
            maxExtra: maxPagesToday,
            minDaily,
          })
        : 1,
    [selectedPlan, strictQuota, maxPagesToday, minDaily],
  )

  const rangeFromMin = editingWirdId ? 1 : nextFromPage
  const rangeToMax = useMemo(() => {
    if (!strictQuota || maxPagesToday <= 0) return 9999
    return Math.max(fromPage, fromPage + maxPagesToday - 1)
  }, [strictQuota, maxPagesToday, fromPage])

  const computedPages = mode === 'count' ? pagesCount : Math.max(0, toPage - fromPage + 1)
  const todayIdx = new Date().getDay()
  const todayLabel = WEEKDAY_AR[todayIdx]
  const requiredDaysLabel =
    selectedPlan?.useWeekdayFilter && selectedPlan?.weekdayLabels
      ? selectedPlan.weekdayLabels
      : 'كل الأيام'

  const submitWird = async () => {
    if (viewOnly) {
      toast.info('وضع العرض فقط — سجّل الورد من حساب المستخدم نفسه.', '')
      return
    }
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
    const dateCheck = assertValidRecordingYmd(selectedPlan, formRecordingYmd)
    if (!dateCheck.ok) {
      toast.warning(dateCheck.message, 'تنبيه')
      return
    }
    const recordingYmd = dateCheck.ymd
    const maxExtra = maxAdditionalPagesForRecordingDay(selectedPlan, awrad, recordingYmd, {
      excludeWirdId: editingWirdId || undefined,
    })
    if (strictQuota && computedPages > maxExtra) {
      toast.warning(
        maxExtra <= 0
          ? 'لا يتبقّى لك ورد تراكمي مسموح بتسجيله في التاريخ المحدد وفق هذه الخطة (أو أنك أتممت المطلوب حتى ذلك اليوم).'
          : `الحد الأقصى المسموح في التاريخ المحدد وفق الورد التراكمي هو ${maxExtra} صفحة (يشمل تعويض الأيام الفائتة).`,
        'تنبيه',
      )
      return
    }
    if (computedPages < 1) {
      toast.warning('أدخل عدد صفحات صحيح (١ على الأقل).', 'تنبيه')
      return
    }
    const minP = minPagesPerWirdEntry(selectedPlan, {
      strictCarryover: strictQuota,
      maxExtra,
      minDaily,
    })
    if (computedPages < minP) {
      toast.warning(
        `عدد الصفحات في الدفعة يجب ألا يقل عن ${minP} وفق هذه الخطة${
          strictQuota ? ` (المسموح تراكمياً لهذا التاريخ ${maxExtra} صفحة كحدّ أقصى).` : ` (الورد المقرر ${minDaily} صفحة).`
        }`,
        'تنبيه',
      )
      return
    }

    setWirdSubmitting(true)
    try {
      const resolvedFrom = mode === 'range' ? fromPage : nextFromPage
      const resolvedTo = mode === 'range' ? toPage : nextFromPage + computedPages - 1
      const allowCust = planAllowsCustomRecordingDate(selectedPlan)
      const recordedAtIso = allowCust ? isoFromLocalYmd(recordingYmd) : undefined
      const payload = {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        mode,
        pagesCount: computedPages,
        fromPage: resolvedFrom,
        toPage: resolvedTo,
        ...(allowCust ? { recordedAt: recordedAtIso } : {}),
      }
      const recordOpts = { allowCustomRecordedAt: allowCust }

      const editId = editingWirdId
      if (editId) {
        await updateWird(contextUserId, editId, payload, user ?? {}, recordOpts)
      } else {
        await addWird(contextUserId, payload, user ?? {}, recordOpts)
      }

      const prevPages = editId
        ? Math.max(0, Number(awrad.find((w) => w.id === editId)?.pagesCount) || 0)
        : 0
      const nextAchieved = editId ? achievedPages - prevPages + computedPages : achievedPages + computedPages
      const nextPercent = clampProgressPercent(nextAchieved, targetPages)
      toast.success(
        editId
          ? `تم تحديث التسجيل إلى ${computedPages} صفحة. وصلت إلى ${nextAchieved}/${targetPages || '—'} (${nextPercent.toFixed(1)}%).`
          : `تم تسجيل ${computedPages} صفحات. وصلت إلى ${nextAchieved}/${targetPages || '—'} (${nextPercent.toFixed(1)}%).`,
        editId ? 'تم التعديل' : 'تم تسجيل الورد',
      )
      const optimisticAwrad = editId
        ? awrad.map((w) =>
            w.id === editId
              ? {
                  ...w,
                  ...payload,
                  recordedAt:
                    allowCust && recordedAtIso ? recordedAtIso : w.recordedAt,
                }
              : w,
          )
        : [
            {
              id: '__local_pending__',
              planId: selectedPlan.id,
              planName: selectedPlan.name,
              mode: payload.mode,
              pagesCount: payload.pagesCount,
              fromPage: payload.fromPage,
              toPage: payload.toPage,
              recordedAt:
                allowCust && recordedAtIso ? recordedAtIso : new Date().toISOString(),
            },
            ...awrad,
          ]
      setEditingWirdId(null)
      const yNext = localYmd()
      setFormRecordingYmd(yNext)
      applyPlanDefaults(selectedPlan.id, plans, optimisticAwrad, { formRecordingYmd: yNext })
      setIsEditorOpen(false)
    } catch {
      toast.warning('تعذّر حفظ الورد. تحقق من الاتصال وحاول مرة أخرى.', 'تنبيه')
    } finally {
      setWirdSubmitting(false)
    }
  }

  const startEdit = (wird) => {
    const planRow = plans.find((x) => x.id === wird.planId) ?? selectedPlan
    const nextYmd = planAllowsCustomRecordingDate(planRow)
      ? ymdFromRecordedAt(wird.recordedAt) || localYmd()
      : localYmd()
    setFormRecordingYmd(nextYmd)
    setEditingWirdId(wird.id)
    setMode(wird.mode || 'count')
    setPagesCount(Math.max(1, Number(wird.pagesCount) || 1))
    setFromPage(Math.max(1, Number(wird.fromPage) || 1))
    setToPage(Math.max(1, Number(wird.toPage) || Math.max(1, Number(wird.pagesCount) || 1)))
    setIsEditorOpen(true)
    queueMicrotask(() => {
      applyPlanDefaults(wird.planId, plans, awrad, { formRecordingYmd: nextYmd })
    })
  }

  const cancelEdit = () => {
    setEditingWirdId(null)
    setMode('count')
    const y = localYmd()
    setFormRecordingYmd(y)
    applyPlanDefaults(selectedPlanId, plans, awrad, { formRecordingYmd: y })
    setIsEditorOpen(false)
  }

  return (
    <div className="rh-awrad">
      <header className="rh-awrad__hero card">
        <h1 className="rh-awrad__title">
          {viewOnly ? 'أوراد المستخدم (عرض)' : actingAsUser ? 'الأوراد' : 'الأوراد حسب الخطط'}
        </h1>
        <p className="rh-awrad__desc">
          {viewOnly
            ? 'تعرض بيانات المستخدم المحدد للمشرف. التسجيل والتعديل يتم من حسابه.'
            : actingAsUser
              ? 'تسجيل وتعديل وحذف الأوراد يُحفَظ على حساب هذا المستخدم (أنت مسجّل كمشرف).'
              : 'سجّل وِردك يوميًا وفق خطتك: بعدد صفحات مباشر أو من صفحة إلى صفحة، مع تتبع نسبة الإنجاز وما تحقق.'}
        </p>
        {actingAsUser && isAdmin(user) && (
          <p className="rh-plans__admin-banner">
            <Link to="/app/admin/users">← المستخدمون</Link>
            {' · '}
            <Link to={`/app?uid=${encodeURIComponent(contextUserId)}`}>رئيسيته</Link>
            {' · '}
            <Link to={`/app/plans?uid=${encodeURIComponent(contextUserId)}`}>خططه</Link>
            {' · '}
            <Link to="/app/awrad">أورادي</Link>
          </p>
        )}
        {viewOnly ? (
          <p className="rh-awrad__view-links">
            <Link to="/app/admin/users">← المستخدمون</Link>
            {' · '}
            <Link to={`/app/plans?uid=${encodeURIComponent(contextUserId)}`}>خطط هذا المستخدم</Link>
            {' · '}
            <Link to="/app/awrad">وردي (حسابي)</Link>
          </p>
        ) : (
          <CrossNav items={awradCrossItems} className="rh-awrad__cross" />
        )}
      </header>

      <section className="rh-settings-card">
        <div className="rh-settings-card__head">
          <h2 className="rh-settings-card__title">تسجيل الأوراد</h2>
          <p className="rh-settings-card__subtitle">
            {viewOnly
              ? 'عرض التقدّم والسجل فقط.'
              : actingAsUser
                ? 'إضافة وتعديل وحذف الأوراد لهذا المستخدم من حساب المشرف.'
                : strictQuota
                  ? `الخطة على وضع تراكمي: لا يتجاوز تسجيلك ما يبقّى عليك من الورد تراكمياً${
                      customDateOn ? ' (يمكن اختيار يوم التسجيل من النموذج عند تفعيل الخطة لهذا الخيار).' : ' حتى اليوم المحلي (مع تعويض أيام فائتة).'
                    }${!allowBelowDaily ? ' الحد الأدنى لكل دفعة هو الورد اليومي إن سمح المسموح بذلك.' : ''}`
                  : customDateOn
                    ? 'يمكنك تجاوز الورد اليومي أو اختيار تاريخ تسجيل مختلف عند فتح النموذج، مع حفظ التسلسل تلقائيًا.'
                    : `يمكنك تجاوز الورد اليومي المحدد في الخطة إن رغبت، مع حفظ التسلسل تلقائيًا.${
                        !allowBelowDaily ? ` الحد الأدنى لكل دفعة ${minDaily} صفحة.` : ''
                      }`}
          </p>
        </div>
        {!viewOnly && can(PA, 'wird_create') && (
          <div className="rh-awrad__actions">
            <Button
              type="button"
              onClick={() => {
                setEditingWirdId(null)
                setMode('count')
                const y = localYmd()
                setFormRecordingYmd(y)
                applyPlanDefaults(selectedPlanId || plans[0]?.id || '', plans, awrad, {
                  formRecordingYmd: y,
                })
                setIsEditorOpen(true)
              }}
            >
              <RhIcon as={Plus} size={16} strokeWidth={RH_ICON_STROKE} />
              إضافة ورد
            </Button>
          </div>
        )}

        {selectedPlan && (
          <>
            <div className="rh-awrad__stats">
              <div className="rh-awrad__stat"><strong>اليوم:</strong> {todayLabel}</div>
              <div className="rh-awrad__stat"><strong>الورد المقرر يوميًا:</strong> {minDaily} صفحات</div>
              {strictQuota && (
                <div className="rh-awrad__stat">
                  <strong>الحد الأقصى المسموح (تراكمي):</strong>{' '}
                  {maxPagesToday <= 0 ? 'لا يتبقّى ورد لهذا اليوم' : `${maxPagesToday} صفحة`}
                  {isEditorOpen && customDateOn && ` — تاريخ النموذج: ${quotaYmd}`}
                  {(!isEditorOpen || !customDateOn) && ' — بحسب اليوم المحلي'}
                </div>
              )}
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
                  {!viewOnly && can(PA, 'wird_edit') && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(w)}>
                      تعديل
                    </Button>
                  )}
                  {!viewOnly && can(PA, 'wird_delete') && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setDeletingWird(w)}>
                      حذف
                    </Button>
                  )}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <Modal
        open={
          isEditorOpen &&
          !viewOnly &&
          (editingWirdId ? can(PA, 'wird_edit') : can(PA, 'wird_create'))
        }
        title={editingWirdId ? 'تعديل تسجيل الورد' : 'إضافة ورد جديد'}
        onClose={cancelEdit}
        size="md"
        closeOnBackdrop={!wirdSubmitting}
        closeOnEsc={!wirdSubmitting}
        showClose={!wirdSubmitting}
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
                const y = localYmd()
                setFormRecordingYmd(y)
                applyPlanDefaults(nextId, plans, awrad, { formRecordingYmd: y })
              }}
            >
              <option value="">اختر خطة...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedPlan && planAllowsCustomRecordingDate(selectedPlan) && (
            <DateField
              label="تاريخ تسجيل الورد"
              hint="يُحتسب الورد التراكمي وفق هذا اليوم. لا يمكن اختيار تاريخ مستقبلي أو قبل بداية الخطة."
              value={formRecordingYmd}
              onChange={(e) => {
                const v = e.target.value
                setFormRecordingYmd(v)
                queueMicrotask(() => {
                  applyPlanDefaults(selectedPlanId, plans, awrad, { formRecordingYmd: v })
                })
              }}
              max={localYmd()}
              min={
                selectedPlan.useDateRange && selectedPlan.dateStart
                  ? String(selectedPlan.dateStart).slice(0, 10)
                  : planScheduleStartYmd(selectedPlan)
              }
            />
          )}

          <div className="rh-segment rh-awrad__mode">
            <button
              type="button"
              className={['rh-segment__btn', mode === 'count' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => {
                const span = Math.max(1, toPage - fromPage + 1)
                setPagesCount(span)
                setMode('count')
              }}
            >
              <span className="rh-segment__label">تحديد عدد الصفحات</span>
            </button>
            <button
              type="button"
              className={['rh-segment__btn', mode === 'range' ? 'rh-segment__btn--active' : ''].join(' ')}
              onClick={() => {
                setMode('range')
                if (!editingWirdId) {
                  const span = Math.max(1, pagesCount)
                  const start = nextFromPage
                  let end = start + span - 1
                  if (strictQuota && maxPagesToday > 0) {
                    const cap = Math.max(start, start + maxPagesToday - 1)
                    end = Math.min(end, cap)
                  }
                  setFromPage(start)
                  setToPage(Math.max(start, end))
                }
              }}
            >
              <span className="rh-segment__label">من صفحة إلى صفحة</span>
            </button>
          </div>

          {mode === 'count' ? (
            <NumberStepField
              label="عدد الصفحات"
              hint={
                strictQuota
                  ? `من صفحة ${nextFromPage} — حدّ أدنى ${minPagesForEntry} وأقصى ${maxPagesToday} وفق الورد التراكمي${
                      customDateOn ? ` (لتاريخ ${quotaYmd})` : ''
                    }.`
                  : `سيتم التسجيل تلقائيًا من صفحة ${nextFromPage}. حدّ أدنى ${minPagesForEntry}${
                      allowBelowDaily ? ' (مسموح أقل من الورد اليومي إن فعّلت الخطة ذلك).' : ''
                    }`
              }
              value={pagesCount}
              onChange={setPagesCount}
              min={minPagesForEntry}
              max={strictQuota ? Math.max(minPagesForEntry, maxPagesToday) : 999}
            />
          ) : (
            <div className="rh-awrad__range">
              <NumberStepField
                label="من صفحة"
                value={fromPage}
                onChange={(n) => {
                  setFromPage(n)
                  if (mode === 'range' && strictQuota && maxPagesToday > 0) {
                    const cap = Math.max(n, n + maxPagesToday - 1)
                    setToPage((t) => Math.min(Math.max(t, n), cap))
                  } else {
                    setToPage((t) => Math.max(t, n))
                  }
                }}
                min={rangeFromMin}
                max={9999}
                hint={
                  editingWirdId
                    ? 'عند التعديل يمكنك تغيير المدى؛ تأكد أن المجموع يطابق الحد الأدنى والأقصى للخطة.'
                    : `يجب أن يبدأ المدى من صفحة ${nextFromPage} عند إضافة ورد جديد.`
                }
              />
              <NumberStepField
                label="إلى صفحة"
                value={toPage}
                onChange={(n) => {
                  const cap =
                    strictQuota && maxPagesToday > 0
                      ? Math.max(fromPage, fromPage + maxPagesToday - 1)
                      : 9999
                  setToPage(Math.min(Math.max(n, fromPage), cap))
                }}
                min={fromPage}
                max={rangeToMax}
                hint={
                  strictQuota && maxPagesToday > 0
                    ? `لا يتجاوز المدى ${maxPagesToday} صفحة من صفحة ${fromPage} (حتى صفحة ${rangeToMax}).`
                    : undefined
                }
              />
              <TextField label="المجموع المحسوب" value={String(computedPages)} readOnly />
              <p className="ui-field__hint">
                حدّ أدنى للمجموع: {minPagesForEntry} صفحة
                {strictQuota && maxPagesToday >= 0 && ` — أقصى مسموح: ${maxPagesToday} صفحة`}
                {customDateOn ? ` — تاريخ الاحتساب: ${quotaYmd}` : ''}
              </p>
            </div>
          )}

          <div className="rh-awrad__actions">
            <Button type="button" onClick={submitWird} loading={wirdSubmitting}>
              {!editingWirdId && !wirdSubmitting && <RhIcon as={Plus} size={16} strokeWidth={RH_ICON_STROKE} />}
              {editingWirdId ? 'حفظ التعديل' : 'إضافة الورد'}
            </Button>
            <Button type="button" variant="ghost" onClick={cancelEdit} disabled={wirdSubmitting}>
              إلغاء
            </Button>
          </div>
        </ScrollArea>
      </Modal>

      <Modal
        open={Boolean(deletingWird)}
        title="تأكيد حذف تسجيل الورد"
        onClose={() => !wirdDeleteSubmitting && setDeletingWird(null)}
        size="sm"
        closeOnBackdrop={!wirdDeleteSubmitting}
        closeOnEsc={!wirdDeleteSubmitting}
        showClose={!wirdDeleteSubmitting}
      >
        <p className="rh-plans__warn rh-plans__warn--confirm">
          سيتم حذف هذا التسجيل نهائياً. هل أنت متأكد؟
        </p>
        <div className="rh-awrad__actions">
          <Button
            type="button"
            variant="danger"
            loading={wirdDeleteSubmitting}
            onClick={async () => {
              if (!deletingWird) return
              setWirdDeleteSubmitting(true)
              try {
                await deleteWird(contextUserId, deletingWird.id)
                if (editingWirdId === deletingWird.id) cancelEdit()
                setDeletingWird(null)
                toast.info('تم حذف تسجيل الورد.', '')
              } catch {
                toast.warning('تعذّر الحذف. حاول مرة أخرى.', 'تنبيه')
              } finally {
                setWirdDeleteSubmitting(false)
              }
            }}
          >
            نعم، حذف
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={wirdDeleteSubmitting}
            onClick={() => setDeletingWird(null)}
          >
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  )
}
