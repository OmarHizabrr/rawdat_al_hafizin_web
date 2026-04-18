import { normalizeRole } from '../config/roles.js'
import { firestoreApi } from './firestoreApi.js'
import { removePlanForUser } from '../utils/plansStorage.js'
import { getDefaultPermissionProfileIdForPlatformRole } from './permissionProfilesService.js'

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
  const nr = normalizeRole(role)

  let permissionProfileId = null
  if (nr === 'admin') {
    permissionProfileId = null
  } else if (nr === 'student' || nr === 'teacher') {
    permissionProfileId = await getDefaultPermissionProfileIdForPlatformRole(nr)
  }

  const data = { role: nr, permissionProfileId }
  if (nr === 'admin' || permissionProfileId) {
    data.starterAccess = false
  }

  await firestoreApi.updateData({
    docRef,
    data,
    userData: actorUser,
  })
}

/** ربط مستخدم بنوع صلاحيات (permission_profiles) أو إزالة الإسناد بقيمة فارغة */
export async function adminUpdateUserPermissionProfile(actorUser, targetUid, permissionProfileId) {
  if (!targetUid || !actorUser?.uid) return
  const docRef = firestoreApi.getUserDoc(targetUid)
  const v = typeof permissionProfileId === 'string' ? permissionProfileId.trim() : ''
  await firestoreApi.updateData({
    docRef,
    data: { permissionProfileId: v || null, starterAccess: false },
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

  const planMirrors = await firestoreApi.getDocuments(
    firestoreApi.getUserPlansCollection(targetUid),
  )
  for (const d of planMirrors) {
    await removePlanForUser(targetUid, d.id)
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
