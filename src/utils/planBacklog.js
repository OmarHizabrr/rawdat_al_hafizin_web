import { hijriYmdToLocalNoonDate, prevHijriYmd } from './hijriDates.js'
import { getPagesLoggedOnPlanDay } from './homeWirdStatus.js'
import {
  isoFromLocalYmd,
  maxAdditionalPagesForRecordingDay,
  planAppliesToYmd,
} from './planDailyQuota.js'
import { computePlanProgress } from './planProgress.js'
import { addWird } from './awradStorage.js'

const WEEKDAY_NAMES_AR = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
]

export function weekdayLabelFromHijriYmd(ymd) {
  const d = hijriYmdToLocalNoonDate(ymd)
  if (!d || Number.isNaN(d.getTime())) return '—'
  return WEEKDAY_NAMES_AR[d.getDay()] || '—'
}

export function buildBacklogDays(plan, awrad, todayYmd, maxDays = 21) {
  if (!plan?.id || !todayYmd) return []
  const daily = Math.max(1, Number(plan.dailyPages) || 1)
  const out = []
  let d = todayYmd
  for (let i = 0; i < maxDays; i += 1) {
    if (!d) break
    if (planAppliesToYmd(plan, d)) {
      const logged = getPagesLoggedOnPlanDay(plan, awrad, d)
      const missing = Math.max(0, daily - logged)
      if (missing > 0) {
        out.push({
          ymd: d,
          logged,
          missing,
          isToday: d === todayYmd,
          weekdayLabel: weekdayLabelFromHijriYmd(d),
        })
      }
    }
    d = prevHijriYmd(d)
  }
  return out
}

/** تسجيل إنجاز يوم سابق/اليوم من قائمة التعويض */
export async function markBacklogDoneForPlan({
  plan,
  awrad,
  contextUserId,
  user,
  targetYmd,
}) {
  if (!plan?.id || !contextUserId || !user || !targetYmd) {
    return { ok: false, reason: 'missing' }
  }
  const daily = Math.max(1, Number(plan.dailyPages) || 1)
  const logged = getPagesLoggedOnPlanDay(plan, awrad, targetYmd)
  const missing = Math.max(0, daily - logged)
  if (missing <= 0) {
    return { ok: false, reason: 'complete' }
  }
  const maxExtra = maxAdditionalPagesForRecordingDay(plan, awrad, targetYmd, {})
  const pagesToAdd = Math.min(missing, maxExtra)
  if (pagesToAdd <= 0) {
    return { ok: false, reason: 'quota' }
  }
  const nextFrom = computePlanProgress(plan, awrad)?.nextFromPage ?? 1
  await addWird(
    contextUserId,
    {
      planId: plan.id,
      planName: plan.name,
      mode: 'count',
      pagesCount: pagesToAdd,
      fromPage: nextFrom,
      toPage: nextFrom + pagesToAdd - 1,
      recordedAt: isoFromLocalYmd(targetYmd),
    },
    user,
    { allowCustomRecordedAt: true },
  )
  return { ok: true, pagesToAdd }
}
