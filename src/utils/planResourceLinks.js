import { firestoreApi } from '../services/firestoreApi.js'

/** @typedef {'whatsapp' | 'telegram' | 'other'} PlanResourceChannel */

export const PLAN_RESOURCE_CHANNELS = /** @type {const} */ ([
  { value: 'whatsapp', label: 'واتساب' },
  { value: 'telegram', label: 'تيليجرام' },
  { value: 'other', label: 'أخرى (اسم مخصص)' },
])

/** @param {string | null | undefined} url */
export function sanitizePlanResourceUrl(url) {
  const u = String(url ?? '').trim()
  if (!u) return ''
  try {
    const parsed = new URL(u)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return ''
    return u
  } catch {
    return ''
  }
}

/** @param {PlanResourceChannel} ch */
export function defaultTitleForChannel(ch) {
  if (ch === 'whatsapp') return 'واتساب'
  if (ch === 'telegram') return 'تيليجرام'
  return 'رابط'
}

/**
 * @param {unknown} raw
 * @returns {Array<{ id: string, channel: PlanResourceChannel, customTitle: string, url: string }>}
 */
export function normalizePlanResourceLinks(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const row of raw) {
    const url = sanitizePlanResourceUrl(row?.url)
    if (!url) continue
    const ch = row?.channel
    const channel =
      ch === 'whatsapp' || ch === 'telegram' || ch === 'other' ? ch : 'other'
    const customTitle = String(row?.customTitle ?? row?.customLabel ?? '').trim()
    const id = String(row?.id ?? '').trim() || firestoreApi.getNewId('prl')
    out.push({ id, channel, customTitle, url })
  }
  return out
}

/**
 * @param {{ channel: PlanResourceChannel, customTitle: string }} row
 */
export function displayTitleForPlanLink(row) {
  if (row.channel === 'other') {
    const t = String(row.customTitle ?? '').trim()
    return t || 'رابط'
  }
  return defaultTitleForChannel(row.channel)
}
