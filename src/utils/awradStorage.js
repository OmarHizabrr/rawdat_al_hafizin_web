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

export async function addWird(userId, wird, userData = {}, options = {}) {
  if (!userId) return null
  const id = firestoreApi.getNewId('awrad')
  const ref = wirdDoc(userId, id)
  const nowIso = new Date().toISOString()
  const { recordedAt: clientRecordedAt, ...rest } = wird
  const trust = options.allowCustomRecordedAt === true
  const recordedAt =
    trust &&
    typeof clientRecordedAt === 'string' &&
    Number.isFinite(Date.parse(clientRecordedAt))
      ? clientRecordedAt
      : nowIso
  await firestoreApi.setData({
    docRef: ref,
    data: { id, ...rest, recordedAt, updatedAt: nowIso },
    merge: true,
    userData,
  })
  return id
}

export async function updateWird(userId, wirdId, data, userData = {}, options = {}) {
  if (!userId || !wirdId) return
  const ref = wirdDoc(userId, wirdId)
  const patch = { ...data, updatedAt: new Date().toISOString() }
  if (options.allowCustomRecordedAt === true) {
    if (
      !('recordedAt' in data) ||
      data.recordedAt == null ||
      !Number.isFinite(Date.parse(String(data.recordedAt)))
    ) {
      delete patch.recordedAt
    }
  } else {
    delete patch.recordedAt
  }
  await firestoreApi.updateData({
    docRef: ref,
    data: patch,
    userData,
  })
}

export async function deleteWird(userId, wirdId) {
  if (!userId || !wirdId) return
  await firestoreApi.deleteData(wirdDoc(userId, wirdId))
}
