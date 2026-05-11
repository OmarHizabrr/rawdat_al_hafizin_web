import { collectionGroup, getFirestore, onSnapshot, query } from 'firebase/firestore'
import { app } from '../firebase.js'
import { adminApplyRoleBasedPermissionProfile } from './adminUsersService.js'
import { firestoreApi } from './firestoreApi.js'
import { upsertUserNotification } from './userNotificationsService.js'

export const PROFILE_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

function normalizeProfileRequestRow(userId, raw = {}) {
  const normalizedAge = Number(raw.age) || 0
  return {
    userId,
    fullName: String(raw.fullName || '').trim(),
    phone: String(raw.phone || '').trim(),
    phoneCountry: String(raw.phoneCountry || '').trim(),
    phoneDialCode: String(raw.phoneDialCode || '').trim(),
    nationality: String(raw.nationality || '').trim(),
    permanentResidence: String(raw.permanentResidence || '').trim(),
    city: String(raw.city || '').trim(),
    age: Math.max(7, Math.min(150, normalizedAge)),
    email: String(raw.email || '').trim(),
    gender: raw.gender === 'female' ? 'female' : 'male',
    educationLevel: String(raw.educationLevel || '').trim(),
    occupation: String(raw.occupation || '').trim(),
    quranMemorizedJuz: Math.max(0, Math.min(30, Number(raw.quranMemorizedJuz) || 0)),
    status:
      raw.status === PROFILE_REQUEST_STATUS.APPROVED || raw.status === PROFILE_REQUEST_STATUS.REJECTED
        ? raw.status
        : PROFILE_REQUEST_STATUS.PENDING,
    statusMessage: String(raw.statusMessage || '').trim(),
    submittedAt: raw.submittedAt || null,
    reviewedAt: raw.reviewedAt || null,
    reviewerUid: String(raw.reviewerUid || '').trim(),
    reviewerName: String(raw.reviewerName || '').trim(),
    photoURL: String(raw.photoURL || raw.createdByImageUrl || '').trim(),
    displayName: String(raw.displayName || raw.createdByName || '').trim(),
  }
}

export async function loadMyProfileRequest(userId) {
  if (!userId) return null
  const ref = firestoreApi.getUserProfileRequestDoc(userId)
  const d = await firestoreApi.getData(ref)
  return d ? normalizeProfileRequestRow(userId, d) : null
}

export async function upsertMyProfileRequest(user, payload) {
  const userId = user?.uid
  if (!userId) return
  const genderNorm = payload?.gender === 'female' ? 'female' : payload?.gender === 'male' ? 'male' : ''
  if (!genderNorm) {
    const e = new Error('GENDER_REQUIRED')
    e.code = 'GENDER_REQUIRED'
    throw e
  }
  const juz = Math.max(0, Math.min(30, Number(payload?.quranMemorizedJuz) || 0))
  if (juz < 30) {
    const e = new Error('QURAN_MEMORIZATION_REQUIREMENT_NOT_MET')
    e.code = 'QURAN_MEMORIZATION_REQUIREMENT_NOT_MET'
    throw e
  }

  const ref = firestoreApi.getUserProfileRequestDoc(userId)

  await firestoreApi.setData({
    docRef: ref,
    data: {
      userId,
      fullName: String(payload?.fullName || '').trim(),
      phone: String(payload?.phone || '').trim(),
      phoneCountry: String(payload?.phoneCountry || '').trim(),
      phoneDialCode: String(payload?.phoneDialCode || '').trim(),
      nationality: String(payload?.nationality || '').trim(),
      permanentResidence: String(payload?.permanentResidence || '').trim(),
      city: String(payload?.city || '').trim(),
      age: Math.max(7, Math.min(150, Number(payload?.age) || 7)),
      email: String(user?.email || payload?.email || '').trim(),
      gender: genderNorm,
      educationLevel: String(payload?.educationLevel || '').trim(),
      occupation: String(payload?.occupation || '').trim(),
      quranMemorizedJuz: juz,
      photoURL: String(user?.photoURL || '').trim(),
      displayName: String(user?.displayName || '').trim(),
      status: PROFILE_REQUEST_STATUS.PENDING,
      statusMessage: '',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewerUid: '',
      reviewerName: '',
    },
    merge: true,
    userData: user || {},
  })

  await firestoreApi.updateData({
    docRef: firestoreApi.getUserDoc(userId),
    data: { gender: genderNorm },
    userData: user || {},
  })
}

