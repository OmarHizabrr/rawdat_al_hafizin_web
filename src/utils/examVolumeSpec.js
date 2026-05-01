import { VOLUME_BY_ID, VOLUMES } from '../data/volumes.js'

/** نطاق الصفحات داخل المجلد الواحد */
export const EXAM_VOLUME_SCOPE = {
  QUARTER: 'quarter',
  HALF: 'half',
  THREE_QUARTERS: 'three_quarters',
  FULL: 'full',
  CUSTOM: 'custom',
}

const SCOPE_SET = new Set(Object.values(EXAM_VOLUME_SCOPE))

export function examVolumeScopeLabelAr(scope) {
  if (scope === EXAM_VOLUME_SCOPE.QUARTER) return 'ربع المجلد'
  if (scope === EXAM_VOLUME_SCOPE.HALF) return 'نصف المجلد'
  if (scope === EXAM_VOLUME_SCOPE.THREE_QUARTERS) return 'ثلاثة أرباع المجلد'
  if (scope === EXAM_VOLUME_SCOPE.CUSTOM) return 'عدد صفحات محدد'
  return 'المجلد كاملاً'
}

export function resolvedPagesForExamVolume(volumeId, scope, customPages) {
  const v = VOLUME_BY_ID[volumeId]
  if (!v) return 0
  const t = Math.max(1, Number(v.pages) || 0)
  const sc = SCOPE_SET.has(scope) ? scope : EXAM_VOLUME_SCOPE.FULL
  if (sc === EXAM_VOLUME_SCOPE.FULL) return t
  if (sc === EXAM_VOLUME_SCOPE.HALF) return Math.max(1, Math.round(t / 2))
  if (sc === EXAM_VOLUME_SCOPE.QUARTER) return Math.max(1, Math.round(t / 4))
  if (sc === EXAM_VOLUME_SCOPE.THREE_QUARTERS) return Math.max(1, Math.round((t * 3) / 4))
  if (sc === EXAM_VOLUME_SCOPE.CUSTOM) {
    const n = Math.floor(Number(customPages) || 0)
    return Math.min(t, Math.max(1, n))
  }
  return t
}

/**
 * تطبيع مواصفات المجلدات للتخزين (مصفوفة نظيفة فقط).
 * @param {unknown} raw
 * @returns {{ volumeId: string, scope: string, customPages: number | null }[]}
 */
export function normalizeExamVolumeSpecs(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const volumeId = String(item.volumeId || '').trim()
    if (!volumeId || !VOLUME_BY_ID[volumeId]) continue
    const scope = SCOPE_SET.has(item.scope) ? item.scope : EXAM_VOLUME_SCOPE.FULL
    let customPages = null
    if (scope === EXAM_VOLUME_SCOPE.CUSTOM) {
      const max = VOLUME_BY_ID[volumeId].pages
      const n = Math.floor(Number(item.customPages) || 0)
      customPages = Math.min(max, Math.max(1, n))
    }
    out.push({ volumeId, scope, customPages })
  }
  return out
}

/** سطر عرض واحد (عربي) */
export function formatExamVolumeLineAr(spec) {
  if (!spec?.volumeId) return ''
  const v = VOLUME_BY_ID[spec.volumeId]
  if (!v) return ''
  const pages = resolvedPagesForExamVolume(spec.volumeId, spec.scope, spec.customPages)
  const scopeAr = examVolumeScopeLabelAr(spec.scope)
  return `${v.label}: نحو ${pages} صفحة (${scopeAr} من ${v.pages})`
}

export function formatExamVolumeSpecsSummaryLines(specs) {
  const n = normalizeExamVolumeSpecs(specs)
  return n.map(formatExamVolumeLineAr).filter(Boolean)
}

/** مجموع الصفحات المحسوبة لكل مجلد في الاختبار (بعد التطبيع). */
export function totalResolvedPagesFromExamVolumeSpecs(raw) {
  const n = normalizeExamVolumeSpecs(raw)
  let sum = 0
  for (const s of n) {
    sum += resolvedPagesForExamVolume(s.volumeId, s.scope, s.customPages)
  }
  return sum
}

export function examVolumeSpecsSearchHay(specs) {
  const n = normalizeExamVolumeSpecs(specs)
  return n
    .map((s) => {
      const v = VOLUME_BY_ID[s.volumeId]
      return `${v?.label || ''} ${v?.id || ''} ${examVolumeScopeLabelAr(s.scope)}`.toLowerCase()
    })
    .join(' ')
}

export { VOLUMES }
