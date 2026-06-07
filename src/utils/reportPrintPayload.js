const STORAGE_PREFIX = 'rh-print-'
const MAX_AGE_MS = 60 * 60 * 1000

function storageKey(id) {
  return `${STORAGE_PREFIX}${id}`
}

function getStorage() {
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function purgeExpiredPrintPayloads(storage) {
  if (!storage) return
  const now = Date.now()
  const keysToRemove = []
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i)
    if (!key?.startsWith(STORAGE_PREFIX)) continue
    try {
      const data = JSON.parse(storage.getItem(key) || '')
      if (data?.storedAt && now - data.storedAt > MAX_AGE_MS) keysToRemove.push(key)
    } catch {
      keysToRemove.push(key)
    }
  }
  for (const key of keysToRemove) {
    try {
      storage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {object} payload
 * @returns {string|null}
 */
export function storePrintPayload(payload) {
  const storage = getStorage()
  if (!storage || !payload) return null
  const id = randomId()
  try {
    purgeExpiredPrintPayloads(storage)
    storage.setItem(
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
  const storage = getStorage()
  if (!storage || !id) return null
  try {
    const raw = storage.getItem(storageKey(id))
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.storedAt && Date.now() - data.storedAt > MAX_AGE_MS) {
      storage.removeItem(storageKey(id))
      return null
    }
    return data
  } catch {
    return null
  }
}

export function removePrintPayload(id) {
  const storage = getStorage()
  if (!storage || !id) return
  try {
    storage.removeItem(storageKey(id))
  } catch {
    /* ignore */
  }
}
