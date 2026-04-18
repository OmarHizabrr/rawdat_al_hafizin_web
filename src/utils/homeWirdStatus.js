import {
  DAILY_LOGGING_STRICT_CARRYOVER,
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
