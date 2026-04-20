import { useEffect, useRef } from 'react'
import { loadPlans } from '../utils/plansStorage.js'
import { loadAwrad } from '../utils/awradStorage.js'
import { getCumulativePagesOwedThrough, getPagesLoggedOnPlanDay } from '../utils/homeWirdStatus.js'
import { planAppliesToYmd, planScheduleStartYmd } from '../utils/planDailyQuota.js'
import { prevHijriYmd } from '../utils/hijriDates.js'
import { useToast } from '../ui/useToast.js'
import { localYmd } from '../utils/planDailyQuota.js'

const TICK_MS = 30_000
const FIRED_PREFIX = 'rh.reminderFired'
const OVERDUE_FIRED_PREFIX = 'rh.overdueFired'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function nowHm() {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function todayYmd() {
  return localYmd()
}

function planActiveToday(plan) {
  if (!plan.useDateRange || !plan.dateStart || !plan.dateEnd) return true
  const t = todayYmd()
  return t >= plan.dateStart && t <= plan.dateEnd
}

function planAllowsWeekday(plan) {
  if (!plan.useWeekdayFilter || !plan.weekdayFilter?.length) return true
  const dow = new Date().getDay()
  return plan.weekdayFilter.includes(dow)
}

function fireKey(planId, day, hm) {
  return `${FIRED_PREFIX}.${planId}.${day}.${hm}`
}

function overdueFireKey(planId, day) {
  return `${OVERDUE_FIRED_PREFIX}.${planId}.${day}`
}

function findOverdueSinceYmd(plan, awrad, todayYmd, maxDays = 240) {
  if (!plan?.id || !todayYmd) return ''
  const start = planScheduleStartYmd(plan)
  const daily = Math.max(1, Number(plan.dailyPages) || 1)
  let cursor = todayYmd
  let oldest = ''
  let guard = 0
  while (cursor && cursor >= start && guard < maxDays) {
    if (planAppliesToYmd(plan, cursor)) {
      const logged = getPagesLoggedOnPlanDay(plan, awrad, cursor)
      if (logged < daily) oldest = cursor
    }
    if (cursor === start) break
    const prev = prevHijriYmd(cursor)
    if (!prev || prev === cursor) break
    cursor = prev
    guard += 1
  }
  return oldest
}

export function usePlanReminders(user, { iconSrc } = {}) {
  const notificationIcon = iconSrc && String(iconSrc).trim() ? String(iconSrc).trim() : '/logo.png'
  const toast = useToast()
  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const userId = user?.uid
    if (!userId) return

    const tick = async () => {
      const hm = nowHm()
      const day = localYmd()
      let plans
      let awrad
      try {
        plans = await loadPlans(userId)
        awrad = await loadAwrad(userId)
      } catch {
        return
      }
      if (!Array.isArray(plans)) return
      const awradList = Array.isArray(awrad) ? awrad : []

      for (const plan of plans) {
        if (!plan?.id || !plan.reminderTime || plan.reminderTime !== hm) continue
        if (!planActiveToday(plan)) continue
        if (!planAllowsWeekday(plan)) continue

        const key = fireKey(plan.id, day, hm)
        try {
          if (sessionStorage.getItem(key)) continue
          sessionStorage.setItem(key, '1')
        } catch {
          continue
        }

        const title = 'حان وقت الورد'
        const body = plan.name
          ? `${plan.name} — ${plan.dailyPages} صفحة`
          : `وردك اليومي: ${plan.dailyPages} صفحة`

        toastRef.current.info(body, title)

        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body,
              icon: notificationIcon,
              tag: `${plan.id}-${day}-${hm}`,
            })
          } catch {
            /* ignore */
          }
        }
      }

      for (const plan of plans) {
        if (!plan?.id) continue
        const owedPages = getCumulativePagesOwedThrough(plan, awradList, day)
        if (owedPages <= 0) continue

        const overdueKey = overdueFireKey(plan.id, day)
        try {
          if (sessionStorage.getItem(overdueKey)) continue
          sessionStorage.setItem(overdueKey, '1')
        } catch {
          continue
        }

        const overdueSinceYmd = findOverdueSinceYmd(plan, awradList, day)
        const overdueTitle = 'تنبيه تأخر في الورد'
        const overdueBody = plan.name
          ? `${plan.name}: لديك ${owedPages} صفحة متأخرة${overdueSinceYmd ? ` (متأخر منذ ${overdueSinceYmd})` : ''}.`
          : `لديك ${owedPages} صفحة متأخرة${overdueSinceYmd ? ` (متأخر منذ ${overdueSinceYmd})` : ''}.`

        toastRef.current.warning(overdueBody, overdueTitle)

        try {
          window.dispatchEvent(
            new CustomEvent('rh:wird-overdue-detected', {
              detail: { planId: plan.id, planName: plan.name || '', owedPages, overdueSinceYmd, day },
            }),
          )
        } catch {
          /* ignore */
        }

        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(overdueTitle, {
              body: overdueBody,
              icon: notificationIcon,
              tag: `overdue-${plan.id}-${day}`,
            })
          } catch {
            /* ignore */
          }
        }
      }
    }

    tick()
    const id = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(id)
  }, [user?.uid, notificationIcon])
}
