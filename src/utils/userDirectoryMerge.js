/**
 * دمج صفوف المستخدمين لمنتقي الأعضاء (خطط / حلقات / دورات).
 * لا يُستبعد أي دور — يضاف المستخدم الحالي وأعضاء المجموعة المعروضون
 * حتى يظهر مدير النظام وغيره إن وُجدت بياناتهم في المصادر الإضافية.
 *
 * @param {Array<Record<string, unknown>>} fromSnapshot من اشتراك users
 * @param {Array<Record<string, unknown>>} extras مستخدم حالي، أعضاء محمّلون، إلخ.
 */
export function mergeUserDirectoryRows(fromSnapshot = [], extras = []) {
  const byUid = new Map()
  for (const u of fromSnapshot) {
    const uid = u?.uid != null ? String(u.uid).trim() : ''
    if (!uid) continue
    byUid.set(uid, { ...u, uid })
  }
  for (const raw of extras) {
    const uid = raw?.uid != null ? String(raw.uid).trim() : raw?.userId != null ? String(raw.userId).trim() : ''
    if (!uid) continue
    const row = rowFromExtra(raw, uid)
    const prev = byUid.get(uid)
    if (!prev) byUid.set(uid, row)
    else
      byUid.set(uid, {
        ...prev,
        ...row,
        displayName: row.displayName || prev.displayName,
        email: row.email || prev.email,
        photoURL: row.photoURL || prev.photoURL,
      })
  }
  return [...byUid.values()].sort((a, b) => {
    const na = (a.displayName || a.email || a.uid || '').toString()
    const nb = (b.displayName || b.email || b.uid || '').toString()
    return na.localeCompare(nb, 'ar')
  })
}

function rowFromExtra(raw, uid) {
  const displayName =
    String(raw.displayName || raw.createdByName || '').trim() || String(raw.name || '').trim() || ''
  const email = String(raw.email || '').trim()
  const photoURL = String(raw.photoURL || raw.createdByImageUrl || '').trim()
  const role = raw.role !== undefined && raw.role !== null ? raw.role : undefined
  const out = { uid, displayName, email, photoURL }
  if (role !== undefined) out.role = role
  return out
}
