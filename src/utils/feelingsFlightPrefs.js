export const FEELINGS_FLIGHT_MODE_KEY = 'rh.feelingsFlightMode'

export const FEELINGS_FLIGHT_MODE = {
  OFF: 'off',
  CALM: 'calm',
  FAST: 'fast',
}

const VALID = new Set(Object.values(FEELINGS_FLIGHT_MODE))

export function readFeelingsFlightMode() {
  try {
    const raw = localStorage.getItem(FEELINGS_FLIGHT_MODE_KEY)
    if (VALID.has(raw)) return raw
  } catch {
    /* ignore */
  }
  return FEELINGS_FLIGHT_MODE.CALM
}

export function writeFeelingsFlightMode(mode) {
  const next = VALID.has(mode) ? mode : FEELINGS_FLIGHT_MODE.CALM
  try {
    localStorage.setItem(FEELINGS_FLIGHT_MODE_KEY, next)
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent('rh:feelings-flight-mode', { detail: next }))
  } catch {
    /* ignore */
  }
}
