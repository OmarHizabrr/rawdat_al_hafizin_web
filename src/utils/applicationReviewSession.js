/** يُضبط عند تسجيل الخروج إذا كان نوع المستخدم يفرض مراجعة استمارة الالتحاق في الدخول التالي */
export const APPLICATION_REVIEW_SESSION_KEY = 'rh_application_review_session'

export function setApplicationReviewSessionFlag() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(APPLICATION_REVIEW_SESSION_KEY, '1')
}

export function hasApplicationReviewSessionFlag() {
  if (typeof sessionStorage === 'undefined') return false
  return sessionStorage.getItem(APPLICATION_REVIEW_SESSION_KEY) === '1'
}

export function clearApplicationReviewSessionFlag() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(APPLICATION_REVIEW_SESSION_KEY)
}
