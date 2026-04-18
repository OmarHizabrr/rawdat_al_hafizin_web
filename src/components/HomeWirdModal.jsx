import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addWird } from '../utils/awradStorage.js'
import {
  assertValidRecordingYmd,
  DAILY_LOGGING_STRICT_CARRYOVER,
  getPlanDailyLoggingMode,
  isoFromLocalYmd,
  localYmd,
  maxAdditionalPagesForRecordingDay,
  minPagesPerWirdEntry,
  planAllowsBelowDailyPages,
  planAllowsCustomRecordingDate,
  planScheduleStartYmd,
  recordingYmdForEditorQuota,
} from '../utils/planDailyQuota.js'
import { clampProgressPercent, computePlanProgress } from '../utils/planProgress.js'
import { Button, DateField, Modal, NumberStepField, ScrollArea, TextField, useToast } from '../ui/index.js'
import { RhIcon, RH_ICON_STROKE } from '../ui/RhIcon.jsx'

/**
 * نافذة تسجيل ورد سريعة للخطة الافتراضية (الصفحة الرئيسية).
 */
export function HomeWirdModal({ open, onClose, activePlan, awrad, contextUserId, user }) {
  const toast = useToast()
  const [mode, setMode] = useState('count')
  const [pagesCount, setPagesCount] = useState(1)
  const [fromPage, setFromPage] = useState(1)
  const [toPage, setToPage] = useState(1)
  const [formRecordingYmd, setFormRecordingYmd] = useState(() => localYmd())
  const [wirdSubmitting, setWirdSubmitting] = useState(false)

  const awradRef = useRef(awrad)
  awradRef.current = awrad

  const applyPlanDefaults = useCallback((plan, srcAwrad, formYmd) => {
    if (!plan?.id) return
    const min = Math.max(1, Number(plan.dailyPages) || 1)
    const strict = getPlanDailyLoggingMode(plan) === DAILY_LOGGING_STRICT_CARRYOVER
    const last = srcAwrad
      .filter((w) => w.planId === plan.id)
      .sort((a, b) => Date.parse(b.recordedAt || 0) - Date.parse(a.recordedAt || 0))[0]
    const recordingYmd = recordingYmdForEditorQuota(plan, formYmd)
    const maxAdd = strict
      ? maxAdditionalPagesForRecordingDay(plan, srcAwrad, recordingYmd, {})
      : 999999
    const minP = minPagesPerWirdEntry(plan, {
      strictCarryover: strict,
      maxExtra: maxAdd,
      minDaily: min,
    })
    const baseSpan = Math.max(min, Number(last?.pagesCount) || min)
    const span = strict
      ? maxAdd > 0
        ? Math.max(minP, Math.min(Math.max(min, baseSpan), maxAdd))
        : 1
      : planAllowsBelowDailyPages(plan)
        ? Math.max(1, Number(last?.pagesCount) || min)
        : Math.max(minP, baseSpan)
    const nextFrom = Math.max(1, Number(last?.toPage) || 0) + 1
    setPagesCount(span)
    setFromPage(nextFrom)
    setToPage(nextFrom + span - 1)
  }, [])

  useEffect(() => {
    if (!open || !activePlan?.id) return
    setMode('count')
    const y = localYmd()
    setFormRecordingYmd(y)
    applyPlanDefaults(activePlan, awradRef.current, y)
  }, [open, activePlan?.id, activePlan, applyPlanDefaults])

  const progress = useMemo(() => computePlanProgress(activePlan, awrad), [activePlan, awrad])
  const achievedPages = progress?.achievedPages ?? 0
  const targetPages = progress?.targetPages ?? 0
  const nextFromPage = progress?.nextFromPage ?? 1
  const minDaily = progress?.minDaily ?? 1

  const customDateOn = Boolean(activePlan && planAllowsCustomRecordingDate(activePlan))
  const allowBelowDaily = Boolean(activePlan && planAllowsBelowDailyPages(activePlan))
  const strictQuota =
    activePlan && getPlanDailyLoggingMode(activePlan) === DAILY_LOGGING_STRICT_CARRYOVER

  const quotaYmd = useMemo(() => {
    if (!open || !activePlan) return localYmd()
    return recordingYmdForEditorQuota(activePlan, formRecordingYmd)
  }, [open, activePlan, formRecordingYmd])

  const maxPagesToday = useMemo(
    () =>
      strictQuota && activePlan
        ? maxAdditionalPagesForRecordingDay(activePlan, awrad, quotaYmd, {})
        : 999,
    [strictQuota, activePlan, awrad, quotaYmd],
  )

  const minPagesForEntry = useMemo(
    () =>
      activePlan
        ? minPagesPerWirdEntry(activePlan, {
            strictCarryover: strictQuota,
            maxExtra: maxPagesToday,
            minDaily,
          })
        : 1,
    [activePlan, strictQuota, maxPagesToday, minDaily],
  )

  const rangeFromMin = nextFromPage
  const rangeToMax = useMemo(() => {
    if (!strictQuota || maxPagesToday <= 0) return 9999
    return Math.max(fromPage, fromPage + maxPagesToday - 1)
  }, [strictQuota, maxPagesToday, fromPage])

  const computedPages = mode === 'count' ? pagesCount : Math.max(0, toPage - fromPage + 1)

  const cancel = () => {
    if (wirdSubmitting) return
    onClose()
  }

  const submitWird = async () => {
    if (!activePlan || !contextUserId) {
      toast.warning('تعذّر التسجيل.', 'تنبيه')
      return
    }
    if (mode === 'range' && toPage < fromPage) {
      toast.warning('صفحة النهاية يجب أن تكون بعد صفحة البداية.', 'تنبيه')
      return
    }
    if (mode === 'range' && fromPage !== nextFromPage) {
      toast.warning(`لا يمكن تكرار المدى. يجب البدء من صفحة ${nextFromPage}.`, 'تنبيه')
      return
    }
    const dateCheck = assertValidRecordingYmd(activePlan, formRecordingYmd)
    if (!dateCheck.ok) {
      toast.warning(dateCheck.message, 'تنبيه')
      return
    }
    const recordingYmd = dateCheck.ymd
    const maxExtra = maxAdditionalPagesForRecordingDay(activePlan, awrad, recordingYmd, {})
    if (strictQuota && computedPages > maxExtra) {
      toast.warning(
        maxExtra <= 0
          ? 'لا يتبقّى لك ورد تراكمي مسموح بتسجيله في التاريخ المحدد وفق هذه الخطة.'
          : `الحد الأقصى المسموح في التاريخ المحدد وفق الورد التراكمي هو ${maxExtra} صفحة.`,
        'تنبيه',
      )
      return
    }
    if (computedPages < 1) {
      toast.warning('أدخل عدد صفحات صحيح (١ على الأقل).', 'تنبيه')
      return
    }
    const minP = minPagesPerWirdEntry(activePlan, {
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
      const allowCust = planAllowsCustomRecordingDate(activePlan)
      const recordedAtIso = allowCust ? isoFromLocalYmd(recordingYmd) : undefined
      const payload = {
        planId: activePlan.id,
        planName: activePlan.name,
        mode,
        pagesCount: computedPages,
        fromPage: resolvedFrom,
        toPage: resolvedTo,
        ...(allowCust ? { recordedAt: recordedAtIso } : {}),
      }
      const recordOpts = { allowCustomRecordedAt: allowCust }
      await addWird(contextUserId, payload, user ?? {}, recordOpts)

      const nextAchieved = achievedPages + computedPages
      const nextPercent = clampProgressPercent(nextAchieved, targetPages)
      toast.success(
        `تم تسجيل ${computedPages} صفحات. وصلت إلى ${nextAchieved}/${targetPages || '—'} (${nextPercent.toFixed(1)}%).`,
        'تم تسجيل الورد',
      )
      const optimisticAwrad = [
        {
          id: '__local_pending__',
          planId: activePlan.id,
          planName: activePlan.name,
          mode: payload.mode,
          pagesCount: payload.pagesCount,
          fromPage: payload.fromPage,
          toPage: payload.toPage,
          recordedAt:
            allowCust && recordedAtIso ? recordedAtIso : new Date().toISOString(),
        },
        ...awrad,
      ]
      const yNext = localYmd()
      setFormRecordingYmd(yNext)
      applyPlanDefaults(activePlan, optimisticAwrad, yNext)
      onClose()
    } catch {
      toast.warning('تعذّر حفظ الورد. تحقق من الاتصال وحاول مرة أخرى.', 'تنبيه')
    } finally {
      setWirdSubmitting(false)
    }
  }

  if (!activePlan) return null

  return (
    <Modal
      open={open}
      title={`تسجيل ورد — ${activePlan.name}`}
      onClose={cancel}
      size="md"
      closeOnBackdrop={!wirdSubmitting}
      closeOnEsc={!wirdSubmitting}
      showClose={!wirdSubmitting}
    >
      <ScrollArea className="rh-plans__editor-scroll" padded>
        <p className="ui-field__hint" style={{ marginTop: 0 }}>
          يُسجَّل الورد على خطتك الرئيسية المعروضة في الصفحة الرئيسية. للتبديل بين الخطط أو التعديل الكامل انتقل
          إلى صفحة الأوراد.
        </p>

        {planAllowsCustomRecordingDate(activePlan) && (
          <DateField
            label="تاريخ تسجيل الورد"
            hint="يُحتسب الورد التراكمي وفق هذا اليوم. لا يمكن اختيار تاريخ مستقبلي أو قبل بداية الخطة."
            value={formRecordingYmd}
            onChange={(e) => {
              const v = e.target.value
              setFormRecordingYmd(v)
              queueMicrotask(() => {
                applyPlanDefaults(activePlan, awradRef.current, v)
              })
            }}
            max={localYmd()}
            min={
              activePlan.useDateRange && activePlan.dateStart
                ? String(activePlan.dateStart).slice(0, 10)
                : planScheduleStartYmd(activePlan)
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
              const span = Math.max(1, pagesCount)
              const start = nextFromPage
              let end = start + span - 1
              if (strictQuota && maxPagesToday > 0) {
                const cap = Math.max(start, start + maxPagesToday - 1)
                end = Math.min(end, cap)
              }
              setFromPage(start)
              setToPage(Math.max(start, end))
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
              hint={`يجب أن يبدأ المدى من صفحة ${nextFromPage} عند إضافة ورد جديد.`}
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
            {!wirdSubmitting && <RhIcon as={Plus} size={16} strokeWidth={RH_ICON_STROKE} />}
            إضافة الورد
          </Button>
          <Button type="button" variant="ghost" onClick={cancel} disabled={wirdSubmitting}>
            إلغاء
          </Button>
        </div>
      </ScrollArea>
    </Modal>
  )
}
