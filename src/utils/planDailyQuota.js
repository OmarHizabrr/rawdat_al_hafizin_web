/**
 * منطق الورد اليومي: تجاوز مسموح، أو التزام تراكمي (تعويض أيام فائتة).
 * التاريخ بالتقويم المحلي YYYY-MM-DD.
 */

export const DAILY_LOGGING_ALLOW_OVER = 'allow_over'
export const DAILY_LOGGING_STRICT_CARRYOVER = 'strict_carryover'

export function getPlanDailyLoggingMode(plan) {
  return plan?.dailyLoggingMode === DAILY_LOGGING_STRICT_CARRYOVER
    ? DAILY_LOGGING_STRICT_CARRYOVER
    : DAILY_LOGGING_ALLOW_OVER
}

export function localYmd(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ymdFromRecordedAt(recordedAt) {
  if (!recordedAt) return ''
  const t = Date.parse(String(recordedAt))
  if (!Number.isFinite(t)) return ''
  return localYmd(new Date(t))
}

export function nextYmd(ymd) {
  const d = new Date(`${ymd}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ymd
  d.setDate(d.getDate() + 1)
  return localYmd(d)
}

/** أول يوم يُحتسب منه الالتزام التراكمي */
export function planScheduleStartYmd(plan) {
  if (!plan) return localYmd()
  if (plan.useDateRange && plan.dateStart) return String(plan.dateStart).slice(0, 10)
  const c = plan.createdAt
  if (typeof c === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c)) return c.slice(0, 10)
  const t = Date.parse(String(c || ''))
  if (Number.isFinite(t)) return localYmd(new Date(t))
  return localYmd()
}

/** هل ينطبق يوم الخطة (فترة + أيام الأسبوع) على هذا التاريخ؟ */
export function planAppliesToYmd(plan, ymd) {
  if (!plan || !ymd) return false
  if (plan.useDateRange && plan.dateStart && plan.dateEnd) {
    if (ymd < plan.dateStart || ymd > plan.dateEnd) return false
  }
  if (plan.useWeekdayFilter && Array.isArray(plan.weekdayFilter) && plan.weekdayFilter.length > 0) {
    if (plan.weekdayFilter.length >= 7) return true
    const dow = new Date(`${ymd}T12:00:00`).getDay()
    if (!plan.weekdayFilter.includes(dow)) return false
  }
  return true
}

/**
 * مجموع الصفحات المطلوبة حتى نهاية يوم throughYmd (شامل) وفق أيام الخطة النشطة.
 */
export function cumulativeRequiredThrough(plan, throughYmd) {
  if (!plan || !throughYmd) return 0
  const daily = Math.max(1, Number(plan.dailyPages) || 1)
  const start = planScheduleStartYmd(plan)
  if (throughYmd < start) return 0
  let end = throughYmd
  if (plan.useDateRange && plan.dateEnd && end > plan.dateEnd) end = plan.dateEnd
  let sum = 0
  let guard = 0
  for (let d = start; d <= end && guard < 4000; d = nextYmd(d), guard += 1) {
    if (planAppliesToYmd(plan, d)) sum += daily
    if (d === end) break
  }
  return sum
}

/**
 * مجموع الصفحات المسجّلة لهذه الخطة حتى نهاية يوم throughYmd (حسب recordedAt).
 * @param {string} [excludeWirdId] - استبعاد سجل (مثلاً عند التعديل)
 */
export function cumulativeLoggedThroughPlan(plan, allAwrad, throughYmd, excludeWirdId) {
  if (!plan?.id || !throughYmd || !Array.isArray(allAwrad)) return 0
  const pid = plan.id
  let sum = 0
  for (const w of allAwrad) {
    if (w.planId !== pid) continue
    if (excludeWirdId && w.id === excludeWirdId) continue
    const wd = ymdFromRecordedAt(w.recordedAt)
    if (!wd || wd > throughYmd) continue
    sum += Math.max(0, Number(w.pagesCount) || 0)
  }
  return sum
}

/**
 * أقصى عدد صفحات يُسمح بتسجيله في دفعة واحدة ليوم التسجيل (اليوم المحلي عند الإضافة).
 */
export function maxAdditionalPagesForRecordingDay(plan, allAwrad, recordingYmd, { excludeWirdId } = {}) {
  if (getPlanDailyLoggingMode(plan) !== DAILY_LOGGING_STRICT_CARRYOVER) return 9999
  if (!recordingYmd) return 9999
  const req = cumulativeRequiredThrough(plan, recordingYmd)
  const logged = cumulativeLoggedThroughPlan(plan, allAwrad, recordingYmd, excludeWirdId)
  return Math.max(0, req - logged)
}

/** عند تفعيله في الخطة يمكن للعضو اختيار يوم التسجيل في نموذج الورد. */
export function planAllowsCustomRecordingDate(plan) {
  return Boolean(plan?.allowCustomRecordingDate)
}

/**
 * تاريخ YYYY-MM-DD يُستخدم لاحتساب الحد التراكمي في المحرر (مع تقييد آمن).
 */
export function recordingYmdForEditorQuota(plan, formYmd) {
  if (!planAllowsCustomRecordingDate(plan)) return localYmd()
  if (typeof formYmd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(formYmd)) return localYmd()
  if (formYmd > localYmd()) return localYmd()
  const start = planScheduleStartYmd(plan)
  if (formYmd < start) return start
  return formYmd
}

/**
 * التحقق قبل الحفظ. عند عدم تفعيل الخيار في الخطة يُعاد دائماً اليوم المحلي.
 */
export function assertValidRecordingYmd(plan, formYmd) {
  const today = localYmd()
  if (!planAllowsCustomRecordingDate(plan)) return { ok: true, ymd: today }
  if (typeof formYmd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(formYmd.trim())) {
    return { ok: false, message: 'حدّد تاريخ التسجيل بصيغة صحيحة (YYYY-MM-DD).' }
  }
  const y = formYmd.trim()
  if (y > today) return { ok: false, message: 'لا يمكن اختيار تاريخ في المستقبل.' }
  const start = planScheduleStartYmd(plan)
  if (y < start) {
    return { ok: false, message: `لا يمكن أن يكون تاريخ التسجيل قبل بداية الخطة (${start}).` }
  }
  return { ok: true, ymd: y }
}

/** طابع زمني ثابت نسبياً ليوم محلي حتى يتطابق ymdFromRecordedAt مع ymd المختار. */
export function isoFromLocalYmd(ymd) {
  if (!ymd || typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return new Date().toISOString()
  }
  const d = new Date(`${ymd}T12:00:00`)
  if (Number.isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}
