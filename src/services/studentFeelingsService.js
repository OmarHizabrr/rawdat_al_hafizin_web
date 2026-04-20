import { firestoreApi } from './firestoreApi.js'

export const STUDENT_FEELING_KIND = 'student_feeling'

export const STUDENT_FEELING_MOODS = [
  { id: 'happy', label: 'سعيد', bird: '🐦' },
  { id: 'calm', label: 'مطمئن', bird: '🕊️' },
  { id: 'excited', label: 'متحمس', bird: '🐤' },
  { id: 'grateful', label: 'ممتن', bird: '🦜' },
]

function clampRating(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(1, Math.min(5, Math.round(n)))
}

function normalizeFeelingSnapshot(ownerUid, snap) {
  const data = snap?.data?.() || {}
  if (data.kind !== STUDENT_FEELING_KIND) return null
  const mood = STUDENT_FEELING_MOODS.find((m) => m.id === data.mood)?.id || 'happy'
  return {
    id: snap.id,
    ownerUid: data.ownerUid || ownerUid || '',
    text: (data.text || '').toString(),
    rating: clampRating(data.rating),
    mood,
    bird: STUDENT_FEELING_MOODS.find((m) => m.id === mood)?.bird || '🐦',
    moodLabel: STUDENT_FEELING_MOODS.find((m) => m.id === mood)?.label || 'سعيد',
    displayName: (data.displayName || '').toString(),
    photoURL: (data.photoURL || '').toString(),
    createdAt: data.createdAt || data.createTimes || null,
    updatedAt: data.updatedAt || data.updatedTimes || null,
  }
}

function toMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const n = Date.parse(String(v))
  return Number.isFinite(n) ? n : 0
}

function sortRecent(a, b) {
  return toMs(b.updatedAt) - toMs(a.updatedAt) || toMs(b.createdAt) - toMs(a.createdAt)
}

function userFeelingsCollection(userId) {
  return firestoreApi.getUserHalakatCollection(userId)
}

function userFeelingDoc(userId, feelingId) {
  return firestoreApi.getUserHalakatDoc(userId, feelingId)
}

export async function loadStudentFeelingsForUser(userId) {
  if (!userId) return []
  const docs = await firestoreApi.getDocuments(userFeelingsCollection(userId))
  return docs.map((d) => normalizeFeelingSnapshot(userId, d)).filter(Boolean).sort(sortRecent)
}

export function subscribeStudentFeelingsForUser(userId, onNext, onError) {
  if (!userId) return () => {}
  return firestoreApi.subscribeSnapshot(
    userFeelingsCollection(userId),
    (snapshot) => {
      const rows = snapshot.docs.map((d) => normalizeFeelingSnapshot(userId, d)).filter(Boolean).sort(sortRecent)
      onNext(rows)
    },
    onError,
  )
}

export async function loadRecentStudentFeelings(limitCount = 12) {
  const docs = await firestoreApi.getCollectionGroupDocuments('Myhalakat')
  const rows = docs.map((d) => normalizeFeelingSnapshot('', d)).filter(Boolean).sort(sortRecent)
  return rows.slice(0, Math.max(1, limitCount))
}

export async function createStudentFeeling({ ownerUid, text, rating, mood, userData = {}, profile = {} }) {
  if (!ownerUid) throw new Error('FEELING_OWNER_REQUIRED')
  const value = (text || '').toString().trim()
  if (!value) throw new Error('FEELING_TEXT_REQUIRED')
  const feelingId = `feeling_${firestoreApi.getNewId('Myhalakat')}`
  const safeMood = STUDENT_FEELING_MOODS.find((m) => m.id === mood)?.id || 'happy'
  const ref = userFeelingDoc(ownerUid, feelingId)
  await firestoreApi.setData({
    docRef: ref,
    data: {
      kind: STUDENT_FEELING_KIND,
      ownerUid,
      text: value,
      rating: clampRating(rating),
      mood: safeMood,
      displayName: (profile.displayName || userData.displayName || '').toString(),
      photoURL: (profile.photoURL || userData.photoURL || '').toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    merge: true,
    userData,
  })
  return feelingId
}

async function assertCanManageFeeling(actorUser, ownerUid, feelingId, isAdmin) {
  if (!actorUser?.uid || !ownerUid || !feelingId) throw new Error('FEELING_INVALID_ARGS')
  if (!isAdmin && actorUser.uid !== ownerUid) throw new Error('FEELING_FORBIDDEN')
  const ref = userFeelingDoc(ownerUid, feelingId)
  const current = await firestoreApi.getData(ref)
  if (!current || current.kind !== STUDENT_FEELING_KIND) throw new Error('FEELING_NOT_FOUND')
  return ref
}

export async function updateStudentFeeling({
  actorUser,
  ownerUid,
  feelingId,
  text,
  rating,
  mood,
  isAdmin = false,
  userData = {},
}) {
  const ref = await assertCanManageFeeling(actorUser, ownerUid, feelingId, isAdmin)
  const next = {}
  if (typeof text === 'string') {
    const value = text.trim()
    if (!value) throw new Error('FEELING_TEXT_REQUIRED')
    next.text = value
  }
  if (rating != null) next.rating = clampRating(rating)
  if (typeof mood === 'string') {
    next.mood = STUDENT_FEELING_MOODS.find((m) => m.id === mood)?.id || 'happy'
  }
  next.updatedAt = new Date().toISOString()
  await firestoreApi.updateData({ docRef: ref, data: next, userData })
}

export async function deleteStudentFeeling({ actorUser, ownerUid, feelingId, isAdmin = false }) {
  const ref = await assertCanManageFeeling(actorUser, ownerUid, feelingId, isAdmin)
  await firestoreApi.deleteData(ref)
}
