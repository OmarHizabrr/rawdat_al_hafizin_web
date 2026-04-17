import { firestoreApi } from './firestoreApi.js'

function toAuthUserPayload(u) {
  return {
    uid: u.uid,
    email: u.email || '',
    displayName: u.displayName || '',
    photoURL: u.photoURL || '',
    providerId: u.providerData?.[0]?.providerId || 'google.com',
    lastSignInTime: u.metadata?.lastSignInTime || '',
  }
}

/**
 * يضمن وجود مستند المستخدم ثم يحدّث الحقول الأساسية.
 * يعيد كائن مستخدم موحّد (دمج بين auth + firestore).
 */
export async function ensureUserProfile(firebaseUser) {
  if (!firebaseUser?.uid) return null

  const docRef = firestoreApi.getUserDoc(firebaseUser.uid)
  const existing = await firestoreApi.getData(docRef)
  const authPayload = toAuthUserPayload(firebaseUser)

  if (!existing) {
    await firestoreApi.setData({
      docRef,
      data: {
        ...authPayload,
        role: 'user',
        isActive: true,
      },
      merge: true,
      userData: firebaseUser,
    })
    return authPayload
  }

  await firestoreApi.updateData({
    docRef,
    data: authPayload,
    userData: firebaseUser,
  })

  return { ...existing, ...authPayload }
}
