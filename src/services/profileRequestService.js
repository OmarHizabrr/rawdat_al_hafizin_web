import { collectionGroup, getFirestore, onSnapshot, query } from 'firebase/firestore'
import { app } from '../firebase.js'
import { firestoreApi } from './firestoreApi.js'

export const PROFILE_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

function normalizeProfileRequestRow(userId, raw = {}) {
  return {
    userId,
    fullName: String(raw.fullName || '').trim(),
    phone: String(raw.phone || '').trim(),
    nationality: String(raw.nationality || '').trim(),
    permanentResidence: String(raw.permanentResidence || '').trim(),
    city: String(raw.city || '').trim(),
    age: Math.max(1, Number(raw.age) || 0),
    email: String(raw.email || '').trim(),
    gender: raw.gender === 'female' ? 'female' : 'male',
    educationLevel: String(raw.educationLevel || '').trim(),
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
      nationality: String(payload?.nationality || '').trim(),
      permanentResidence: String(payload?.permanentResidence || '').trim(),
      city: String(payload?.city || '').trim(),
      age: Math.max(1, Number(payload?.age) || 1),
      email: String(user?.email || payload?.email || '').trim(),
      gender: payload?.gender === 'female' ? 'female' : 'male',
      educationLevel: String(payload?.educationLevel || '').trim(),
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

export async function reviewProfileRequest(actorUser, targetUserId, nextStatus, statusMessage = '') {
  if (!actorUser?.uid || !targetUserId) return
  if (nextStatus !== PROFILE_REQUEST_STATUS.APPROVED && nextStatus !== PROFILE_REQUEST_STATUS.REJECTED) return
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
}
