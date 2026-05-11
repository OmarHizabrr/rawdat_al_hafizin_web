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

/** نمط أطول عند وصول إشعار دفع/منصّة (يُحترم prefers-reduced-motion) */
export function rhHapticPushDelivery() {
  if (reducedMotion() || !canVibrate()) return
  try {
    navigator.vibrate([22, 45, 28, 45, 32, 55, 28, 70, 200])
  } catch {
    /* ignore */
  }
}

function pointerAllowsHaptic(e) {
  if (!e || typeof window === 'undefined') return true
  if (e.pointerType === 'touch' || e.pointerType === 'pen') return true
  return window.matchMedia('(pointer: coarse)').matches
}

/**
 * اهتزاز عند اختيار رابط تنقّل (قائمة، شريط، CrossNav).
 * يُستدعى من onPointerDown مع تمرير الحدث — نفس منطق الأزرار: لمس ولوحات لمس فقط.
 */
export function rhHapticNavigate(e) {
  if (reducedMotion() || !canVibrate()) return
  if (!pointerAllowsHaptic(e)) return
  try {
    navigator.vibrate(18)
  } catch {
    /* ignore */
  }
}

/** نقر أيقونة القائمة الجانبية / لوحة — نبضة أوضح قليلاً */
export function rhHapticChromeTap(e) {
  if (reducedMotion() || !canVibrate()) return
  if (!pointerAllowsHaptic(e)) return
  try {
    navigator.vibrate([12, 14, 16])
  } catch {
    /* ignore */
  }
}
