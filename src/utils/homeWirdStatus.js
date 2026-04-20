import {
  DAILY_LOGGING_STRICT_CARRYOVER,
  cumulativeLoggedThroughPlan,
  cumulativeRequiredThrough,
  getPlanDailyLoggingMode,
  localYmd,
  maxAdditionalPagesForRecordingDay,
  planAppliesToYmd,
  ymdFromRecordedAt,
} from './planDailyQuota.js'

/** بعد هذه الساعة (التوقيت المحلي) يُعرَض التحذير الأحمر إن بقي ورد اليوم. */
export const HOME_WIRD_URGENT_HOUR = 18

/**
 * @param {object | null} plan
 * @param {Array} awrad
 * @param {Date} [now]
 * @returns {{ appliesToday: boolean, isComplete: boolean, variant: 'rest'|'ok'|'pending'|'urgent', todayYmd: string, hour: number }}
 */
export function getHomeWirdDayStatus(plan, awrad, now = new Date()) {
  const todayYmd = localYmd(now)
  const hour = now.getHours()
  const list = Array.isArray(awrad) ? awrad : []

  if (!plan?.id) {
    return { appliesToday: false, isComplete: true, variant: 'rest', todayYmd, hour }
  }

  const appliesToday = planAppliesToYmd(plan, todayYmd)
  if (!appliesToday) {
    return { appliesToday: false, isComplete: true, variant: 'rest', todayYmd, hour }
  }

  const strict = getPlanDailyLoggingMode(plan) === DAILY_LOGGING_STRICT_CARRYOVER
  let isComplete
  if (strict) {
    const maxExtra = maxAdditionalPagesForRecordingDay(plan, list, todayYmd, {})
    isComplete = maxExtra <= 0
  } else {
    isComplete = list.some(
      (w) => w.planId === plan.id && ymdFromRecordedAt(w.recordedAt) === todayYmd,
    )
  }

  let variant = 'ok'
  if (!isComplete) {
    variant = hour >= HOME_WIRD_URGENT_HOUR ? 'urgent' : 'pending'
  }

  return { appliesToday: true, isComplete, variant, todayYmd, hour }
}

/**
 * صفحات الورد المتأخرة حتى نهاية يوم `ymd` (المطلوب التراكمي − المسجّل حتى ذلك اليوم).
 * في وضع «تجاوز مسموح» يُحسب الفرق الفعلي (وليس سقفاً مفتوحاً).
 */
export function getCumulativePagesOwedThrough(plan, awrad, ymd) {
  if (!plan?.id || !ymd) return 0
  if (getPlanDailyLoggingMode(plan) === DAILY_LOGGING_STRICT_CARRYOVER) {
    return maxAdditionalPagesForRecordingDay(plan, awrad, ymd, {})
  }
  const req = cumulativeRequiredThrough(plan, ymd)
  const logged = cumulativeLoggedThroughPlan(plan, awrad, ymd)
  return Math.max(0, req - logged)
}

/**
 * زر «تسجيل الورد» السريع في الرئيسية: يظهر فقط إن كان على المستخدم ورد تراكمي
 * لا يقل عن الورد اليومي للخطة (أي تأخر بيوم كامل على الأقل، أو أول يوم نشط ولم يُسجَّل بعد).
 */
export function shouldShowHomeLogWirdCumulative(plan, awrad, ymd) {
  if (!plan?.id || !ymd) return false
  const daily = Math.max(1, Number(plan.dailyPages) || 1)
  return getCumulativePagesOwedThrough(plan, awrad, ymd) >= daily
}
