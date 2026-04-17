import { orderBy, query } from 'firebase/firestore'
import { firestoreApi } from '../services/firestoreApi.js'

function awradCollection(userId) {
  return firestoreApi.getUserAwradCollection(userId)
}

function wirdDoc(userId, wirdId) {
  return firestoreApi.getUserWirdDoc(userId, wirdId)
}

function timestampMs(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  const n = Date.parse(String(v))
  return Number.isFinite(n) ? n : 0
}

function mapDocs(docs) {
  return docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => timestampMs(b.recordedAt) - timestampMs(a.recordedAt))
}

export async function loadAwrad(userId) {
  if (!userId) return []
  const docs = await firestoreApi.getDocuments(awradCollection(userId))
  return mapDocs(docs)
}

export function subscribeAwrad(userId, onNext) {
  if (!userId) return () => {}
  const q = query(awradCollection(userId), orderBy('recordedAt', 'desc'))
  return firestoreApi.subscribeSnapshot(q, (snapshot) => {
    onNext(mapDocs(snapshot.docs))
  })
}

export async function addWird(userId, wird, userData = {}) {
  if (!userId) return null
  const id = firestoreApi.getNewId('awrad')
  const ref = wirdDoc(userId, id)
  const recordedAt = new Date().toISOString()
  await firestoreApi.setData({
    docRef: ref,
    data: { id, ...wird, recordedAt, updatedAt: recordedAt },
    merge: true,
    userData,
  })
  return id
}
