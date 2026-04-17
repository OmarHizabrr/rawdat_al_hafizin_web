import { normalizeRole } from '../config/roles.js'
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
        role: 'student',
        isActive: true,
      },
      merge: true,
      userData: firebaseUser,
    })
    return { ...authPayload, role: 'student', isActive: true }
  }

  await firestoreApi.updateData({
    docRef,
    data: authPayload,
    userData: firebaseUser,
  })

  const merged = { ...existing, ...authPayload }
  merged.role = normalizeRole(merged.role)
  if (merged.isActive === undefined) merged.isActive = true
  return merged
}

/** الخطة المعروضة في الصفحة الرئيسية (معرّف مستند خطة). */
export async function setUserDefaultPlanId(firebaseUser, planId) {
  if (!firebaseUser?.uid) return
  const docRef = firestoreApi.getUserDoc(firebaseUser.uid)
  await firestoreApi.updateData({
    docRef,
    data: { defaultPlanId: planId || null },
    userData: firebaseUser,
  })
}
