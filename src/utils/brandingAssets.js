/** يسمح بروابط http(s) بلا مسافات، أو مساراً نسبياً يبدأ بـ / (بدون // لتفادي بروتوكول نسبي) */
export function sanitizeImageUrl(raw) {
  const s = String(raw ?? '').trim()
  if (!s || s.length > 2000) return ''
  if (/^https?:\/\//i.test(s) && !/\s/.test(s)) return s
  if (s.startsWith('/') && !s.startsWith('//')) return s
  return ''
}

/** لون CSS آمن للحقن في style */
export function sanitizeCssColor(raw) {
  const s = String(raw ?? '').trim()
  if (!s || s.length > 200) return ''
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s
  if (/^rgba?\(/i.test(s) && /\)$/.test(s)) return s
  if (/^hsla?\(/i.test(s) && /\)$/.test(s)) return s
  if (/^color-mix\(/i.test(s) && /\)$/.test(s)) return s
  return ''
}