export async function adminUpdateProfileRequestFields(actorUser, targetUserId, payload = {}) {
  if (!actorUser?.uid || !targetUserId) return
  const nextGender = payload?.gender === 'female' ? 'female' : payload?.gender === 'male' ? 'male' : ''
  const data = {
    fullName: String(payload?.fullName || '').trim(),
    phone: String(payload?.phone || '').trim(),
    phoneCountry: String(payload?.phoneCountry || '').trim(),
    phoneDialCode: String(payload?.phoneDialCode || '').trim(),
    nationality: String(payload?.nationality || '').trim(),
    permanentResidence: String(payload?.permanentResidence || '').trim(),
    city: String(payload?.city || '').trim(),
    age: Math.max(7, Math.min(150, Number(payload?.age) || 7)),
    gender: nextGender || null,
    educationLevel: String(payload?.educationLevel || '').trim(),
    occupation: String(payload?.occupation || '').trim(),
    quranMemorizedJuz: Math.max(0, Math.min(30, Number(payload?.quranMemorizedJuz) || 0)),
    reviewedAt: new Date().toISOString(),
    reviewerUid: actorUser.uid,
    reviewerName: String(actorUser.displayName || actorUser.email || '').trim(),
  }
  await firestoreApi.updateData({
    docRef: firestoreApi.getUserProfileRequestDoc(targetUserId),
    data,
    userData: actorUser,
  })
  if (nextGender) {
    await firestoreApi.updateData({
      docRef: firestoreApi.getUserDoc(targetUserId),
      data: { gender: nextGender },
      userData: actorUser,
    })
  }
}

export function subscribeMyProfileRequest(userId, onNext, onError) {
  if (!userId) return () => {}
  const ref = firestoreApi.getUserProfileRequestDoc(userId)
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onNext(null)
        return
      }
      onNext(normalizeProfileRequestRow(userId, snap.data()))
    },
    onError,
  )
}

export function subscribeAllProfileRequests(onNext, onError) {
  const q = query(collectionGroup(getFirestore(app), 'MyProfile'))
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((docSnap) => {
        const p = docSnap.ref.path.split('/')
        const userId = p.length >= 2 ? p[1] : docSnap.id
        return normalizeProfileRequestRow(userId, docSnap.data() || {})
      })
      rows.sort((a, b) => {
        const ta = Date.parse(String(a.submittedAt || '')) || 0
        const tb = Date.parse(String(b.submittedAt || '')) || 0
        return tb - ta
      })
      onNext(rows)
    },
    onError,
  )
}

async function notifyApplicantOfReview(actorUser, targetUserId, nextStatus, statusMessage = '') {
  const notificationId = `application-review-${targetUserId}-${Date.now()}`
  const reviewerLabel = String(actorUser?.displayName || actorUser?.email || 'المشرف').trim()
  if (nextStatus === PROFILE_REQUEST_STATUS.APPROVED) {
    await upsertUserNotification({
      userId: targetUserId,
      notificationId,
      title: 'تم قبول طلب الالتحاق',
      body: `تم قبول طلبك بنجاح. يمكنك الآن استخدام المنصة وفق صلاحيات حسابك.\n\nمراجعة: ${reviewerLabel}`,
      notificationType: 'application_approved',
      userData: actorUser || {},
    })
    return
  }
  const note = String(statusMessage || '').trim()
  await upsertUserNotification({
    userId: targetUserId,
    notificationId,
    title: 'تم رفض طلب الالتحاق — يمكنك التعديل وإعادة التقديم',
    body: note
      ? `لم يُعتمد طلبك في هذه المرحلة.\n\nملاحظة المشرف:\n${note}\n\nيرجى مراجعة البيانات وتعديل ما يلزم ثم إعادة إرسال طلب الالتحاق من صفحة الطلب عند الجاهزية.`
      : 'لم يُعتمد طلبك في هذه المرحلة. راجع البيانات وأعد التقديم عند الجاهزية.',
    notificationType: 'application_rejected',
    userData: actorUser || {},
  })
}

