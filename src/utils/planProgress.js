/** نسبة إنجاز من ٠ إلى ١٠٠ */
export function clampProgressPercent(done, total) {
  if (!total || total <= 0) return 0
  return Math.min(100, (done / total) * 100)
}

/**
 * حساب تقدّم خطة واحدة من سجل الأوراد (نفس منطق صفحة الأوراد).
 * @param {object | null | undefined} plan
 * @param {Array<{ planId?: string, pagesCount?: number, fromPage?: number, toPage?: number, recordedAt?: string }>} allAwrad
 */
export function computePlanProgress(plan, allAwrad) {
  if (!plan?.id) return null
  const planAwrad = (allAwrad || []).filter((w) => w.planId === plan.id)
  const achievedPages = planAwrad.reduce((sum, w) => sum + (Number(w.pagesCount) || 0), 0)
  const planAwradAsc = [...planAwrad].sort(
    (a, b) => Date.parse(a.recordedAt || 0) - Date.parse(b.recordedAt || 0),
  )
  let cursor = 0
  for (const w of planAwradAsc) {
    const pages = Math.max(0, Number(w.pagesCount) || 0)
    if (w.fromPage != null && w.toPage != null) {
      cursor = Math.max(cursor, Number(w.toPage) || 0)
    } else {
      cursor += pages
    }
  }
  const reachedPage = cursor
  const targetPages = Number(plan.totalTargetPages) || 0
  const progressPercent = clampProgressPercent(achievedPages, targetPages)
  const remainingPages = Math.max(0, targetPages - achievedPages)
  const nextFromPage = reachedPage + 1
  const minDaily = Math.max(1, Number(plan.dailyPages) || 1)
  return {
    achievedPages,
    reachedPage,
    targetPages,
    progressPercent,
    remainingPages,
    nextFromPage,
    minDaily,
  }
}
