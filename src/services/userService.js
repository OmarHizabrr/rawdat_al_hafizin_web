import { isAdmin, normalizeRole } from '../config/roles.js'
import { updateFirebaseAuthProfile } from './authService.js'
import { uploadUserProfileAvatar } from './profilePhotoStorage.js'
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

  const syncPatch = {
    uid: authPayload.uid,
    email: authPayload.email,
    providerId: authPayload.providerId,
    lastSignInTime: authPayload.lastSignInTime,
  }
  if (existing.useCustomDisplay !== true) {
    syncPatch.displayName = authPayload.displayName
    syncPatch.photoURL = authPayload.photoURL
  }

  await firestoreApi.updateData({
    docRef,
    data: syncPatch,
    userData: firebaseUser,
  })

  const merged = { ...existing, ...syncPatch }
  merged.role = normalizeRole(merged.role)
  if (merged.isActive === undefined) merged.isActive = true
  return merged
}

/** المستخدم الحالي: الاسم فقط (نص) في Auth + Firestore */
export async function updateMyDisplayName(firebaseUser, displayName) {
  if (!firebaseUser?.uid) return
  const name = typeof displayName === 'string' ? displayName.trim() : ''
  if (!name) {
    throw new Error('DISPLAY_NAME_REQUIRED')
  }
  const photo = firebaseUser.photoURL || ''
  await updateFirebaseAuthProfile(firebaseUser, { displayName: name, photoURL: photo })
  await firestoreApi.updateData({
    docRef: firestoreApi.getUserDoc(firebaseUser.uid),
    data: { displayName: name, useCustomDisplay: true },
    userData: firebaseUser,
  })
}

/** المستخدم الحالي: رفع ملف صورة إلى Storage ثم تحديث Auth + Firestore */
export async function updateMyProfilePhotoFromFile(firebaseUser, file) {
  if (!firebaseUser?.uid) return
  const url = await uploadUserProfileAvatar(firebaseUser.uid, file)
  const name = firebaseUser.displayName || ''
  await updateFirebaseAuthProfile(firebaseUser, { displayName: name, photoURL: url })
  await firestoreApi.updateData({
    docRef: firestoreApi.getUserDoc(firebaseUser.uid),
    data: { photoURL: url, useCustomDisplay: true },
    userData: firebaseUser,
  })
}

/** إزالة صورة العرض من Auth + Firestore (لا يحذف ملفات Storage القديمة) */
export async function clearMyProfilePhoto(firebaseUser) {
  if (!firebaseUser?.uid) return
  const name = firebaseUser.displayName || ''
  await updateFirebaseAuthProfile(firebaseUser, { displayName: name, photoURL: '' })
  await firestoreApi.updateData({
    docRef: firestoreApi.getUserDoc(firebaseUser.uid),
    data: { photoURL: '', useCustomDisplay: true },
    userData: firebaseUser,
  })
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
