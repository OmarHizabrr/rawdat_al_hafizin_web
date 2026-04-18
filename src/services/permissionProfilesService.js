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

export async function savePermissionProfile(actorUser, profileId, payload) {
  if (!actorUser?.uid || !profileId) return
  const docRef = firestoreApi.getPermissionProfileDoc(profileId)
  await firestoreApi.setData({
    docRef,
    data: {
      name: payload.name || '',
      pages: payload.pages && typeof payload.pages === 'object' ? payload.pages : {},
    },
    merge: true,
    userData: actorUser,
  })
}

export async function deletePermissionProfile(actorUser, profileId) {
  if (!actorUser?.uid || !profileId) return
  await firestoreApi.deleteData(firestoreApi.getPermissionProfileDoc(profileId))
}
