const STORAGE_PREFIX = 'rh-print-'
const MAX_AGE_MS = 60 * 60 * 1000

function storageKey(id) {
  return `${STORAGE_PREFIX}${id}`
}

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * @param {object} payload
 * @returns {string|null}
 */
export function storePrintPayload(payload) {
  if (typeof sessionStorage === 'undefined' || !payload) return null
  const id = randomId()
  try {
    sessionStorage.setItem(
      storageKey(id),
      JSON.stringify({ ...payload, storedAt: Date.now() }),
    )
    return id
  } catch {
    return null
  }
}

/**
 * @param {string|null|undefined} id
 * @returns {object|null}
 */
export function loadPrintPayload(id) {
  if (typeof sessionStorage === 'undefined' || !id) return null
  try {
    const raw = sessionStorage.getItem(storageKey(id))
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.storedAt && Date.now() - data.storedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(storageKey(id))
      return null
    }
    return data
  } catch {
    return null
  }
}

export function removePrintPayload(id) {
  if (typeof sessionStorage === 'undefined' || !id) return
  try {
    sessionStorage.removeItem(storageKey(id))
  } catch {
    /* ignore */
  }
}
