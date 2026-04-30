import { VOLUME_BY_ID } from '../data/volumes.js'

/** @param {object | null | undefined} plan */
export function planVolumeSegments(plan) {
  const vols = plan?.volumes || []
  let offset = 1
  return vols.map((v) => {
    const pages = Math.max(0, Number(v.pagesTarget) || 0)
    const start = offset
    const end = offset + pages - 1
    offset += pages
    return { volumeId: v.id, label: v.label, start, end, pagesTarget: pages }
  })
}

function overlapPages(globalFrom, globalTo, segStart, segEnd) {
  const a = Math.max(globalFrom, segStart)
  const b = Math.min(globalTo, segEnd)
  return b >= a ? b - a + 1 : 0
}

/**
 * تقدّم الطالب في مجلد ضمن خطة واحدة (أرقام الصفحات في الورد العالمي للخطة).
 * @returns {{ pagesSum: number, maxLocalPage: number, segment: object | null }}
 */
export function pagesLoggedInVolumeForPlan(plan, planAwrad, volumeId) {
  const seg = planVolumeSegments(plan).find((s) => s.volumeId === volumeId)
  if (!seg || seg.pagesTarget <= 0) return { pagesSum: 0, maxLocalPage: 0, segment: null }
  let pagesSum = 0
  let maxLocalPage = 0
  for (const w of planAwrad || []) {
    if (w.planId !== plan.id) continue
    const f = Math.max(1, Number(w.fromPage) || 0)
    const t = Math.max(f, Number(w.toPage) || f)
    pagesSum += overlapPages(f, t, seg.start, seg.end)
    if (t >= seg.start && f <= seg.end) {
      const localTo = Math.min(t, seg.end) - seg.start + 1
      maxLocalPage = Math.max(maxLocalPage, localTo)
    }
  }
  return { pagesSum, maxLocalPage, segment: seg }
}

/**
 * آخر سجل ورد يتقاطع مع المجلد (عبر كل خطط الطالب).
 * يعيد صفحات محلية داخل المجلد (1…pagesTarget للخطة).
 */
export function lastWirdOverlappingVolume(volumeId, plans, awrad) {
  const candidates = []
  for (const p of plans || []) {
    const seg = planVolumeSegments(p).find((s) => s.volumeId === volumeId)
    if (!seg) continue
    for (const w of awrad || []) {
      if (w.planId !== p.id) continue
      const f = Math.max(1, Number(w.fromPage) || 0)
      const t = Math.max(f, Number(w.toPage) || f)
      if (overlapPages(f, t, seg.start, seg.end) <= 0) continue
      const localFrom = Math.max(f, seg.start) - seg.start + 1
      const localTo = Math.min(t, seg.end) - seg.start + 1
      const pagesCount = Math.max(0, Number(w.pagesCount) || localTo - localFrom + 1)
      candidates.push({
        wird: w,
        planName: p.name,
        planId: p.id,
        localFrom,
        localTo,
        pagesCount,
        recordedAt: w.recordedAt,
      })
    }
  }
  candidates.sort((a, b) => Date.parse(b.recordedAt || 0) - Date.parse(a.recordedAt || 0))
  return candidates[0] || null
}

/**
 * إجمالي صفحات مُسجّلة في المجلد عبر الخطط، وأقرب صفحة بداية مقترحة (ضمن حدود كتاب المجلد).
 */
export function aggregateVolumeProgress(volumeId, plans, awrad) {
  const vol = VOLUME_BY_ID[volumeId]
  const volumePages = vol?.pages || 0
  let totalPagesSum = 0
  let suggestedFrom = 1
  for (const p of plans || []) {
    const planW = (awrad || []).filter((w) => w.planId === p.id)
    const { pagesSum, maxLocalPage, segment } = pagesLoggedInVolumeForPlan(p, planW, volumeId)
    if (!segment) continue
    totalPagesSum += pagesSum
    suggestedFrom = Math.max(suggestedFrom, maxLocalPage + 1)
  }
  if (volumePages > 0) suggestedFrom = Math.min(suggestedFrom, volumePages)
  return {
    totalPagesSum,
    suggestedFromPage: Math.max(1, suggestedFrom),
    volumePages,
    volumeLabel: vol?.label || volumeId,
  }
}
