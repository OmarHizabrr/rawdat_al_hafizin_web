import { isAdmin } from '../config/roles.js'

/**
 * معرّف المستخدم الذي يعمل المشرف نيابةً عنه (من `?uid=` في الرابط).
 * @param {{ uid?: string } | null | undefined} actor المستخدم المسجّل
 * @param {string} search قيمة `location.search`
 */
export function getImpersonateUid(actor, search) {
  if (!actor?.uid || !isAdmin(actor)) return ''
  const uid = new URLSearchParams(search).get('uid')?.trim() || ''
  return uid || ''
}

/**
 * يضيف أو يحدّث `uid` في استعلام المسار لمسارات التطبيق أثناء انتحال الهوية.
 * لا يُطبَّق على `/app/admin/*`.
 */
export function withImpersonationQuery(path, impersonateUid) {
  if (!impersonateUid || typeof path !== 'string' || !path.startsWith('/app')) return path
  if (path.startsWith('/app/admin')) return path

  const hashIdx = path.indexOf('#')
  const base = hashIdx === -1 ? path : path.slice(0, hashIdx)
  const hash = hashIdx === -1 ? '' : path.slice(hashIdx)

  const qIdx = base.indexOf('?')
  const pathname = qIdx === -1 ? base : base.slice(0, qIdx)
  const existing = qIdx === -1 ? '' : base.slice(qIdx + 1)
  const q = new URLSearchParams(existing)
  q.set('uid', impersonateUid)
  return `${pathname}?${q.toString()}${hash}`
}
