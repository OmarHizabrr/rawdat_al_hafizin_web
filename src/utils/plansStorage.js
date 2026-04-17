import { query, orderBy } from 'firebase/firestore'
import { firestoreApi } from '../services/firestoreApi.js'

function plansCollection(userId) {
  return firestoreApi.getUserPlansCollection(userId)
}

function planDoc(userId, planId) {
  return firestoreApi.getUserPlanDoc(userId, planId)
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
    .sort(
      (a, b) =>
        timestampMs(b.updatedAt) - timestampMs(a.updatedAt) ||
        timestampMs(b.createdAt) - timestampMs(a.createdAt),
    )
}

export async function loadPlans(userId) {
  if (!userId) return []
  const docs = await firestoreApi.getDocuments(plansCollection(userId))
  return mapDocs(docs)
}

export function subscribePlans(userId, onNext) {
  if (!userId) return () => {}
  const q = query(plansCollection(userId), orderBy('updatedAt', 'desc'))
  return firestoreApi.subscribeSnapshot(q, (snapshot) => {
    onNext(mapDocs(snapshot.docs))
  })
}

export async function savePlans(userId, plans, userData = {}) {
  if (!userId) return
  const col = plansCollection(userId)
  const existingDocs = await firestoreApi.getDocuments(col)
  const existingIds = new Set(existingDocs.map((d) => d.id))
  const nextIds = new Set(plans.map((p) => p.id).filter(Boolean))

  for (const plan of plans) {
    if (!plan?.id) continue
    const ref = planDoc(userId, plan.id)
    const payload = {
      ...plan,
      updatedAt: new Date().toISOString(),
    }
    if (existingIds.has(plan.id)) {
      await firestoreApi.updateData({ docRef: ref, data: payload, userData })
    } else {
      await firestoreApi.setData({ docRef: ref, data: payload, merge: true, userData })
    }
  }

  for (const d of existingDocs) {
    if (!nextIds.has(d.id)) {
      await firestoreApi.deleteData(d.ref)
    }
  }
}
