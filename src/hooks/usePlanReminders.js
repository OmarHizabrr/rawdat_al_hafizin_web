import { useEffect, useRef } from 'react'
import { loadPlans } from '../utils/plansStorage.js'
import { useToast } from '../ui/useToast.js'

const TICK_MS = 30_000
const FIRED_PREFIX = 'rh.reminderFired'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function nowHm() {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function planActiveToday(plan) {
  if (!plan.useDateRange || !plan.dateStart || !plan.dateEnd) return true
  const t = todayIso()
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

export function usePlanReminders(user, { iconSrc } = {}) {
  const notificationIcon = iconSrc && String(iconSrc).trim() ? String(iconSrc).trim() : '/logo.png'
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  useEffect(() => {
    if (typeof window === 'undefined') return
    const userId = user?.uid
    if (!userId) return

    const tick = async () => {
      const hm = nowHm()
      const day = todayIso()
      let plans
      try {
        plans = await loadPlans(userId)
      } catch {
        return
      }
      if (!Array.isArray(plans)) return

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
    }

    tick()
    const id = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(id)
  }, [user?.uid, notificationIcon])
}
