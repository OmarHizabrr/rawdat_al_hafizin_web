export const NOTIFICATIONS_MODE = {
  ON: 'on',
  OFF: 'off',
}

const STORAGE_KEY = 'rh.notifications.mode'
const CHANGE_EVENT = 'rh:notifications-mode-changed'

export function readNotificationsMode() {
  try {
    const raw = String(localStorage.getItem(STORAGE_KEY) || '').trim().toLowerCase()
    if (raw === NOTIFICATIONS_MODE.OFF) return NOTIFICATIONS_MODE.OFF
  } catch {
    /* ignore */
  }
  return NOTIFICATIONS_MODE.ON
}

export function notificationsEnabled() {
  return readNotificationsMode() !== NOTIFICATIONS_MODE.OFF
}

export function writeNotificationsMode(mode) {
  const normalized = mode === NOTIFICATIONS_MODE.OFF ? NOTIFICATIONS_MODE.OFF : NOTIFICATIONS_MODE.ON
  try {
    localStorage.setItem(STORAGE_KEY, normalized)
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { mode: normalized } }))
  } catch {
    /* ignore */
  }
}

export function notificationsModeChangeEvent() {
  return CHANGE_EVENT
}
