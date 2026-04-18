import { firestoreApi } from './firestoreApi.js'

function mapProfileDocs(docs) {
  return docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const na = (a.name || a.id || '').toString()
      const nb = (b.name || b.id || '').toString()
      return na.localeCompare(nb, 'ar')
    })
}

export function subscribePermissionProfiles(onNext, onError) {
  const col = firestoreApi.getPermissionProfilesCollection()
  return firestoreApi.subscribeSnapshot(
    col,
    (snap) => onNext(mapProfileDocs(snap.docs)),
    onError,
  )
}

function normalizeRoleBinding(v) {
  if (v === 'student' || v === 'teacher') return v
  return null
}

export async function savePermissionProfile(actorUser, profileId, payload) {
  if (!actorUser?.uid || !profileId) return
  const docRef = firestoreApi.getPermissionProfileDoc(profileId)
  await firestoreApi.setData({
    docRef,
    data: {
      name: payload.name || '',
      pages: payload.pages && typeof payload.pages === 'object' ? payload.pages : {},
      roleBinding: normalizeRoleBinding(payload.roleBinding),
    },
    merge: true,
    userData: actorUser,
  })
}

/**
 * أول نوع صلاحيات مربوط بالدور (طالب/معلم) — حسب الاسم عربياً إن وُجد أكثر من واحد.
 * يُستخدم عند تغيير حقل role في users.
 */
export async function getDefaultPermissionProfileIdForPlatformRole(role) {
  const r = normalizeRoleBinding(role)
  if (!r) return null
  const col = firestoreApi.getPermissionProfilesCollection()
  const docs = await firestoreApi.getDocuments(col, { whereField: 'roleBinding', isEqualTo: r })
  if (!docs.length) return null
  const rows = docs.map((d) => ({
    id: d.id,
    name: (d.data()?.name || '').toString(),
  }))
  rows.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  return rows[0].id
}

export async function deletePermissionProfile(actorUser, profileId) {
  if (!actorUser?.uid || !profileId) return
  await firestoreApi.deleteData(firestoreApi.getPermissionProfileDoc(profileId))
}
