/** توليد رمز داخلي إنجليزي من عنوان عربي/مختلط (للأنواع والحقول الجديدة). */
export function slugFromAdminLabel(label, prefix = 'item') {
  const latin = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (latin.length >= 2) return latin.slice(0, 48)
  return `${prefix}_${Date.now().toString(36).slice(-8)}`
}
