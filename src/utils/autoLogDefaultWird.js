import { addWird } from './awradStorage.js'
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
} from './planDailyQuota.js'
import { computePlanProgress } from './planProgress.js'

/**
 * يحسب دفعة «الورد الافتراضية» نفس منطق نافذة التسجيل السريع (عدّ الصفحات من التالي).
 * @returns {{ ok: true, payload, recordOpts, computedPages, nextFromPage, recordingYmd } | { ok: false, code: string, message: string }}
 */
export function buildAutoDefaultWirdAddRequest(plan, awrad, formYmd = localYmd()) {
  if (!plan?.id) return { ok: false, code: 'no_plan', message: 'لا توجد خطة.' }
  const dateCheck = assertValidRecordingYmd(plan, formYmd)
  if (!dateCheck.ok) return { ok: false, code: 'bad_date', message: dateCheck.message }
  const recordingYmd = dateCheck.ymd

  const list = Array.isArray(awrad) ? awrad : []
  const progress = computePlanProgress(plan, list)
  if (!progress) return { ok: false, code: 'no_progress', message: 'تعذّر حساب التقدّم.' }

  const nextFromPage = progress.nextFromPage
  const minDaily = progress.minDaily
  const strict = getPlanDailyLoggingMode(plan) === DAILY_LOGGING_STRICT_CARRYOVER
  const last = list
    .filter((w) => w.planId === plan.id)
    .sort((a, b) => Date.parse(b.recordedAt || 0) - Date.parse(a.recordedAt || 0))[0]

  const maxExtra = maxAdditionalPagesForRecordingDay(plan, list, recordingYmd, {})
  const minP = minPagesPerWirdEntry(plan, {
    strictCarryover: strict,
    maxExtra,
    minDaily,
  })
  const baseSpan = Math.max(minDaily, Number(last?.pagesCount) || minDaily)
  const span = strict
    ? maxExtra > 0
      ? Math.max(minP, Math.min(Math.max(minDaily, baseSpan), maxExtra))
      : 0
    : planAllowsBelowDailyPages(plan)
      ? Math.max(1, Number(last?.pagesCount) || minDaily)
      : Math.max(minP, baseSpan)

  if (strict && maxExtra <= 0) {
    return {
      ok: false,
      code: 'quota_done',
      message: 'لا يتبقّى ورد لتاريخ اليوم وفق الخطة.',
    }
  }
  let computedPages = span
  if (computedPages < 1) computedPages = minP
  if (computedPages < minP) {
    return { ok: false, code: 'below_min', message: `الحد الأدنى للدفعة ${minP} صفحة.` }
  }
  if (strict && computedPages > maxExtra) {
    return {
      ok: false,
      code: 'over_max',
      message: `الحد الأقصى المسموح لهذا التاريخ ${maxExtra} صفحة.`,
    }
  }

  const allowCust = planAllowsCustomRecordingDate(plan)
  const recordedAtIso = allowCust ? isoFromLocalYmd(recordingYmd) : undefined
  const payload = {
    planId: plan.id,
    planName: plan.name,
    mode: 'count',
    pagesCount: computedPages,
    fromPage: nextFromPage,
    toPage: nextFromPage + computedPages - 1,
    ...(allowCust ? { recordedAt: recordedAtIso } : {}),
  }
  const recordOpts = { allowCustomRecordedAt: allowCust }

  return {
    ok: true,
    payload,
    recordOpts,
    computedPages,
    nextFromPage,
    recordingYmd,
  }
}

export async function autoLogDefaultWird({ plan, awrad, contextUserId, user, formYmd }) {
  const built = buildAutoDefaultWirdAddRequest(plan, awrad, formYmd ?? localYmd())
  if (!built.ok) return built
  await addWird(contextUserId, built.payload, user ?? {}, built.recordOpts)
  return { ok: true, ...built }
}
