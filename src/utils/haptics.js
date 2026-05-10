/**
 * اهتزاز خفيف للأزرار على الأجهزة التي تدعم Vibration API (غالباً أندرويد).
 * لا يُستخدم على سطح المكتب؛ يُحترم prefers-reduced-motion.
 */

function reducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

/** نقر / اختيار عادي */
export function rhHapticLight() {
  if (reducedMotion() || !canVibrate()) return
  try {
    navigator.vibrate(12)
  } catch {
    /* ignore */
  }
}

/** تأكيد أقوى (إجراء رئيسي) */
export function rhHapticMedium() {
  if (reducedMotion() || !canVibrate()) return
  try {
    navigator.vibrate([16, 24, 12])
  } catch {
    /* ignore */
  }
}
