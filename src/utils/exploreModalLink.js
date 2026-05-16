import { withImpersonationQuery } from './impersonation.js'

/** مسار الصفحة الأب لكل نوع استكشاف (للتوجيه وفتح النافذة عبر ?explore=1) */
export const EXPLORE_PARENT_PATHS = {
  plans: '/app/plans',
  halakat: '/app/halakat',
  remote_tasmee: '/app/remote-tasmee',
  exams: '/app/exams',
  dawrat: '/app/dawrat',
  activities: '/app/activities',
}

/**
 * رابط يفتح نافذة الاستكشاف على الصفحة الأب (مع دعم النيابة).
 * @param {keyof typeof EXPLORE_PARENT_PATHS} kind
 * @param {string} [impersonateUid]
 */
export function exploreModalLink(kind, impersonateUid) {
  const base = EXPLORE_PARENT_PATHS[kind]
  if (!base) return '/app'
  const withExplore = `${base}?explore=1`
  return withImpersonationQuery(withExplore, impersonateUid)
}
