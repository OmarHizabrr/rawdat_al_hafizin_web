import { firestoreApi } from './firestoreApi.js'

function mapUserDocs(docs) {
  return docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .sort((a, b) => {
      const na = (a.displayName || a.email || a.uid || '').toString()
      const nb = (b.displayName || b.email || b.uid || '').toString()
      return na.localeCompare(nb, 'ar')
    })
}

/** اشتراك بجميع مستندات users (للوحة الإدارة) */
export function subscribeAllUsers(onNext, onError) {
  const col = firestoreApi.getUsersCollection()
  return firestoreApi.subscribeSnapshot(
    col,
    (snap) => onNext(mapUserDocs(snap.docs)),
    onError,
  )
}

export async function adminUpdateUserRole(actorUser, targetUid, role) {
  if (!targetUid || !actorUser?.uid) return
  const docRef = firestoreApi.getUserDoc(targetUid)
  await firestoreApi.updateData({
    docRef,
    data: { role },
    userData: actorUser,
  })
}

export async function adminSetUserActive(actorUser, targetUid, isActive) {
  if (!targetUid || !actorUser?.uid) return
  const docRef = firestoreApi.getUserDoc(targetUid)
  await firestoreApi.updateData({
    docRef,
    data: { isActive },
    userData: actorUser,
  })
}

/** حذف خطط وأوراد المستخدم ثم مستند users (لا يحذف حساب Google في Firebase Auth) */
export async function adminDeleteUserFirestore(actorUser, targetUid) {
  if (!targetUid || !actorUser?.uid) return
  if (targetUid === actorUser.uid) {
    throw new Error('SELF_DELETE')
  }

  const planCol = firestoreApi.getUserPlansCollection(targetUid)
  const planDocs = await firestoreApi.getDocuments(planCol)
  for (const d of planDocs) {
    await firestoreApi.deleteData(d.ref)
  }

  const awradCol = firestoreApi.getUserAwradCollection(targetUid)
  const awradDocs = await firestoreApi.getDocuments(awradCol)
  for (const d of awradDocs) {
    await firestoreApi.deleteData(d.ref)
  }

  try {
    await firestoreApi.clearUserMembershipMirrors(targetUid)
  } catch {
    /* قد لا توجد مرايا */
  }

  await firestoreApi.deleteData(firestoreApi.getUserDoc(targetUid))
}