async function queueApplicantReviewSms(
  actorUser,
  { targetUserId, applicantPhone, nextStatus, statusMessage = '', smsMessage = '' },
) {
  const to = String(applicantPhone || '').trim()
  if (!to) return
  const reviewerLabel = String(actorUser?.displayName || actorUser?.email || 'المشرف').trim()
  const note = String(statusMessage || '').trim()
  const custom = String(smsMessage || '').trim()
  const isApproved = nextStatus === PROFILE_REQUEST_STATUS.APPROVED
  const body = custom || (isApproved
    ? `تم قبول طلب الالتحاق الخاص بك. يمكنك الآن استخدام المنصة. (مراجعة: ${reviewerLabel})`
    : note
      ? `تم رفض طلب الالتحاق حالياً. ملاحظة المشرف: ${note}. يمكنك تعديل البيانات وإعادة التقديم.`
      : 'تم رفض طلب الالتحاق حالياً. يمكنك تعديل البيانات وإعادة التقديم.')

  // قائمة انتظار SMS لتكامل مزود الرسائل النصية (Cloud Function/مزود خارجي).
  const smsId = firestoreApi.getNewId('sms')
  await firestoreApi.setData({
    docRef: firestoreApi.getDocument('sms', smsId),
    data: {
      to,
      userId: targetUserId,
      kind: 'application_review_result',
      body,
      createdAt: new Date().toISOString(),
    },
    merge: true,
    userData: actorUser || {},
  })
}

export async function reviewProfileRequest(
  actorUser,
  targetUserId,
  nextStatus,
  statusMessage = '',
  deliveryOptions = {},
) {
  if (!actorUser?.uid || !targetUserId) return
  if (nextStatus !== PROFILE_REQUEST_STATUS.APPROVED && nextStatus !== PROFILE_REQUEST_STATUS.REJECTED) return
  const sendSms = Boolean(deliveryOptions?.sendSms)
  const smsMessage = String(deliveryOptions?.smsMessage || '').trim()
  const reqRow = await loadMyProfileRequest(targetUserId)
  const ref = firestoreApi.getUserProfileRequestDoc(targetUserId)
  await firestoreApi.updateData({
    docRef: ref,
    data: {
      status: nextStatus,
      statusMessage: String(statusMessage || '').trim(),
      reviewedAt: new Date().toISOString(),
      reviewerUid: actorUser.uid,
      reviewerName: String(actorUser.displayName || actorUser.email || '').trim(),
    },
    userData: actorUser,
  })
  if (nextStatus === PROFILE_REQUEST_STATUS.APPROVED) {
    await adminApplyRoleBasedPermissionProfile(actorUser, targetUserId)
    if (reqRow?.gender === 'male' || reqRow?.gender === 'female') {
      await firestoreApi.updateData({
        docRef: firestoreApi.getUserDoc(targetUserId),
        data: { gender: reqRow.gender },
        userData: actorUser,
      })
    }
  }
  try {
    await notifyApplicantOfReview(actorUser, targetUserId, nextStatus, statusMessage)
    // البريد يُنشأ من Cloud Function enqueueApplicationReviewMail (صلاحيات المشرف → مجموعة mail لتوسعة Trigger Email).
    if (sendSms) {
      await queueApplicantReviewSms(actorUser, {
        targetUserId,
        applicantPhone: reqRow?.phone,
        nextStatus,
        statusMessage,
        smsMessage,
      })
    }
  } catch (e) {
    /* لا نُبطل القرار إذا تعذّر إنشاء الإشعار أو البريد (صلاحيات القواعد/الامتداد إلخ) */
    console.warn('[profileRequest] notifyApplicantOfReview/sms failed', e)
  }
}

/** حذف سجل طلب الالتحاق (مستند المستخدم) — يتطلب صلاحيات قواعد المطابقة لمن يدير النظام. */
export async function deleteProfileRequest(actorUser, targetUserId) {
  if (!actorUser?.uid || !targetUserId) return
  const ref = firestoreApi.getUserProfileRequestDoc(targetUserId)
  await firestoreApi.deleteData(ref)
}
