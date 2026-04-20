import { prevHijriYmd } from './hijriDates.js'
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

/** مجموع الصفحات المسجّلة لهذه الخطة في يوم هجري محدد (حسب recordedAt). */
export function getPagesLoggedOnPlanDay(plan, awrad, ymd) {
  if (!plan?.id || !ymd || !Array.isArray(awrad)) return 0
  let sum = 0
  for (const w of awrad) {
    if (w.planId !== plan.id) continue
    if (ymdFromRecordedAt(w.recordedAt) !== ymd) continue
    sum += Math.max(0, Number(w.pagesCount) || 0)
  }
  return sum
}

/**
 * لوحة الرئيسية: نصوص التأخر والتعويض وأمس/اليوم.
 * @param {object | null} plan
 * @param {Array} awrad
 * @param {{ appliesToday: boolean, isComplete: boolean, variant: string, todayYmd: string }} status
 */
export function getHomeWirdDashboardInsight(plan, awrad, status) {
  const todayYmd = status?.todayYmd || localYmd()
  const prevYmd = prevHijriYmd(todayYmd)
  const daily = Math.max(1, Number(plan?.dailyPages) || 1)
  const empty = {
    owedPages: 0,
    dailyPages: daily,
    prevYmd,
    yesterdayApplies: false,
    todayApplies: false,
    yesterdayLogged: 0,
    todayLogged: 0,
    mood: /** @type {'rest'} */ ('rest'),
    headline: '',
    detailLines: /** @type {string[]} */ ([]),
  }

  if (!plan?.id) return empty

  const todayApplies = status.appliesToday
  const yesterdayApplies = planAppliesToYmd(plan, prevYmd)
  const owedPages = getCumulativePagesOwedThrough(plan, awrad, todayYmd)
  const yesterdayLogged = getPagesLoggedOnPlanDay(plan, awrad, prevYmd)
  const todayLogged = getPagesLoggedOnPlanDay(plan, awrad, todayYmd)

  const detailLines = []
  let headline = ''
  /** @type {'rest'|'done'|'steady'|'catchup'|'late'} */
  let mood = 'steady'

  if (!todayApplies) {
    mood = 'rest'
    headline = 'يوم راحة في جدول خطتك'
    if (owedPages > 0) {
      detailLines.push(
        `ما زال عليك ${owedPages} ${owedPages === 1 ? 'صفحة' : 'صفحات'} تراكمياً — عوّضها في أقرب يوم ورد.`,
      )
    } else {
      detailLines.push('استغلّ اليوم بما يرضي الله، واستعد للمتابعة بخفّة.')
    }
  } else if (owedPages > 0) {
    const isLate = owedPages >= daily * 2 || status.variant === 'urgent'
    mood = isLate ? 'late' : 'catchup'
    headline = `متأخّر ب‍${owedPages} ${owedPages === 1 ? 'صفحة' : 'صفحات'} — حان التعويض`

    if (yesterdayApplies && yesterdayLogged === 0) {
      detailLines.push('لم تُسجَّل أمس أي صفحة — عوّض حقّ أمس مع ورد اليوم في جلسة منظّمة.')
    } else if (yesterdayApplies && yesterdayLogged > 0 && yesterdayLogged < daily) {
      detailLines.push(
        `أمس سجّلت ${yesterdayLogged} من ${daily} صفحة — أكمل الباقي مع التزام اليوم.`,
      )
    } else if (yesterdayApplies && yesterdayLogged >= daily && owedPages > 0) {
      detailLines.push('التراكم يشمل أياماً سابقة — خفّف التأخر صفحةً صفحة دون إرهاق.')
    } else if (!yesterdayApplies && owedPages > 0) {
      detailLines.push('أمس كان يوم راحة في خطتك؛ التأخير من قبل — تابع الإنقاص بثبات.')
    }

    if (todayApplies && !status.isComplete) {
      detailLines.push(
        `ورد اليوم في خطتك ${daily} ${daily === 1 ? 'صفحة' : 'صفحات'} — اجمع بين التعويض وإتمام اليوم قدر استطاعتك.`,
      )
    }
  } else if (status.isComplete) {
    mood = 'done'
    headline = 'بارك الله فيك — وردك متوازن مع الخطة'
    detailLines.push('حافظ على الوتيرة؛ الاستمرار أثقل من البداية وأجملها.')
  } else {
    mood = 'steady'
    headline = 'أكمل ورد اليوم بثبات'
    detailLines.push(
      `لا يوجد تأخر تراكمي — سجّل وردك المعتاد (${daily} ${daily === 1 ? 'صفحة' : 'صفحات'}).`,
    )
  }

  return {
    owedPages,
    dailyPages: daily,
    prevYmd,
    yesterdayApplies,
    todayApplies,
    yesterdayLogged,
    todayLogged,
    mood,
    headline,
    detailLines,
  }
}
