import { isAdmin, normalizeRole } from '../config/roles.js'
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
        /** أول تسجيل: صلاحيات أولية (البداية + الإعدادات) إلى أن يُسنَد له نوع أو يُزال الوضع */
        starterAccess: true,
      },
      merge: true,
      userData: firebaseUser,
    })
    return { ...authPayload, role: 'student', isActive: true, starterAccess: true }
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

/**
 * الخطة المعروضة في الصفحة الرئيسية (معرّف مستند خطة).
 * للمشرف: يمكن تمرير `options.targetUid` لتحديث افتراضي مستخدم آخر.
 */
export async function setUserDefaultPlanId(firebaseUser, planId, options = {}) {
  if (!firebaseUser?.uid) return
  const requested = typeof options.targetUid === 'string' ? options.targetUid.trim() : ''
  const targetUid =
    requested && isAdmin(firebaseUser) && requested !== firebaseUser.uid ? requested : firebaseUser.uid
  const docRef = firestoreApi.getUserDoc(targetUid)
  await firestoreApi.updateData({
    docRef,
    data: { defaultPlanId: planId || null },
    userData: firebaseUser,
  })
}
