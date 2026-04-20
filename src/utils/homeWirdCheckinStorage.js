/** تأجيل نافذة «هل أكملت وردك اليوم؟» — إعادة العرض بعد هذه المدة */
const SNOOZE_MS = 2 * 60 * 1000

function safeKeys(contextUserId, ymd, planId) {
  if (!contextUserId || !ymd || !planId) return null
  return {
    dismissNo: `rh_checkin_no_${contextUserId}_${ymd}_${planId}`,
    snoozeUntil: `rh_checkin_snooze_${contextUserId}_${ymd}_${planId}`,
  }
}

export function isCheckinDismissedForDay(contextUserId, ymd, planId) {
  const k = safeKeys(contextUserId, ymd, planId)
  if (!k) return false
  return localStorage.getItem(k.dismissNo) === '1'
}

export function isCheckinSnoozed(contextUserId, ymd, planId) {
  const k = safeKeys(contextUserId, ymd, planId)
  if (!k) return false
  const t = Number(localStorage.getItem(k.snoozeUntil) || 0)
  return t > Date.now()
}

export function setCheckinDismissNo(contextUserId, ymd, planId) {
  const k = safeKeys(contextUserId, ymd, planId)
  if (!k) return
  localStorage.setItem(k.dismissNo, '1')
}

export function setCheckinSnooze(contextUserId, ymd, planId) {
  const k = safeKeys(contextUserId, ymd, planId)
  if (!k) return
  localStorage.setItem(k.snoozeUntil, String(Date.now() + SNOOZE_MS))
}
